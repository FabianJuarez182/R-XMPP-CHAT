import React, { useState, useEffect } from 'react';
import './MessageNotificationPopup.css';

function MessageNotificationPopup({ messages, onClose }) {
  // State to manage the visibility of the popup
  const [isVisible, setIsVisible] = useState(false);
  // State to manage the list of messages displayed in the popup
  const [localMessages, setLocalMessages] = useState(messages);

  // useEffect hook to update visibility and local messages when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setIsVisible(true);
      setLocalMessages(messages);
    }
  }, [messages]); // Dependency array includes messages to trigger the effect when they change

  // Function to handle closing the popup
  const handleClose = () => {
    setIsVisible(false);
    onClose(); // Notifies that the notification was closed
  };

  // Function to handle removing a specific message from the notification list
  const handleRemoveMessage = (index) => {
    // Filter out the message at the specified index
    const updatedMessages = localMessages.filter((_, i) => i !== index);
    setLocalMessages(updatedMessages); // Update the local state with the remaining messages

    // Persist the updated messages in localStorage
    localStorage.setItem('messages', JSON.stringify(updatedMessages));

    // If there are no more messages, close the notification
    if (updatedMessages.length === 0) {
      handleClose();
    }
  };

  return (
    <>
      {isVisible && (
        <div className="message-notification-popup">
          <div className="popup-header">
            <h3>Nuevo Mensaje</h3>
            <button onClick={handleClose}>Cerrar</button>
          </div>
          <div className="popup-body">
            {localMessages.map((msg, index) => (
              <div key={index} className="message-item">
                <p><strong>{msg.sender}</strong>: {msg.content}</p>
                <button 
                  className="close-button" 
                  onClick={() => handleRemoveMessage(index)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default MessageNotificationPopup;