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
  deleteUser,
  addContact,
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
  const [sharePresence, setSharePresence] = useState(true); // Por defecto, compartir estatus es verdadero

    // Estado para el modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newContact, setNewContact] = useState('');
    const [newContactMessage, setNewContactMessage] = useState('');

      // Mostrar el modal
  const openModal = () => {
    setIsModalOpen(true);
  };

    // Cerrar el modal
    const closeModal = () => {
      setIsModalOpen(false);
      setNewContact('');
      setNewContactMessage('');
    };

    const handleAddContact = async () => {
      try {
        await addContact(newContact, newContactMessage, sharePresence); // Usa addContact para agregar el contacto
        closeModal(); // Cierra el modal al añadir el contacto
        // Aquí puedes agregar lógica adicional para actualizar la lista de contactos
      } catch (error) {
        console.error('Error al agregar contacto:', error);
      }
    };

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
    const savedMessages = JSON.parse(localStorage.getItem('messages')) || {};
    if (selectedContact && savedMessages[selectedContact]) {
      setMessages(savedMessages[selectedContact]);
    }

    onMessage((msg) => {
      const newMessages = [
        ...messages,
        {
          content: msg.body,
          sender: msg.from === selectedContact ? 'them' : 'me',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(newMessages);

      // Guardar mensajes en localStorage
      const updatedMessages = { ...savedMessages, [selectedContact]: newMessages };
      localStorage.setItem('messages', JSON.stringify(updatedMessages));
    });
  }, [selectedContact, messages]);

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
    const savedMessages = JSON.parse(localStorage.getItem('messages')) || {};
    if (savedMessages[contact]) {
      setMessages(savedMessages[contact]);
    } else {
      setMessages([]);
    }
  };

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
      const newMessages = [...messages, newMessage];
      setMessages(newMessages);

      // Guardar mensajes en localStorage
      const savedMessages = JSON.parse(localStorage.getItem('messages')) || {};
      const updatedMessages = { ...savedMessages, [selectedContact]: newMessages };
      localStorage.setItem('messages', JSON.stringify(updatedMessages));

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

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.");
    if (confirmation) {
      try {
        await deleteUser();
        alert("Tu cuenta ha sido eliminada. Serás redirigido a la página de inicio.");
        window.location.href = '/';
      } catch (error) {
        console.error('Error al eliminar la cuenta:', error);
        alert("Hubo un problema al intentar eliminar tu cuenta. Inténtalo de nuevo más tarde.");
      }
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
        <button className="add-contact-button" onClick={openModal}>Agregar Contacto</button>
        <button className="delete-account-button" onClick={handleDeleteAccount}>Eliminar Cuenta</button>
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
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Agregar Nuevo Contacto</h2>
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              className="modal-input"
            />
            <textarea
              placeholder="Mensaje"
              value={newContactMessage}
              onChange={(e) => setNewContactMessage(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-checkbox">
              <input
                type="checkbox"
                checked={sharePresence}
                onChange={(e) => setSharePresence(e.target.checked)}
              />
              <label>Compartir mi estatus</label>
            </div>
            <div className="modal-buttons">
              <button onClick={handleAddContact} className="modal-add-button">
                Añadir Contacto
              </button>
              <button onClick={closeModal} className="modal-close-button">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
