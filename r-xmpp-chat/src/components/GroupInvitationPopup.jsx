import React, { useState, useEffect } from 'react';
import './NotificationPopup.css';

function GroupInvitationPopup({ invitations, onAccept, onReject }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (invitations.length > 0) {
      setIsVisible(true);
    }
  }, [invitations]);

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <>
      {isVisible && (
        <div className="notification-popup">
          <div className="popup-header">
            <h3>Invitaciones de Grupo</h3>
            <button onClick={handleClose}>Cerrar</button>
          </div>
          <div className="popup-body">
            {invitations.map((invite, index) => (
              <div key={index} className="invitation-item">
                <p><strong>{invite.groupName}</strong> te ha invitado a unirte.</p>
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

export default GroupInvitationPopup;
