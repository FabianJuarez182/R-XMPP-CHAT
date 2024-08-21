import React, { useState, useEffect } from 'react';
import {
  initializeXMPP,
  sendMessage,
  offMessage,
  sendGroupMessage,
  getContacts,
  onMessage,
  getCurrentUser,
  getPresence,
  setPresence,
  logout,
  deleteUser,
  deleteContact,
  addContact,
  getCurrentPresenceStatus,
  listenForPresenceUpdates,
  listenForContactsPresenceUpdates,
  listenForContactInvitations, // Una función que debe implementar para escuchar invitaciones
  listenForGroupMessages,
  acceptContactInvitation,
  rejectContactInvitation,
  getGroups, // Nueva función para obtener los grupos
  joinGroup, // Nueva función para unirse a un grupo
  listenForGroupInvitations,  // Nueva función para escuchar invitaciones a grupos
  acceptGroupInvitation,      // Nueva función para aceptar invitaciones a grupos
  rejectGroupInvitation       // Nueva función para rechazar invitaciones a grupos
} from '../services/xmppClient';
import NotificationPopup from './NotificationPopup';
import MessageNotificationPopup from './MessageNotificationPopup';
import GroupInvitationPopup from './GroupInvitationPopup'; // Nuevo componente de notificación para invitaciones a grupos
import './Chat.css';

function Chat() {
  const [selectedContact, setSelectedContact] = useState(null); // Contacto seleccionado para chatear
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]); // Lista de contactos
  const [groups, setGroups] = useState([]); // Lista de grupos
  const [currentUser, setCurrentUser] = useState(null); // Almacena el nombre del usuario conectado
  const [currentPresence, setCurrentPresence] = useState('Available');
  const [presenceMessage, setPresenceMessage] = useState(''); // Nuevo estado para el mensaje de presencia
  const [sharePresence, setSharePresence] = useState(true); // Por defecto, compartir estatus es verdadero
  const [newMessages, setNewMessages] = useState([]);
  const [groupInvitations, setGroupInvitations] = useState([]); // Estado para las invitaciones a grupos
  const [isGroup, setIsGroup] = useState(false); // Para saber si el chat actual es de un grupo
  const [messageHistory, setMessageHistory] = useState({}); // Historial de mensajes por contacto
  const [listeners, setListeners] = useState([]);
  const processedInvitations = new Set();
  const [isModalO, setIsModalO] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);


    // Estado para el modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newContact, setNewContact] = useState('');
    const [newContactMessage, setNewContactMessage] = useState('');
    const [invitations, setInvitations] = useState([]);


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
          loadGroups();  // Cargar grupos después de conectarse

          // Escuchar actualizaciones de presencia de contactos
          listenForContactsPresenceUpdates((presenceUpdate) => {
            setContacts(prevContacts =>
              prevContacts.map(contact => 
                contact.jid === presenceUpdate.from 
                  ? { ...contact, status: presenceUpdate.status, statusMessage: presenceUpdate.statusMessage  }
                  : contact
              )
            );
          });
        listenForGroupInvitations((groupInvitation) => {
          setGroupInvitations(prevInvitations => [...prevInvitations, groupInvitation]);
          });
        listenForGroupMessages((msg) => {
            setMessages(prevMessages => [...prevMessages, msg]);
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
        setCurrentPresence(getPresence());
        localStorage.setItem('contacts', JSON.stringify(contactList));

        listenForContactsPresenceUpdates((presenceUpdate) => {
          console.log('Presence update received:', presenceUpdate);  // Verificar que las actualizaciones se reciben
          setContacts(prevContacts =>
            prevContacts.map(contact =>
              contact.jid === presenceUpdate.from
                ? {
                    ...contact,
                    status: presenceUpdate.status,
                    statusMessage: presenceUpdate.statusMessage || contact.statusMessage // Actualizar el status y el statusMessage
                  }
                : contact
            )
          );
          localStorage.setItem('contacts', JSON.stringify(contacts));
        });
      } catch (error) {
        console.error('Error al cargar los contactos:', error);
      }
    };
  
    loadContacts();
  }, []);
  
  const loadGroups = async () => {
    try {
      const groupList = await getGroups();
      setGroups(groupList);
    } catch (error) {
      console.error('Error al cargar los grupos:', error);
    }
  };

  useEffect(() => {
    if (contacts.length > 0) { // Asegurarse de que los contactos están cargados
      const loadGroups = async () => {
        try {
          const groupList = await getGroups();
          setGroups(groupList);
        } catch (error) {
          console.error('Error al cargar los grupos:', error);
        }
      };
      loadGroups();
    }
  }, [contacts]);
  

  useEffect(() => {
    const messageListener = (msg) => {
      const from = msg.from;
      let sender;
      if (isGroup) {
        // Si es un grupo, extrae el nombre del `resource`
        if (from.includes('/')) {
          sender = from.split('/')[1];  // `resource` contiene el nombre del usuario que envió el mensaje
        } else {
          sender = 'Desconocido'; // Fallback si no hay `resource` en el JID
        }
      } else {
        // Si no es un grupo, usa el `username` del JID
        sender = from.split('@')[0];
      }
      console.log("EnviadoPor:",sender)
      const newMessage = {
        content: msg.body || 'No content',
        sender: sender,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, newMessage];
        localStorage.setItem('messages', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    
      setNewMessages(prevMessages => [...prevMessages, newMessage]);
    };
    
    // Attach the message listener
    onMessage(messageListener);
    
    return () => {
      // Assuming `offMessage` function exists to remove listeners
      offMessage(messageListener);
    };
  }, [selectedContact, isGroup]);
  

  useEffect(() => {
    const savedSelectedContact = localStorage.getItem('selectedContact');
    if (savedSelectedContact) {
      setSelectedContact(savedSelectedContact);
    }
  }, []);

  const handleContactClick = (contact, isGroup = false) => {
    setSelectedContact(contact);
    setIsGroup(isGroup);
    const savedMessages = messageHistory[contact] || [];
    setMessages(savedMessages);

    if (isGroup) {
      joinGroup(contact);  // Join the group when selected
    }
  };

  useEffect(() => {
    if (isGroup) {
      const currentUserJID = `${currentUser}@alumchat.lol`;
      joinGroup(selectedContact, currentUser);
  
      const handleGroupMessage = (msg) => {
        const senderJID = msg.from.split('/')[1];
        // Filter out messages sent by the current user
        if (msg.body.trim() !== '' && senderJID !== currentUserJID) {
          const newMessage = {
            content: msg.body,
            sender: senderJID,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
  
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      };
  
      // Attach the group message listener
      listenForGroupMessages(handleGroupMessage);
  
      // Cleanup function to remove the listener when the component unmounts or dependencies change
      return () => {
        offMessage(handleGroupMessage);
        console.log(`Cleaned up listener for ${selectedContact}`);
      };
    }
  }, [selectedContact, isGroup]);

  const handlePresenceChange = async (event) => {
    const newPresence = event.target.value;
    setCurrentPresence(newPresence);
    try {
      await setPresence(newPresence, presenceMessage); // Ahora envía el mensaje de presencia
    } catch (error) {
      console.error('Error al cambiar la presencia:', error);
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() !== '') {  // Verifica que el mensaje no esté vacío
      const newMessage = {
        content: message,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const newMessages = [...messages, newMessage];
      setMessages(newMessages);
  
      setMessageHistory(prevHistory => {
        const updatedHistory = { ...prevHistory, [selectedContact]: newMessages };
        localStorage.setItem('messageHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      try {
        if (isGroup) {
          await sendGroupMessage(selectedContact, message);
        } else {
          await sendMessage(selectedContact, message);
        }
        setMessage('');  // Limpia el input de mensaje después de enviar
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
      }
    } else {
      console.error('Mensaje vacío, no enviado.');
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


  useEffect(() => {
    listenForContactInvitations((invitation) => {
      setInvitations((prevInvitations) => [...prevInvitations, invitation]);
    });
  }, []);

  const handleAccept = (invite) => {
    acceptContactInvitation(invite.from);
    setInvitations(invitations.filter(i => i !== invite));
  };

  const handleReject = (invite) => {
    rejectContactInvitation(invite.from);
    setInvitations(invitations.filter(i => i !== invite));
  };


  const handleAcceptGroupInvite = (invite) => {
    acceptGroupInvitation(invite.groupName);
    setGroupInvitations(groupInvitations.filter(i => i !== invite));
    processedInvitations.delete(invite.groupName);
  };
  
  const handleRejectGroupInvite = (invite) => {
    rejectGroupInvitation(invite.groupName);
    setGroupInvitations(groupInvitations.filter(i => i !== invite));
    processedInvitations.delete(invite.groupName);
  };
  
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  }

  const handleCloseNotification = () => {
    setNewMessages([]);
  };

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setIsModalO(true);
  };

  const handleConfirmDelete = async () => {
    if (contactToDelete) {
      try {
        await deleteContact(contactToDelete.jid);
        setContacts(contacts.filter(c => c.jid !== contactToDelete.jid));
        setIsModalO(false);
        setContactToDelete(null);
      } catch (error) {
        console.error('Error al eliminar el contacto:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setIsModalO(false);
    setContactToDelete(null);
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
              <input 
                type="text" 
                placeholder="Mensaje de estado"
                value={presenceMessage}
                onChange={(e) => setPresenceMessage(e.target.value)}
                className="presence-message-input"
              />
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
                <span className="contact-name">{contact.name.split('@')[0] || contact.jid}</span>
                <span className="contact-status">{contact.status}</span>
                {contact.statusMessage && (
                  <span className="contact-status-message">Status: {contact.statusMessage}</span> // Muestra el mensaje de presencia
                )}
              </div>
              <button className="delete-contact-button" onClick={() => handleDeleteClick(contact)}>
                X
              </button>
            </li>
          ))}
        </ul>
        <h3>Grupos</h3>
        <ul className="group-list">
          {groups.map((group, index) => (
            <li
              key={index}
              className={`group-item ${selectedContact === group.jid ? 'selected' : ''}`}
              onClick={() => handleContactClick(group.jid, true)}
            >
              <div className="group-info">
                <span className="group-name">{group.name || group.jid}</span>
              </div>
            </li>
          ))}
        </ul>
        <button className="add-contact-button" onClick={openModal}>Agregar Contacto</button>
        <button className="delete-account-button" onClick={handleDeleteAccount}>Eliminar Cuenta</button>
        {/* Modal de confirmación */}
      {isModalO && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar eliminación</h2>
            <p>¿Estás seguro de que deseas eliminar el contacto {contactToDelete?.name.split('@')[0] || contactToDelete?.jid}?</p>
            <div className="modal-buttons">
              <button onClick={handleConfirmDelete} className="modal-delete-button">
                Eliminar
              </button>
              <button onClick={handleCancelDelete} className="modal-cancel-button">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="chat-area">
        {selectedContact ? (
          <>
            <h2>{selectedContact.split('@')[0]}</h2>
            <div className="message-area">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                  <strong>{msg.sender}</strong>{msg.content}
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
                onKeyDown={(e) => handleKeyDown(e)}
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
      <GroupInvitationPopup
        invitations={groupInvitations}
        onAccept={handleAcceptGroupInvite}
        onReject={handleRejectGroupInvite}
      />
      <MessageNotificationPopup
        messages={newMessages}
        onClose={handleCloseNotification}
      />
        <NotificationPopup
        invitations={invitations}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </div>
  );
}

export default Chat;
