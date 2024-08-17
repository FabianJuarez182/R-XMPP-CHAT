import React, { useState, useEffect } from 'react';
import './MessageNotificationPopup.css';

function MessageNotificationPopup({ messages, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [localMessages, setLocalMessages] = useState(messages);

  useEffect(() => {
    if (messages.length > 0) {
      setIsVisible(true);
      setLocalMessages(messages);
    }
  }, [messages]);

  const handleClose = () => {
    setIsVisible(false);
    onClose(); // Notifies that the notification was closed
  };

  const handleRemoveMessage = (index) => {
    const updatedMessages = localMessages.filter((_, i) => i !== index);
    setLocalMessages(updatedMessages);

    // Optionally, if you want to persist the updated messages, you could do:
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