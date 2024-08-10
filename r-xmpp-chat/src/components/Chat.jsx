import React, { useState, useEffect } from 'react';
import { sendMessage, setPresenceOnline, setPresenceAway, getConnectionStatus } from '../services/xmppClient';

function Chat() {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true); // Inicialmente online
  const [timeoutId, setTimeoutId] = useState(null);

  const handleSendMessage = async () => {
    if (to && message) {
      try {
        await sendMessage(to, message);
        setMessage('');
        alert(`Mensaje enviado a ${to}`);
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        alert('Error al enviar el mensaje. Inténtalo de nuevo.');
      }
    } else {
      alert('Por favor, ingresa un destinatario y un mensaje.');
    }
  };

  useEffect(() => {
    const handleMouseMove = async () => {
      if (!isOnline) {
        await setPresenceOnline();
        setIsOnline(true);
      }
      resetTimeout();
    };

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(async () => {
        await setPresenceAway();
        setIsOnline(false);
      }, 5000); // 5 segundos de inactividad
      setTimeoutId(newTimeoutId);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOnline, timeoutId]);

  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (getConnectionStatus()) {
        setIsOnline(true);
        clearInterval(checkConnection);
      }
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);


  return (
    <div>
        <h2>Chat</h2>
        <p>{isOnline ? 'Estás online' : 'Estás away'}</p>
        <input
            type="text"
            placeholder="Send to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
        />
        <input
            type="text"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}

export default Chat;
