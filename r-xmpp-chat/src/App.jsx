import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Chat from './components/Chat';

function App() {
  const [username, setUsername] = useState('');

  const handleLogin = (username) => {
    setUsername(username);
  };

  const handleSignUp = (username) => {
    setUsername(username);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Chat />}/>
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;
