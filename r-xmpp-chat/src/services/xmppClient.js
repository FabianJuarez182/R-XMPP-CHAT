import { client, xml } from '@xmpp/client';
import debug from '@xmpp/debug';


let xmpp;
let isOnline = false;

function initializeXMPP(username, password) {
  return new Promise((resolve, reject) => {
    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/",
      domain: "alumchat.lol",
      resource: "example",
      username: username,//"jua21440",
      password: password,//"Redes-2024"
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
      await sendPresence("chat");
      resolve(); // Resuelve la promesa cuando la conexión es exitosa
    });

    xmpp.start().catch((err) => {
      console.error('Failed to connect:', err);
      reject(new Error('Failed to connect: ' + err.message));
    });
  });
}
// Función para enviar un mensaje a un usuario específico
export async function sendMessage(to, body) {
  console.log('Intentando enviar mensaje...');
  if (!isOnline) {
    console.error('No se puede enviar mensaje: no estás online.');
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

// Función para registrar un nuevo usuario
export async function signUp(username, fullName, email, password) {
  console.log(username,fullName,email,password);
  return new Promise((resolve, reject) => {
    xmpp = client({
      service: "ws://alumchat.lol:7070/ws/", // Usando WebSocket para la conexión
      domain: "alumchat.lol",
      resource: "example",
      credentials: async (auth) => {
        return { username, password, mechanism: 'PLAIN' }; // Enviar username y password
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



// Función para modificar la presencia "online" sin enviar una nueva presencia
export async function setPresenceOnline() {
  if (!isOnline) {
    throw new Error("No se puede cambiar la presencia: no estás online.");
  }

  try {
    // Modificar la presencia localmente sin reenviar al servidor
    await sendPresence("chat");
    console.log("La presencia se ha cambiado a online localmente.");
  } catch (error) {
    console.error('Error al cambiar la presencia:', error);
    throw error;
  }
}

async function sendPresence(show) {
  if (!isOnline) {
    console.error('La conexión aún no está establecida.');
    return;
  }

  const presence = xml('presence', {}, xml('show', {}, show));
  await xmpp.send(presence);
}

export function getConnectionStatus() {
  return isOnline;
}

export { initializeXMPP };
