import { client, xml } from '@xmpp/client';


const xmpp = client({
  service: "ws://alumchat.lol:7070/ws/",
  domain: "alumchat.lol",
  resource: "example",
  username: "jua21440",
  password: "Redes-2024",
});


let isOnline = true;

xmpp.on("error", (err) => {
  console.error(err);
});

xmpp.on("offline", () => {
  console.log("offline");
  isOnline = false;
});

xmpp.on("online", async (address) => {
  console.log(`Connected as ${address.toString()}`);
  isOnline = true;
  // Inicialmente, enviar presencia como online
  await sendPresence("chat");
});

// Función para enviar un mensaje a un usuario específico
export async function sendMessage(to, body) {
  if (!isOnline) {
    throw new Error("No se puede enviar mensaje: no estás online.");
  }

  const message = xml(
    "message",
    { type: "chat", to },
    xml("body", {}, body)
  );
  await xmpp.send(message);
  console.log(`Mensaje enviado a ${to}: ${body}`);
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

// Función para cambiar la presencia a "away"
export async function setPresenceAway() {
  if (!isOnline) {
    throw new Error("No se puede cambiar la presencia: no estás online.");
  }

  try {
    await sendPresence("away"); // "away" indica que el usuario está ausente
    console.log("La presencia se ha cambiado a away.");
  } catch (error) {
    console.error('Error al cambiar la presencia a away:', error);
    throw error;
  }
}


// Función para enviar presencia "offline"
export async function setPresenceOffline() {
  if (!isOnline) {
    throw new Error("No se puede cambiar la presencia: ya estás offline.");
  }

  try {
    // Enviar presencia "unavailable" al servidor
    await xmpp.send(xml("presence", { type: "unavailable" }));
    isOnline = false;
    console.log("Te has puesto offline.");
  } catch (error) {
    console.error('Error al cambiar la presencia:', error);
    throw error;
  }
}

// Función para enviar la presencia al servidor
async function sendPresence(show) {
  if (xmpp.status !== 'online') {
    console.error('La conexión aún no está establecida.');
    return; // Salir si la conexión no está lista
  }

  const presence = xml('presence', {}, xml('show', {}, show));
  await xmpp.send(presence);
}

// Función para verificar si el cliente está conectado
export function getConnectionStatus() {
  return isOnline;
}

xmpp.start().catch(console.error);

export default xmpp;
