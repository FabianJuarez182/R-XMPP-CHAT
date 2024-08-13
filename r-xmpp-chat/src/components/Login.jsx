import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { initializeXMPP } from '../services/xmppClient';
import logo from '../assets/FabsChat-Logo.png';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (event) => {
    event.preventDefault();

    if (username && password) {
      try {
        initializeXMPP(username, password)
          .then(() => {
            alert('Conectado exitosamente');
            navigate('/chat');
          })
          .catch((error) => {
            alert('Error al intentar iniciar sesión: Usuario o contraseña incorrectos');
          });
      } catch (error) {
        alert('Error al intentar iniciar sesión: ' + error.message);
      }
    } else {
      alert('Por favor, ingresa tu nombre de usuario y contraseña.');
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleLogin} className="form">
        <img src={logo} alt="Logo" className="logo" />
        <h2 className="title">Log in</h2>
        <div className="inputGroup">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
          />
        </div>
        <div className="inputGroup">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" className="button">Log in</button>
        <div className="linkGroup">
          <a href="#" className="link">Forgot Password?</a>
        </div>
      </form>
      <div className="createAccount">
        <a href="/SignUp" className="createAccountLink">Create an Account</a>
      </div>
    </div>
  );
}

export default Login;
