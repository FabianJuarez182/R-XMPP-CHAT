import React, { useState, useEffect } from 'react';
import {
  initializeXMPP,
  sendMessage,
  getContacts,
  onMessage,
  getCurrentUser,
  getPresence,
  setPresence,
  logout,
  getCurrentPresenceStatus,
  listenForPresenceUpdates,
  listenForContactsPresenceUpdates
} from '../services/xmppClient';
import './Chat.css';

function Chat() {
  const [selectedContact, setSelectedContact] = useState(null); // Contacto seleccionado para chatear
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]); // Lista de contactos
  const [currentUser, setCurrentUser] = useState(null); // Almacena el nombre del usuario conectado
  const [currentPresence, setCurrentPresence] = useState('Available');

  useEffect(() => {
    const savedPresence = localStorage.getItem('currentPresence');
    const savedUser = localStorage.getItem('currentUser');
  
    if (savedPresence) {
      setCurrentPresence(savedPresence);
    }
  
    if (savedUser) {
      setCurrentUser(savedUser);
    } else {
      const username = getCurrentUser();
      setCurrentUser(username);
      localStorage.setItem('currentUser', username);
    }
  
    listenForPresenceUpdates((status, from) => {
      if (from === getCurrentUser()) {
        setCurrentPresence(status);
        localStorage.setItem('currentPresence', status);
      }
    });
  }, []);
  
  useEffect(() => {
    const username = localStorage.getItem('username');
    const password = localStorage.getItem('password');
  
    if (username && password) {
      // Si las credenciales están presentes, reconectar automáticamente
      initializeXMPP(username, password)
        .then(() => {
          setCurrentUser(username);
          setCurrentPresence(getPresence());
          // Cargar los contactos desde el servidor
          loadContacts();

          // Escuchar actualizaciones de presencia de contactos
          listenForContactsPresenceUpdates((presenceUpdate) => {
            setContacts(prevContacts =>
              prevContacts.map(contact => 
                contact.jid === presenceUpdate.from 
                  ? { ...contact, status: presenceUpdate.status }
                  : contact
              )
            );
          });
        })
        .catch((error) => {
          console.error('Error al reconectar:', error);
        });
    }
  }, []);

  const loadContacts = async () => {
    try {
      const contactList = await getContacts();
      setContacts(contactList);
    } catch (error) {
      console.error('Error al cargar los contactos:', error);
    }
  };

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const contactList = await getContacts();
        setContacts(contactList);
        setCurrentUser(getCurrentUser());
        setCurrentPresence(getPresence()); // Obtén el estado actual
        // Guardar contactos en localStorage
        localStorage.setItem('contacts', JSON.stringify(contactList));
  
        // Escuchar y actualizar presencias de contactos
        listenForContactsPresenceUpdates((presenceUpdate) => {
          const updatedContacts = contactList.map(contact =>
            contact.jid === presenceUpdate.from 
              ? { ...contact, status: presenceUpdate.status }
              : contact
          );
          setContacts(updatedContacts);
          localStorage.setItem('contacts', JSON.stringify(updatedContacts));
        });
      } catch (error) {
        console.error('Error al cargar los contactos:', error);
      }
    };
  
    loadContacts();
  }, []);

  useEffect(() => {
    const savedMessages = JSON.parse(localStorage.getItem('messages'));
    if (savedMessages) {
      setMessages(savedMessages);
    }
  
    onMessage((msg) => {
      const newMessages = [
        ...messages,
        {
          content: msg.body,
          sender: msg.from === selectedContact ? 'them' : 'me',
          time: msg.time,
        }
      ];
      setMessages(newMessages);
  
      // Guardar mensajes en localStorage
      localStorage.setItem('messages', JSON.stringify(newMessages));
    });
  }, [selectedContact]);

useEffect(() => {
    onMessage((msg) => {
        const newMessage = {
            content: msg.body,
            sender: msg.from === selectedContact ? 'them' : 'me',
            time: msg.time,
        };
        setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, newMessage];
            localStorage.setItem('messages', JSON.stringify(updatedMessages)); // Guarda los mensajes en localStorage
            return updatedMessages;
        });
    });
}, [selectedContact]); // Solo depende de selectedContact

  useEffect(() => {
    const savedSelectedContact = localStorage.getItem('selectedContact');
    if (savedSelectedContact) {
      setSelectedContact(savedSelectedContact);
    }
  }, []);

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    localStorage.setItem('selectedContact', contact);
  };

  const handlePresenceChange = async (event) => {
    const newPresence = event.target.value;
    setCurrentPresence(newPresence);
    try {
      await setPresence(newPresence);
      localStorage.setItem('currentPresence', newPresence);
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
        localStorage.setItem('messages', JSON.stringify([...messages, newMessage]));
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
      }
    }
  };

  // Manejo del Logout
  const handleLogout = async () => {
    try {
      await logout(); // Llama la función de logout en el servicio xmppClient
      localStorage.clear(); // Limpia el localStorage para asegurarte de que no queden datos persistentes.
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
              <div className="contact-info">
                <span className="contact-name">{contact.name || contact.jid}</span>
                <span className="contact-status">{contact.status}</span>
              </div>
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
