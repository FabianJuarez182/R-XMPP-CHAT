import { client, xml } from '@xmpp/client';
import debug from '@xmpp/debug';

let xmpp;
let isOnline = false;
let currentUser = null;
let currentPresence = 'Available';
let currentPresenceStatus = 'online';
let messageListeners = [];

let reconnecting = false;

function initializeXMPP(username, password) {
  return new Promise((resolve, reject) => {
    if (!username || !password) {
      username = localStorage.getItem('username');
      password = localStorage.getItem('password');
    }

    localStorage.setItem('username', username);
    localStorage.setItem('password', password);

    if (isOnline || reconnecting) {
      resolve(); // Si ya está online o reconectando, no hace falta volver a conectar
      return;
    }
    reconnecting = true;

    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/",
      domain: "alumchat.lol",
      resource: "example",
      username: username,
      password: password,
    });

    xmpp.on("error", (err) => {
      console.error(err);
      reconnecting = false;
      reject(new Error('Login failed: ' + err.message));
    });

    xmpp.on("offline", () => {
      console.log("offline");
      isOnline = false;
      reconnecting = false;
      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        initializeXMPP(username, password).catch(console.error);
      }, 5000);
    });

    xmpp.on("online", async (address) => {
      console.log(`Connected as ${address.toString()}`);
      isOnline = true;
      currentUser = username;
      reconnecting = false;
      try {
        await sendPresence("chat");
        resolve(); // Resuelve la promesa cuando la conexión es exitosa
      } catch (error) {
        console.error('Error al enviar presencia inicial:', error);
      }
    });

    xmpp.start().catch((err) => {
      console.error('Failed to connect:', err);
      reject(new Error('Failed to connect: ' + err.message));
    });
  });
}

export function getCurrentUser() {
  return currentUser;
}

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

// Función para eliminar la cuenta de usuario
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

// Función para añadir un nuevo contacto
export async function addContact(contactJID, message, sharePresence) {
  if (!isOnline) {
    throw new Error("No se puede añadir contacto: no estás online.");
  }

  try {
    // Enviar una solicitud de suscripción al contacto
    const presenceStanza = xml(
      'presence',
      { to: contactJID, type: 'subscribe' }
    );
    await xmpp.send(presenceStanza);

    // Compartir tu estado con el contacto
    if (sharePresence) {
      const sharePresenceStanza = xml(
        'presence',
        { to: contactJID }
      );
      await xmpp.send(sharePresenceStanza);
    }

    // Enviar un mensaje opcional al contacto
    if (message) {
      await sendMessage(contactJID, message);
    }

    console.log(`Solicitud de suscripción enviada a ${contactJID}`);
  } catch (error) {
    console.error('Error al añadir contacto:', error);
    throw error;
  }
}

function handleStanza(stanza) {
  if (stanza.is('message') && stanza.attrs.type === 'chat') {
    const from = stanza.attrs.from;
    const body = stanza.getChildText('body');

    if (body) {
      const message = {
        from,
        body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      messageListeners.forEach(listener => listener(message));
    }
  }
}

export function onMessage(listener) {
  messageListeners.push(listener);
}

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

export function listenForGroupInvitations(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from;
        const groupName = stanza.getChildText('x'); // Si el nombre del grupo se envía en una etiqueta 'x'
        callback({ groupName: from.split('/')[0] });
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}


export async function acceptGroupInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede aceptar la invitación: no estás online.");
  }

  try {
    await joinGroup(from);
    console.log(`Te has unido al grupo ${from}`);
  } catch (error) {
    console.error('Error al aceptar la invitación:', error);
    throw error;
  }
}

export async function rejectGroupInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede rechazar la invitación: no estás online.");
  }

  try {
    const presenceStanza = xml('presence', { to: from, type: 'unsubscribed' });
    await xmpp.send(presenceStanza);
    console.log(`Rechazada la invitación al grupo ${from}`);
  } catch (error) {
    console.error('Error al rechazar la invitación:', error);
    throw error;
  }
}

export async function getGroups() {
  return new Promise((resolve, reject) => {
    const iq = xml(
      'iq',
      { type: 'get', to: 'conference.alumchat.lol', id: 'group1' },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' }) // Utilizando disco#items para descubrir salas
    );

    xmpp.on('stanza', (stanza) => {
      if (stanza.is('iq') && stanza.getChild('query')) {
        const items = stanza.getChild('query').getChildren('item');
        const groups = items.map(item => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid
        }));
        resolve(groups);
      }
    });

    xmpp.send(iq).catch((err) => {
      console.error('Error al obtener los grupos:', err);
      reject(err);
    });
  });
}


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
    console.log(`Unido al grupo ${groupJID}`);
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    throw error;
  }
}

export async function sendGroupMessage(to, body) {
  if (!isOnline) {
    throw new Error("No se puede enviar mensaje al grupo: no estás online.");
  }

  try {
    const message = xml(
      "message",
      { to, type: "groupchat" },
      xml("body", {}, body)
    );
    await xmpp.send(message);
    console.log(`Mensaje enviado al grupo ${to}: ${body}`);
  } catch (error) {
    console.error('Error al enviar el mensaje al grupo:', error);
    throw error;
  }
}

export async function sendMessage(to, body) {
  if (!isOnline) {
    throw new Error("No se puede enviar mensaje: no estás online.");
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

export function listenForContactsPresenceUpdates(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence')) {
        const from = stanza.attrs.from.split('/')[0];
        const type = stanza.attrs.type;
        const show = stanza.getChildText('show');
        const statusMessage = stanza.getChildText('status');  // Obtener el mensaje de estado

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
        callback({ from, status, statusMessage });  // Enviar el mensaje de estado en el callback
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

export function getCurrentPresenceStatus() {
  return currentPresenceStatus;
}

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

export function getPresence() {
  return currentPresence;
}

export async function setPresence(presence, message) {
  await sendPresence(presence, message);
}

export async function signUp(username, fullName, email, password) {
  return new Promise((resolve, reject) => {
    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/",
      domain: "alumchat.lol",
      resource: "example",
      credentials: async (auth) => {
        return { username, password };
      },
    });

    debug(xmpp, true);

    xmpp.on('status', async (status) => {
      if (status === 'online') {
        try {
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

          const response = await xmpp.send(iq);
          resolve(response);
        } catch (err) {
          console.error('Error durante el registro:', err);
          reject(new Error('Error durante el registro: ' + err.message));
        }
      } else {
        console.log(`Estado actual de la conexión: ${status}`);
      }
    });

    xmpp.on("error", (err) => {
      console.error('Error de conexión:', err);
      reject(new Error('Error de conexión: ' + err.message));
    });

    xmpp.on("offline", () => {
      isOnline = false;
    });

    xmpp.start({
      timeout: 60000,
    }).catch((err) => {
      console.error('No se pudo conectar:', err);
      reject(new Error('Failed to connect: ' + err.message));
    });
  });
}

export function listenForContactInvitations(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        const from = stanza.attrs.from;
        callback({ from });
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

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

export async function rejectContactInvitation(from) {
  if (!isOnline) {
    throw new Error("No se puede rechazar la invitación: no estás online.");
  }

  try {
    const presenceStanza = xml('presence', { to: from, type: 'unsubscribed' });
    await xmpp.send(presenceStanza);
    console.log(`Rechazada la invitación de ${from}`);
  } catch (error) {
    console.error('Error al rechazar la invitación:', error);
    throw error;
  }
}


export { initializeXMPP };
