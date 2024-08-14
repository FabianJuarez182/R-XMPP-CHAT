import { client, xml } from '@xmpp/client';
import debug from '@xmpp/debug';


let xmpp;
let isOnline = false;
let currentUser = null;
let currentPresence = 'Available';
let currentPresenceStatus = 'online';
// Lista para manejar los listeners de mensajes
let messageListeners = [];

function initializeXMPP(username, password) {
  return new Promise((resolve, reject) => {
    if (!username || !password) {
      // Recuperar credenciales del localStorage si existen
      username = localStorage.getItem('username');
      password = localStorage.getItem('password');
    }
  
    // Guardar las credenciales en localStorage
    localStorage.setItem('username', username);
    localStorage.setItem('password', password);
    if (isOnline) {
      resolve();  // Si ya está online, no hace falta volver a conectar
      return;
    }
    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/",
      domain: "alumchat.lol",
      resource: "example",
      username: username,
      password: password,
    });

    xmpp.on("error", (err) => {
      console.error(err);
      reject(new Error('Login failed: ' + err.message));
    });

    xmpp.on("offline", () => {
      console.log("offline");
      isOnline = false;
    });

    xmpp.on("online", async (address) => {
      console.log(`Connected as ${address.toString()}`);
      isOnline = true;
      currentUser = username; // Almacena el nombre de usuario

      await sendPresence("chat");
      resolve(); // Resuelve la promesa cuando la conexión es exitosa
    });

    xmpp.start().catch((err) => {
      console.error('Failed to connect:', err);
      reject(new Error('Failed to connect: ' + err.message));
    });
  });
}

// Función para obtener el usuario actual
export function getCurrentUser() {
  return currentUser;
}

// Función para hacer logout
export async function logout() {
  if (!isOnline) {
    throw new Error("No se puede hacer logout: no estás online.");
  }

  try {
    await xmpp.stop(); // Detiene la conexión XMPP
    isOnline = false;
    console.log('Logout exitoso.');
    // Opcional: Eliminar las credenciales del almacenamiento local si realmente quieres que el usuario cierre sesión completamente.
    localStorage.removeItem('username');
    localStorage.removeItem('password');
  } catch (error) {
    console.error('Error durante el logout:', error);
    throw error;
  }
}


// Maneja los mensajes entrantes
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

      // Llamar a todos los listeners registrados
      messageListeners.forEach(listener => listener(message));
    }
  }
}

// Función para registrar listeners de mensajes
export function onMessage(listener) {
  messageListeners.push(listener);
}

// Función para enviar un mensaje a un usuario específico
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
          status: 'Available', // Estado por defecto
          imageUrl: `https://api.adorable.io/avatars/40/${item.attrs.jid}.png` // Imagen por defecto basada en el JID
        }));
         // Ahora solicitamos la presencia actual para cada contacto
         contacts.forEach(contact => {
          const presenceIq = xml(
            'presence',
            { to: contact.jid }
          );
          xmpp.send(presenceIq); // Envía la solicitud de presencia

          // Escucha la respuesta de presencia
          xmpp.on('stanza', (presenceStanza) => {
            if (presenceStanza.is('presence') && presenceStanza.attrs.from.includes(contact.jid)) {
              let status = 'Available'; // Estado por defecto
              const show = presenceStanza.getChildText('show');

              if (presenceStanza.attrs.type === 'unavailable') {
                status = 'Not Available';
              } else if (show === 'away') {
                status = 'Away';
              } else if (show === 'dnd') {
                status = 'Busy';
              } else if (show === 'xa') {
                status = 'Not Available';
              }

              // Actualizar el estado del contacto
              contact.status = status;
              resolve(contacts);  // Resuelve los contactos con sus estados actualizados
            }
          });
        });
      }
    });

    xmpp.send(rosterIq).catch((err) => {
      console.error('Error al obtener los contactos:', err);
      reject(err);
    });
  });
}

// Función para enviar un mensaje a un usuario específico
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

// Función para escuchar actualizaciones de presencia
export function listenForPresenceUpdates(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence')) {
        const from = stanza.attrs.from;
        const type = stanza.attrs.type;

        if (type === 'unavailable') {
          callback('offline', from);
          currentPresenceStatus = 'offline';
          return;
        }

        const show = stanza.getChild('show');
        const status = show ? show.text() : 'online';
        currentPresenceStatus = status;  // Almacena el estado actual
        callback(status, from);
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Función para escuchar actualizaciones de presencia de otros usuarios
export function listenForContactsPresenceUpdates(callback) {
  if (xmpp) {
    xmpp.on('stanza', (stanza) => {
      if (stanza.is('presence')) {
        const from = stanza.attrs.from.split('/')[0]; // Remueve la parte de resource
        const type = stanza.attrs.type;
        const show = stanza.getChildText('show');
        
        let status = 'Available'; // Estado por defecto

        if (type === 'unavailable') {
          status = 'Not Available';
        } else if (show === 'away') {
          status = 'Away';
        } else if (show === 'dnd') {
          status = 'Busy';
        } else if (show === 'xa') {
          status = 'Not Available';
        }

        callback({ from, status });
      }
    });
  } else {
    console.error('XMPP client is not connected');
  }
}

// Función para obtener el estado de presencia actual
export function getCurrentPresenceStatus() {
  return currentPresenceStatus;
}

async function sendPresence(presence) {
  if (!isOnline) {
    console.error('La conexión aún no está establecida.');
    return;
  }

  let show = '';
  switch (presence) {
    case 'Available':
      show = ''; // Presencia estándar, sin estado específico
      break;
    case 'Away':
      show = 'away';
      break;
    case 'Not Available':
      show = 'xa'; // Estado "Not Available" (Extended Away)
      break;
    case 'Busy':
      show = 'dnd'; // "Do Not Disturb" o "Busy"
      break;
    default:
      show = '';
      break;
  }
  try {
    const presenceStanza = xml('presence', {}, show ? xml('show', {}, show) : null);
    await xmpp.send(presenceStanza);
    currentPresence = presence; // Actualiza el estado de presencia actual
  } catch (error) {
    console.error('Error al enviar la presencia:', error);
  }
}

export function getPresence() {
  return currentPresence;
}

export async function setPresence(presence) {
  await sendPresence(presence);
}

// Función para registrar un nuevo usuario
export async function signUp(username, fullName, email, password) {
  console.log(username,fullName,email,password);
  return new Promise((resolve, reject) => {
    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/", // Usando WebSocket para la conexión
      domain: "alumchat.lol",
      resource: "example",
      credentials: async (auth) => {
        return { username, password }; // Enviar username y password
      },
    });

    // Habilitar depuración para ver detalles del proceso
    debug(xmpp, true);

    // Escuchar el cambio de estado
    xmpp.on('status', async (status) => {
      console.log(`XMPP status: ${status}`);
      if (status === 'online') {
        try {
          // IQ stanza para el registro
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
          console.log('Registro exitoso', response);
          resolve(response);
        } catch (err) {
          console.error('Error durante el registro:', err);
          alert(`Error durante el registro: ${err.message}`);
          reject(new Error('Error durante el registro: ' + err.message));
        }
      } else {
        console.log(`Estado actual de la conexión: ${status}`);
      }
    });

    // Manejo de errores de conexión
    xmpp.on("error", (err) => {
      console.error('Error de conexión:', err);
      alert(`Error durante el registro: ${err.message}`);
      reject(new Error('Error de conexión: ' + err.message));
    });

    // Manejo de la desconexión
    xmpp.on("offline", () => {
      console.log("Conexión offline");
      isOnline = false;
    });

    // Intentar iniciar la conexión con un tiempo de espera
    xmpp.start({
      timeout: 60000, // 30 segundos de tiempo de espera
    }).catch((err) => {
      console.error('No se pudo conectar:', err);
      alert(`Error durante el registro: No se pudo conectar. ${err.message}`);
      reject(new Error('Failed to connect: ' + err.message));
    });
  });
}


export { initializeXMPP };
