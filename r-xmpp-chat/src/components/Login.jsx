import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { initializeXMPP } from '../services/xmppClient';
import logo from '../assets/FabsChat-Logo.png';

function Login() {
  // State to manage the username input
  const [username, setUsername] = useState('');
  // State to manage the password input
  const [password, setPassword] = useState('');
  // Hook to enable navigation to different routes
  const navigate = useNavigate();

  // Function to handle the login process when the form is submitted
  const handleLogin = (event) => {
    event.preventDefault(); // Prevent the default form submission behavior

    // Check if both username and password are provided
    if (username && password) {
      try {

        // Attempt to initialize the XMPP connection with the provided credentials
        initializeXMPP(username, password)
          .then(() => {
            // On successful login, navigate to the chat page
            navigate('/chat');
          })
          .catch((error) => {
            // Handle login failure (e.g., incorrect credentials)
            alert('Error al intentar iniciar sesión: Usuario o contraseña incorrectos');
          });
      } catch (error) {
        // Handle any unexpected errors during the login process
        alert('Error al intentar iniciar sesión: ' + error.message);
      }
    } else {
      // Alert the user if the username or password is missing
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
      </form>
      <div className="createAccount">
        <a href="/SignUp" className="createAccountLink">Create an Account</a>
      </div>
    </div>
  );
}

export default Login;
