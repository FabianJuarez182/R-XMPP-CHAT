import React, { useState, useEffect } from 'react';
import { sendMessage, getContacts, onMessage, getCurrentUser, getPresence, setPresence, logout, getCurrentPresenceStatus, listenForPresenceUpdates} from '../services/xmppClient';
import './Chat.css';

function Chat() {
  const [selectedContact, setSelectedContact] = useState(null); // Contacto seleccionado para chatear
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]); // Lista de contactos
  const [currentUser, setCurrentUser] = useState(null); // Almacena el nombre del usuario conectado
  const [currentPresence, setCurrentPresence] = useState('Available');

  const presenceOptions = [
    { value: 'Available', label: 'Available' },
    { value: 'Away', label: 'Away' },
    { value: 'Not Available', label: 'Not Available' },
    { value: 'Busy', label: 'Busy' },
  ];

  useEffect(() => {
    listenForPresenceUpdates((status, from) => {
      if (from === getCurrentUser()) {
        setCurrentPresence(status);
      }
    });
  }, []);

  useEffect(() => {
    // Cargar los contactos desde el servidor cuando el componente se monta
    const loadContacts = async () => {
      try {
        const contactList = await getContacts();
        setContacts(contactList);
        setCurrentUser(getCurrentUser());
        setCurrentPresence(getPresence()); // Obtén el estado actual
      } catch (error) {
        console.error('Error al cargar los contactos:', error);
      }
    };

    loadContacts();
  }, []);

  useEffect(() => {
    // Registrar listener para mensajes entrantes
    onMessage((msg) => {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          content: msg.body,
          sender: msg.from === selectedContact ? 'them' : 'me',
          time: msg.time,
        }
      ]);
    });
  }, [selectedContact]);

  useEffect(() => {
    const username = getCurrentUser(); // Suponiendo que el nombre del usuario está guardado en localStorage
    setCurrentUser(username);
    console.log(username)
  }, []);

  useEffect(() => {
    // Registrar listener para mensajes entrantes
    onMessage((msg) => {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          content: msg.body,
          sender: msg.from === selectedContact ? 'them' : 'me',
          time: msg.time,
        }
      ]);
    });
  }, [selectedContact]);


  const handlePresenceChange = async (event) => {
    const newPresence = event.target.value;
    setCurrentPresence(newPresence);
    try {
      await setPresence(newPresence);
    } catch (error) {
      console.error('Error al cambiar la presencia:', error);
    }
  };
  const handleSendMessage = async () => {
    if (message) {
      const newMessage = {
        content: message,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      try {
        await sendMessage(selectedContact, message);
        setMessage('');
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
      }
    }
  };

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
  };

  // Manejo del Logout
  const handleLogout = async () => {
    try {
      await logout(); // Llama la función de logout en el servicio xmppClient
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };


  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="header">
        <div className="user-info">
            <div className="avatar">{currentUser ? currentUser.charAt(0).toUpperCase() : ''}</div>
          <div className="user-details">
            {currentUser && <span className="username">{currentUser}</span>}
            <select
              value={currentPresence}
              onChange={handlePresenceChange}
              className="presence-select"
            >
              <option value="Available">Available</option>
              <option value="Away">Away</option>
              <option value="Not Available">Not Available</option>
              <option value="Busy">Busy</option>
            </select>
          </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>LOGOUT</button>
        </div>
        <h3>Contactos</h3>
        <ul className="contact-list">
          {contacts.map((contact, index) => (
            <li
              key={index}
              className={`contact-item ${selectedContact === contact.jid ? 'selected' : ''}`}
              onClick={() => handleContactClick(contact.jid)}
            >
              {contact.name || contact.jid}
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-area">
        {selectedContact ? (
          <>
            <h2>{selectedContact.split('@')[0]}</h2>
            <div className="message-area">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                  {msg.content}
                  <span className="message-time">{msg.time}</span>
                </div>
              ))}
            </div>
            <div className="input-area">
              <input
                type="text"
                placeholder="Escribe un mensaje"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input"
              />
              <button onClick={handleSendMessage} className="button">Enviar</button>
            </div>
          </>
        ) : (
          <h2>Selecciona un contacto para chatear</h2>
        )}
      </div>
    </div>
  );
}

export default Chat;
