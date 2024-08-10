import React, { useEffect, useState } from 'react';
import { fetchContacts } from '../services/xmppClient'; // Debes implementar esta función

function Contacts() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    async function loadContacts() {
      const contactsList = await fetchContacts();
      setContacts(contactsList);
    }
    loadContacts();
  }, []);

  return (
    <div>
      <h2>Contactos</h2>
      <ul>
        {contacts.map(contact => (
          <li key={contact.jid}>{contact.jid} - {contact.status}</li>
        ))}
      </ul>
    </div>
  );
}

export default Contacts;
