import React, { useState, useEffect, useRef  } from 'react';
// Import XMPP client services and functions for messaging, presence, and group management
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
  createGroup,
  listenForPresenceUpdates,
  listenForContactsPresenceUpdates,
  listenForContactInvitations,
  listenForGroupMessages,
  acceptContactInvitation,
  rejectContactInvitation,
  getGroups,
  joinGroup,
  listenForGroupInvitations,
  acceptGroupInvitation,
  rejectGroupInvitation
} from '../services/xmppClient';

// Import components for notifications
import NotificationPopup from './NotificationPopup';
import MessageNotificationPopup from './MessageNotificationPopup';
import GroupInvitationPopup from './GroupInvitationPopup';
import './Chat.css';

function Chat() {
  // State to manage the selected contact for chatting
  const [selectedContact, setSelectedContact] = useState(null);
  // State to handle the current message being typed
  const [message, setMessage] = useState('');
  // State to store the list of messages in the current chat
  const [messages, setMessages] = useState([]);
  // State to store the list of contacts
  const [contacts, setContacts] = useState([]);
  // State to store the list of groups
  const [groups, setGroups] = useState([]);
  // State to store the current user's name
  const [currentUser, setCurrentUser] = useState(null);
  // State to store the current presence status (e.g., Available, Busy)
  const [currentPresence, setCurrentPresence] = useState('Available');
  // State to store a custom presence message (e.g., "Out to lunch")
  const [presenceMessage, setPresenceMessage] = useState('');
  // State to manage whether presence is shared with contacts
  const [sharePresence, setSharePresence] = useState(true);
  // State to store new incoming messages
  const [newMessages, setNewMessages] = useState([]);
  // State to store incoming group invitations
  const [groupInvitations, setGroupInvitations] = useState([]);
  // State to determine if the current chat is a group chat
  const [isGroup, setIsGroup] = useState(false);
  // State to store message history per contact
  const [messageHistory, setMessageHistory] = useState({});
  // Set to track processed invitations and avoid duplicates
  const processedInvitations = new Set();
  // State to manage the visibility of the delete confirmation modal
  const [isModalO, setIsModalO] = useState(false);
  // State to store the contact selected for deletion
  const [contactToDelete, setContactToDelete] = useState(null);

  // State to manage the visibility of the add contact modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to store the new contact's username
  const [newContact, setNewContact] = useState('');
  // State to store the message sent with the contact invitation
  const [newContactMessage, setNewContactMessage] = useState('');
  // State to store incoming contact invitations
  const [invitations, setInvitations] = useState([]);
  // State to store the visibility of the group modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  // State to store the new group name
  const [newGroupName, setNewGroupName] = useState('');
  // State to store the new group description
  const [newGroupDescription, setNewGroupDescription] = useState('');

  //Create Reference for final content message
  const messagesEndRef = useRef(null);

  // Function to show the modal for adding a new contact
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the modal for adding a new Group
  const openGroupModal = () => {
    setIsGroupModalOpen(true);
  };

  // Function to close the modal and reset its state
  const closeModal = () => {
      setIsModalOpen(false);
      setNewContact('');
      setNewContactMessage('');
    };
  
  // Function to close the group modal and reset its state
  const closeGroupModal = () => {
    setIsGroupModalOpen(false);
    setNewGroupName('');
    setNewGroupDescription('');
  };

      // Function to handle adding a new contact
    const handleAddContact = async () => {
      try {
        await addContact(newContact, newContactMessage, sharePresence); // Use addContact to add the contact
        closeModal(); // Close the modal after adding the contact
      } catch (error) {
        console.error('Error al agregar contacto:', error);
      }
    };

  // useEffect hook to initialize presence and user data from local storage
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

    // Listen for updates to the user's presence status
    listenForPresenceUpdates((status, from) => {
      if (from === getCurrentUser()) {
        setCurrentPresence(status);
        localStorage.setItem('currentPresence', status);
      }
    });
  }, []);

  // useEffect hook to handle XMPP reconnection and initialization
  useEffect(() => {
    const username = localStorage.getItem('username');
    const password = localStorage.getItem('password');
  
    if (username && password) {
      // Automatically reconnect if credentials are stored
      initializeXMPP(username, password)
        .then(() => {
          setCurrentUser(username);
          setCurrentPresence(getPresence());
          // Load contacts and groups after connecting
          loadContacts();
          loadGroups();

          // Listen for updates to contact presence statuses
          listenForContactsPresenceUpdates((presenceUpdate) => {
            setContacts(prevContacts =>
              prevContacts.map(contact =>
                contact.jid === presenceUpdate.from
                  ? { ...contact, status: presenceUpdate.status, statusMessage: presenceUpdate.statusMessage  }
                  : contact
              )
            );
          });

        // Listen for incoming group invitations
        listenForGroupInvitations((groupInvitation) => {
          setGroupInvitations(prevInvitations => [...prevInvitations, groupInvitation]);
          });

        // Listen for incoming group messages
        listenForGroupMessages((msg) => {
            setMessages(prevMessages => [...prevMessages, msg]);
          });
        })
        .catch((error) => {
          console.error('Error al reconectar:', error);
        });
    }
  }, []);

  // Function to load contacts from the server
  const loadContacts = async () => {
    try {
      const contactList = await getContacts();
      setContacts(contactList);
    } catch (error) {
      console.error('Error al cargar los contactos:', error);
    }
  };

  // useEffect hook to load contacts and set up presence updates
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const contactList = await getContacts();
        setContacts(contactList);
        setCurrentUser(getCurrentUser());
        setCurrentPresence(getPresence());
        localStorage.setItem('contacts', JSON.stringify(contactList));

        // Listen for presence updates from contacts
        listenForContactsPresenceUpdates((presenceUpdate) => {
          console.log('Presence update received:', presenceUpdate);  // Verify that updates are received
          setContacts(prevContacts =>
            prevContacts.map(contact =>
              contact.jid === presenceUpdate.from
                ? {
                    ...contact,
                    status: presenceUpdate.status,
                    statusMessage: presenceUpdate.statusMessage || contact.statusMessage // Update status and statusMessage
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
  
  // Function to load groups from the server
  const loadGroups = async () => {
    try {
      const groupList = await getGroups();
      setGroups(groupList);
    } catch (error) {
      console.error('Error al cargar los grupos:', error);
    }
  };

  // useEffect hook to load groups once contacts are available
  useEffect(() => {
    if (contacts.length > 0) { // Ensure contacts are loaded before loading groups
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

  // useEffect hook to handle incoming messages, both personal and group
  useEffect(() => {
    const messageListener = (msg) => {
      const from = msg.from;
      let sender;
      const fromJID = from.split('/')[0];

      if (isGroup) {
        // If it's a group, extract the sender's name from the 'resource' part of the JID
        if (from.includes('/')) {
          sender = from.split('/')[1];  // 'resource' contains the sender's name
        } else {
          sender = 'Desconocido'; // Fallback if no resource is present in the JID
        }
      } else {
        // If not a group, use the username part of the JID
        sender = from.split('@')[0];
      }
      console.log("EnviadoPor:",sender)

      const newMessage = {
        content: msg.body || 'No content',
        sender: sender,
        from: fromJID,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (selectedContact === fromJID) {
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages, newMessage];
          localStorage.setItem('messages', JSON.stringify(updatedMessages));
          return updatedMessages;
        });
  
        // Save history message for contact/group
        setMessageHistory(prevHistory => {
          const updatedHistory = {
            ...prevHistory,
            [selectedContact]: [...(prevHistory[selectedContact] || []), newMessage]
          };
          localStorage.setItem('messageHistory', JSON.stringify(updatedHistory));
          return updatedHistory;
        });
      } else {
        // if not the contact/group selected, save message not seen
        setNewMessages(prevMessages => [...prevMessages, newMessage]);
      }
    };
    
    // Attach the message listener
    onMessage(messageListener);
    
    return () => {
      // Remove the message listener when the component unmounts or dependencies change
      offMessage(messageListener);
    };
  }, [selectedContact, isGroup]);
  
  // useEffect hook to restore the last selected contact from local storage
  useEffect(() => {
    const savedSelectedContact = localStorage.getItem('selectedContact');
    if (savedSelectedContact) {
      setSelectedContact(savedSelectedContact);
    }
  }, []);

  // Function to handle clicking on a contact or group
  const handleContactClick = (contact, isGroup = false) => {
    setSelectedContact(contact);
    setIsGroup(isGroup);
    setMessages(messageHistory[contact] || []);

    if (isGroup) {
      joinGroup(contact);  // Join the group when selected
    }
  };

  // useEffect hook to handle joining a group and listening for group messages
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

  // Function to handle changes in presence status
  const handlePresenceChange = async (event) => {
    const newPresence = event.target.value;
    setCurrentPresence(newPresence);
    try {
      await setPresence(newPresence, presenceMessage); // Now sends the presence message as well
    } catch (error) {
      console.error('Error al cambiar la presencia:', error);
    }
  };

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (message.trim() !== '') {  // Check that the message is not empty
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
        setMessage('');  // Clear the message input after sending
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
      }
    } else {
      console.error('Mensaje vacío, no enviado.');
    }
  };


  // Function to handle user logout
  const handleLogout = async () => {
    try {
      await logout(); // Call the logout function from the XMPP client service
      localStorage.clear(); // Clear local storage to ensure no persistent data remains
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Function to handle account deletion
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

  // useEffect hook to listen for incoming contact invitations
  useEffect(() => {
    listenForContactInvitations((invitation) => {
      setInvitations((prevInvitations) => [...prevInvitations, invitation]);
    });
  }, []);

  // Function to accept a contact invitation
  const handleAccept = (invite) => {
    acceptContactInvitation(invite.from);
    setInvitations(invitations.filter(i => i !== invite));
  };

  // Function to reject a contact invitation
  const handleReject = (invite) => {
    rejectContactInvitation(invite.from);
    setInvitations(invitations.filter(i => i !== invite));
  };

  // Function to accept a group invitation
  const handleAcceptGroupInvite = (invite) => {
    acceptGroupInvitation(invite.groupName);
    setGroupInvitations(groupInvitations.filter(i => i !== invite));
    processedInvitations.delete(invite.groupName);
  };

  // Function to reject a group invitation
  const handleRejectGroupInvite = (invite) => {
    rejectGroupInvitation(invite.groupName);
    setGroupInvitations(groupInvitations.filter(i => i !== invite));
    processedInvitations.delete(invite.groupName);
  };

  // Function to handle pressing the 'Enter' key to send a message
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  }

  // Function to close the notification popup for new messages
  const handleCloseNotification = () => {
    setNewMessages([]);
  };

  // Function to handle clicking the delete button for a contact
  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setIsModalO(true);
  };

  // Function to confirm the deletion of a contact
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

  // Function to cancel the deletion of a contact
  const handleCancelDelete = () => {
    setIsModalO(false);
    setContactToDelete(null);
  };

  // Function to scroll the container down
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // useEffect to scrool down when change contact/group
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedContact]);

  // Function to manage creation of group
  const handleCreateGroup = async () => {
    try {
      await createGroup(newGroupName, newGroupDescription); // Fuction in xmpp Client.
      closeGroupModal();
      // reload the list groups
      loadGroups();
    } catch (error) {
      console.error('Error al crear el grupo:', error);
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
        <div className="action-buttons">
          <button className="add-contact-button" onClick={openGroupModal}>Crear Grupo</button>
          <button className="add-contact-button" onClick={openModal}>Agregar Contacto</button>
        </div>
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
            <div ref={messagesEndRef}/>
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
       {isGroupModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Crear Nuevo Grupo</h2>
            <input
              type="text"
              placeholder="Nombre del grupo"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="modal-input"
            />
            <textarea
              placeholder="Descripción"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-buttons">
              <button onClick={handleCreateGroup} className="modal-add-button">
                Crear Grupo
              </button>
              <button onClick={closeGroupModal} className="modal-close-button">
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
