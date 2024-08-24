import { client, xml } from '@xmpp/client';

// XMPP client instance
let xmpp;
// Boolean indicating whether the user is online
let isOnline = false;
// Currently logged-in user
let currentUser = null;
// Current presence status (default is 'Available')
let currentPresence = 'Available';
// Current presence status as a string ('online', 'away', etc.)
let currentPresenceStatus = 'online';
// Array to store message listeners
let messageListeners = [];
// Set to track processed contact invitations
let processedInvitations = new Set();
// Set to track processed group invitations
let processedGroupInvitations = new Set();
// Set to store the groups the user has joined
let currentGroups = new Set();

let reconnecting = false; // Indicates if a reconnection attempt is in progress

// Function to initialize and connect the XMPP client
function initializeXMPP(username, password) {
  return new Promise((resolve, reject) => {
    // If username or password is not provided, retrieve them from local storage
    if (!username || !password) {
      username = localStorage.getItem('username');
      password = localStorage.getItem('password');
    }
    // Store the username and password in local storage
    localStorage.setItem('username', username);
    localStorage.setItem('password', password);

    // If already online or reconnecting, resolve the promise and skip reconnection
    if (isOnline || reconnecting) {
      resolve();
      return;
    }
    reconnecting = true;
    // Initialize the XMPP client with the given credentials and server details
    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/",
      domain: "alumchat.lol",
      resource: "example",
      username: username,
      password: password,
    });

    // Event listener for connection errors
    xmpp.on("error", (err) => {
      console.error(err);
      reconnecting = false;
      reject(new Error('Login failed: ' + err.message));
    });

    // Event listener for when the client goes offline
    xmpp.on("offline", () => {
      console.log("offline");
      isOnline = false;
      reconnecting = false;
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        initializeXMPP(username, password).catch(console.error);
      }, 5000);
    });

    // Event listener for when the client successfully connects
    xmpp.on("online", async (address) => {
      console.log(`Connected as ${address.toString()}`);
      isOnline = true;
      currentUser = username;
      reconnecting = false;
      try {
        await sendPresence("chat");
        resolve(); // Resolve the promise when the connection is successful
      } catch (error) {
        console.error('Error al enviar presencia inicial:', error);
      }
    });

    // Event listener for incoming stanzas (XMPP messages)
    xmpp.on('stanza', (stanza) => {
      console.log('Stanza received:', stanza.toString());
    
      if (stanza.is('message') && stanza.attrs.type === 'chat') {
        const from = stanza.attrs.from;
        const body = stanza.getChildText('body');
    
        if (body && body.trim() !== '') { // Ensure the message body is not empty
          const message = {
            from,
            body,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          messageListeners.forEach(listener => listener(message));
        } else {
        console.error('Mensaje vacío recibido, ignorando:', stanza.toString());
        }
      }
    });
    // Start the XMPP client with a timeout of 60 seconds
    xmpp.start({timeout: 60000, }).catch((err) => {
      console.error('Failed to connect:', err);
      reject(new Error('Failed to connect: ' + err.message));
    });
  });
}

// Function to get the current logged-in user
export function getCurrentUser() {
  return currentUser;
}

// Function to log out the current user
export async function logout() {
  if (!isOnline) {
    throw new Error("No se puede hacer logout: no estás online.");
  }

  try {
    await xmpp.stop();
    isOnline = false;
    localStorage.removeItem('username');
    localStorage.removeItem('password');
    console.log('Logout exitoso.');
  } catch (error) {
    console.error('Error durante el logout:', error);
    throw error;
  }
}

// Function to delete the current user's account
export async function deleteUser() {
  return new Promise((resolve, reject) => {
    if (!currentUser || !xmpp) {
      reject(new Error("No hay usuario conectado o la conexión XMPP no está disponible."));
      return;
    }

    const iq = xml(
      'iq',
      { type: 'set' },
      xml('query', { xmlns: 'jabber:iq:register' }, xml('remove'))
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.attrs.type === 'result') {
        console.log('Cuenta eliminada exitosamente');
        localStorage.clear();  // Limpiar el localStorage
        resolve();
      } else if (stanza.is('iq') && stanza.attrs.type === 'error') {
        reject(new Error('Error al eliminar la cuenta.'));
      }
    });

    xmpp.send(iq).catch((err) => {
      console.error('Error al intentar eliminar la cuenta:', err);
      reject(err);
    });
  });
}

// Function to add a new contact
export async function addContact(contactJID, message, sharePresence) {
  if (!isOnline) {
    throw new Error("No se puede añadir contacto: no estás online.");
  }

  try {
    // Send a subscription request to the contact
    const presenceStanza = xml(
      'presence',
      { to: contactJID, type: 'subscribe' }
    );
    await xmpp.send(presenceStanza);

    // Share your presence with the contact
    if (sharePresence) {
      const sharePresenceStanza = xml(
        'presence',
        { to: contactJID }
      );
      await xmpp.send(sharePresenceStanza);
    }

    // Optionally send a message to the contact
    if (message) {
      await sendMessage(contactJID, message);
    }

    console.log(`Solicitud de suscripción enviada a ${contactJID}`);
  } catch (error) {
    console.error('Error al añadir contacto:', error);
    throw error;
  }
}

// Function to delete a contact
export async function deleteContact(contactJID) {
  if (!isOnline) {
    throw new Error("No se puede eliminar el contacto: no estás online.");
  }

  try {
    // Send an IQ request to remove the contact from the roster
    const iq = xml(
      'iq',
      { type: 'set', id: 'remove1' },
      xml('query', { xmlns: 'jabber:iq:roster' },
        xml('item', { jid: contactJID, subscription: 'remove' })
      )
    );

    return new Promise((resolve, reject) => {
      xmpp.on('stanza', (stanza) => {
        if (stanza.is('iq') && stanza.attrs.id === 'remove1') {
          if (stanza.attrs.type === 'result') {
            console.log(`Contacto ${contactJID} eliminado exitosamente.`);
            resolve();
          } else if (stanza.attrs.type === 'error') {
            console.error('Error al intentar eliminar el contacto:', stanza.getChildText('error'));
            reject(new Error('Failed to remove contact.'));
          }
        }
      });

      xmpp.send(iq).catch((err) => {
        console.error('Error al enviar la solicitud IQ:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error al eliminar el contacto:', error);
    throw error;
  }
}


// Function to remove a message listener
export function offMessage(listener) {
  messageListeners = messageListeners.filter(l => l !== listener);
}

// Function to add a message listener
export function onMessage(listener) {
  if (!messageListeners.includes(listener)) {
    messageListeners.push(listener);
  }
}

// Function to retrieve the user's contact list
export async function getContacts() {
  return new Promise((resolve, reject) => {
    const rosterIq = xml(
      'iq',
      { type: 'get', id: 'roster1' },
      xml('query', { xmlns: 'jabber:iq:roster' })
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.getChild('query')) {
        const items = stanza.getChild('query').getChildren('item');
        const contacts = items.map(item => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid,
          status: 'Available',
          imageUrl: `https://api.adorable.io/avatars/40/${item.attrs.jid}.png`
        }));
        resolve(contacts);
      }
    });

    xmpp.send(rosterIq).catch((err) => {
      console.error('Error al obtener los contactos:', err);
      reject(err);
    });
  });
}

// Function to listen for group invitations
export function listenForGroupInvitations(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from.split('/')[0]; // Extract the group's JID

        // Check if the invitation has already been processed or if you're already in the group
        if (!processedGroupInvitations.has(from) && !currentGroups.has(from)) {
          processedGroupInvitations.add(from); // Mark the invitation as processed
          callback({ groupName: from });
        }
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Function to accept a group invitation
export async function acceptGroupInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede aceptar la invitación: no estás online.");
  }

  try {
    await joinGroup(from);
    currentGroups.add(from); // Add the group to the currentGroups set
    console.log(`Te has unido al grupo ${from}`);
  } catch (error) {
    console.error('Error al aceptar la invitación:', error);
    throw error;
  }
}

// Function to reject a group invitation
export async function rejectGroupInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede rechazar la invitación: no estás online.");
  }

  try {
    const presenceStanza = xml('presence', { to: from, type: 'unsubscribed' });
    await xmpp.send(presenceStanza);
    processedGroupInvitations.delete(from); // Remove the processed invitation if rejected
    console.log(`Rechazada la invitación al grupo ${from}`);
  } catch (error) {
    console.error('Error al rechazar la invitación:', error);
    throw error;
  }
}

// Function to retrieve the list of available groups
export async function getGroups() {
  return new Promise((resolve, reject) => {
    const iq = xml(
      'iq',
      { type: 'get', to: 'conference.alumchat.lol', id: 'group1' },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' }) // Using disco#items to discover rooms
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.getChild('query')) {
        const items = stanza.getChild('query').getChildren('item');
        const groups = items.map(item => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid
        }))
        resolve(groups);
      }
    });

    xmpp.send(iq).catch((err) => {
      console.error('Error al obtener los grupos:', err);
      reject(err);
    });
  });
}

// Function to join a group
export async function joinGroup(groupJID) {
  if (!isOnline) {
    throw new Error("No se puede unir al grupo: no estás online.");
  }

  try {
    const presence = xml(
      'presence',
      { to: `${groupJID}/${currentUser}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );
    await xmpp.send(presence);
    currentGroups.add(groupJID); // Add the group to the currentGroups set
    console.log(`Unido al grupo ${groupJID}`);
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    throw error;
  }
}

// Function to join a group chat with a specific nickname
export async function joinGroupChat(roomJID, nickname) {
  if (!isOnline) {
    throw new Error("Cannot join group: not online.");
  }

  try {
    const presenceStanza = xml(
      'presence',
      { to: `${roomJID}/${nickname}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );
    await xmpp.send(presenceStanza);
    console.log(`Joined group: ${roomJID} as ${nickname}`);
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
}

// Function to listen for group messages
export function listenForGroupMessages(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from;
        const body = stanza.getChildText('body');

        if (body && body.trim() !== '') { // Ensure the message body is not empty
          callback({ from, body });
        } else {
          console.error('Mensaje de grupo vacío recibido, ignorando:', stanza.toString());
        }
      } else if (stanza.is('presence')) {
        console.log(`Presence stanza received: ${stanza.toString()}`);
      } else if (stanza.is('error')) {
        console.log(`Error stanza received: ${stanza.toString()}`);
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Function to send a message to a group
export async function sendGroupMessage(roomJID, message) {
  if (!isOnline) {
    throw new Error("No se puede enviar el mensaje: no estás online.");
  }

  try {
    const messageStanza = xml('message', { to: roomJID, type: 'groupchat' },
      xml('body', {}, message)
    );
    await xmpp.send(messageStanza);
    console.log(`Mensaje enviado al grupo ${roomJID}: ${message}`);
  } catch (error) {
    console.error('Error al enviar mensaje al grupo:', error);
    throw error;
  }
}

// Function to send a direct message to a user
export async function sendMessage(to, body) {
  if (!isOnline) {
    throw new Error("No se puede enviar mensaje: no estás online.");
  }

  // Ensure the message body is not empty
  if (!body || body.trim() === '') {
    console.error('No se puede enviar un mensaje vacío.');
    return;
  }

  try {
    const message = xml(
      "message",
      { type: "chat", to },
      xml("body", {}, body)
    );
    await xmpp.send(message);
    console.log(`Mensaje enviado a ${to}: ${body}`);
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
    throw error;
  }
}

// Function to listen for presence updates from contacts
export function listenForPresenceUpdates(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence')) {
        const from = stanza.attrs.from.split('/')[0];
        const type = stanza.attrs.type;
        const show = stanza.getChildText('show');
        const statusMessage = stanza.getChildText('status');

        let status = 'Available';

        if (type === 'unavailable') {
          status = 'Not Available';
        } else if (show === 'away') {
          status = 'Away';
        } else if (show === 'dnd') {
          status = 'Busy';
        } else if (show === 'xa') {
          status = 'Not Available';
        }

        currentPresenceStatus = status;
        callback({ from, status, statusMessage });
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Function to listen for presence updates specifically from contacts
export function listenForContactsPresenceUpdates(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence')) {
        const from = stanza.attrs.from.split('/')[0];
        const type = stanza.attrs.type;
        const show = stanza.getChildText('show');
        const statusMessage = stanza.getChildText('status');  // Get the status message

        let status = 'Available';

        if (type === 'unavailable') {
          status = 'Not Available';
        } else if (show === 'away') {
          status = 'Away';
        } else if (show === 'dnd') {
          status = 'Busy';
        } else if (show === 'xa') {
          status = 'Not Available';
        }
        currentPresenceStatus = status;
        callback({ from, status, statusMessage }); // Send the status message in the callback
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Function to get the current presence status
export function getCurrentPresenceStatus() {
  return currentPresenceStatus;
}

// Function to send a presence update
async function sendPresence(presence, message = '') {
  if (!isOnline) {
    console.error('La conexión aún no está establecida.');
    return;
  }

  let show = '';
  switch (presence) {
    case 'Available':
      show = '';
      break;
    case 'Away':
      show = 'away';
      break;
    case 'Not Available':
      show = 'xa';
      break;
    case 'Busy':
      show = 'dnd';
      break;
    default:
      show = '';
      break;
  }
  try {
    const presenceStanza = xml('presence', {}, show ? xml('show', {}, show) : null, message ? xml('status', {}, message) : null);
    await xmpp.send(presenceStanza);
    currentPresence = presence;
  } catch (error) {
    console.error('Error al enviar la presencia:', error);
  }
}

// Function to get the current presence
export function getPresence() {
  return currentPresence;
}

// Function to set and send a new presence status
export async function setPresence(presence, message) {
  await sendPresence(presence, message);
}

// Simple function to log in with a username and password
export function simpleXMPPLogin(username, password) {
  return new Promise((resolve, reject) => {
    if (!username || !password) {
      reject(new Error('Se requiere un nombre de usuario y una contraseña.'));
      return;
    }

    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/", // XMPP server address
      domain: "alumchat.lol", // XMPP server domain
      resource: "example", // Arbitrary resource name
      username: username, // Provided username
      password: password, // Provided password
    });

    // Event listener for successful connection
    xmpp.on("online", (address) => {
      console.log(`Conectado como ${address.toString()}`);
      isOnline = true; // Update the connection status
      resolve(); // Resolve the promise when the connection is successful
    });

   // Event listener for connection errors
    xmpp.on("error", (err) => {
      console.error('Error de conexión:', err);
      isOnline = false; // Update the connection status
      reject(new Error('Error al conectar: ' + err.message));
    });

    // Start the XMPP connection
    xmpp.start().catch((err) => {
      console.error('Falló la conexión:', err);
      isOnline = false; // Update the connection status
      reject(new Error('Falló la conexión: ' + err.message));
    });
  });
}

// Function to sign up a new user
export async function signUp(username, fullName, email, password) {
  return new Promise((resolve, reject) => {
    if (!isOnline) {
      return reject(new Error('No estás conectado al servidor XMPP.'));
    }
    if (!xmpp) {
      return reject(new Error('El cliente XMPP no está inicializado.'));
    }

    console.log("empezando registro");

    const iq = xml(
      'iq',
      { type: 'set', id: 'reg1' },
      xml('query', { xmlns: 'jabber:iq:register' }, [
        xml('username', {}, username),
        xml('password', {}, password),
        xml('email', {}, email),
        xml('name', {}, fullName),
      ])
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.attrs.type === 'result' && stanza.attrs.id === 'reg1') {
        console.log('Registro exitoso:', stanza.toString());
        resolve(); // Resolve the promise when registration is successful
      } else if (stanza.is('iq') && stanza.attrs.type === 'error' && stanza.attrs.id === 'reg1') {
        const error = stanza.getChild('error');
        const conflict = error && error.getChild('conflict', 'urn:ietf:params:xml:ns:xmpp-stanzas');
        if (conflict) {
          reject(new Error('La cuenta ya existe. Por favor, elige un nombre de usuario diferente.'));
        } else {
          reject(new Error('Ocurrió un error durante el registro. Inténtalo de nuevo.'));
        }
      }
    });

    xmpp.send(iq).catch((err) => {
      console.error('Error al enviar IQ:', err);
      reject(err);
    });
  });
}

// Function to listen for contact invitations
export function listenForContactInvitations(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        const from = stanza.attrs.from;

        // Check if this invitation has already been processed
        if (!processedInvitations.has(from)) {
          processedInvitations.add(from);  // Mark this invitation as processed
          callback({ from });
        }
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Function to accept a contact invitation
export async function acceptContactInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede aceptar la invitación: no estás online.");
  }

  try {
    const presenceStanza = xml('presence', { to: from, type: 'subscribed' });
    await xmpp.send(presenceStanza);
    console.log(`Aceptada la invitación de ${from}`);
  } catch (error) {
    console.error('Error al aceptar la invitación:', error);
    throw error;
  }
}

// Function to create Group
export async function createGroup(groupName, groupDescription) {
  if (!isOnline) {
    throw new Error("No se puede crear el grupo: no estás online.");
  }

  try {
    // Send initial presence for group
    const presence = xml(
      'presence',
      { to: `${groupName}@conference.alumchat.lol/${currentUser}` },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
        xml('item', { affiliation: 'owner', role: 'moderator' }),
        xml('status', { code: '201' })  // Indicates is new room
      )
    );

    await xmpp.send(presence);

    console.log(`Grupo ${groupName} creado exitosamente.`);

    const groups = await getGroups();
    console.log("Grupos disponibles:", groups);

    return groups;

  } catch (error) {
    console.error('Error al crear el grupo:', error);
    throw error;
  }
}

// Function to reject a contact invitation
export async function rejectContactInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede rechazar la invitación: no estás online.");
  }

  try {
    // First, send "unsubscribed" to prevent sharing your status
    const unsubscribedStanza = xml('presence', { to: from, type: 'unsubscribed' });
    await xmpp.send(unsubscribedStanza);

    // Then, send "unsubscribe" to explicitly reject the subscription request
    const unsubscribeStanza = xml('presence', { to: from, type: 'unsubscribe' });
    await xmpp.send(unsubscribeStanza);

    // Send IQ stanza to remove the contact from the roster
    const removeContactStanza = xml(
      'iq',
      { type: 'set', id: 'remove1' },
      xml('query', { xmlns: 'jabber:iq:roster' },
        xml('item', { jid: from, subscription: 'remove' })
      )
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.attrs.id === 'remove1') {
        console.log('Response from server:', stanza.toString());
        if (stanza.attrs.type === 'result') {
          console.log(`Contacto ${from} eliminado exitosamente de la lista de contactos.`);
        } else if (stanza.attrs.type === 'error') {
          console.error('Error al intentar eliminar el contacto:', stanza.getChildText('error'));
        }
      }
    });

    await xmpp.send(removeContactStanza);
  } catch (error) {
    console.error('Error al rechazar la invitación:', error);
    throw error;
  }
}

// Export the function to initialize the XMPP client
export { initializeXMPP };
