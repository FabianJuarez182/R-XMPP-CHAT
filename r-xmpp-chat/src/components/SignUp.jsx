import React, { useState } from 'react';
import './SignUp.css';
import { signUp, simpleXMPPLogin, logout } from '../services/xmppClient';
import { useNavigate } from 'react-router-dom'; // Para redirigir después del registro
import logo from '../assets/FabsChat-Logo.png';

function SignUp() {
  // State to manage the username input
  const [username, setUsername] = useState('');
  // State to manage the full name input
  const [fullName, setFullName] = useState('');
  // State to manage the email input
  const [email, setEmail] = useState('');
  // State to manage the password input
  const [password, setPassword] = useState('');
  // Hook to enable navigation to different routes
  const navigate = useNavigate();

// Function to handle the sign-up process
const handleSignUp = async () => {
  // Check if all required fields are filled
  if (username && fullName && email && password) {
    try {
      await simpleXMPPLogin('jua21440', 'Redes-2024');

      // Register the new user with the provided details
      await signUp(username, fullName, email, password);

      alert('Registro exitoso. Ahora puedes iniciar sesión.');

      await logout();

      navigate('/');
    } catch (error) {
      // Handle any errors during the sign-up process
      console.error('Error durante el registro:', error);
      alert('Error durante el registro: ' + error.message);
    }
  } else {
    // Alert the user if any fields are missing
    alert('Por favor, completa todos los campos.');
  }
};

  // Function to handle navigation back to the login page
  const handleBack = () => {
    navigate('/'); // Redirect to the login page
  };

  return (
    <div className="container">
      <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }} className="form">
        <img src={logo} alt="Logo" className="logo" />
        <h2 className="title">Create Account</h2>
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
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
        </div>
        <div className="inputGroup">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <button type="submit" className="button">Sign Up</button>
      </form>
      <button type="back" className="back" onClick={handleBack}>Back</button>
    </div>
  );
}

export default SignUp;