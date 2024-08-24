import React, { useState, useEffect } from 'react';
import './NotificationPopup.css';

function NotificationPopup({ invitations, onAccept, onReject }) {
  // State to manage the visibility of the popup
  const [isVisible, setIsVisible] = useState(false);

  // useEffect hook to toggle visibility based on the number of invitations
  useEffect(() => {
    // If there are invitations, make the popup visible
    if (invitations.length > 0) {
      setIsVisible(true);
    }
  }, [invitations]); // Dependency array includes invitations to trigger the effect when they change

  // Function to handle closing the popup
  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <>
      {isVisible && (
        <div className="notification-popup">
          <div className="popup-header">
            <h3>Invitaciones de Contacto</h3>
            <button onClick={handleClose}>Cerrar</button>
          </div>
          <div className="popup-body">
            {invitations.map((invite, index) => (
              <div key={index} className="invitation-item">
                <p><strong>{invite.from}</strong> te ha enviado una solicitud de contacto.</p>
                <div className="invitation-actions">
                  <button onClick={() => onAccept(invite)}>Aceptar</button>
                  <button onClick={() => onReject(invite)}>Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationPopup;