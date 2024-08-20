import React, { useState } from 'react';
import './SignUp.css';
import { signUp, simpleXMPPLogin, logout } from '../services/xmppClient';
import { useNavigate } from 'react-router-dom'; // Para redirigir después del registro
import logo from '../assets/FabsChat-Logo.png';

function SignUp() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleSignUp = async () => {
  if (username && fullName && email && password) {
    try {
      console.log('Iniciando conexión con XMPP...');
      await simpleXMPPLogin('jua21440', 'Redes-2024');
      console.log('Sesión iniciada con jua21440');

      console.log('Intentando registrar un nuevo usuario...');
      await signUp(username, fullName, email, password);

      console.log('Cuenta creada exitosamente:', username);
      alert('Registro exitoso. Ahora puedes iniciar sesión.');
      
      console.log('Cerrando sesión...');
      await logout();

      navigate('/');
    } catch (error) {
      console.error('Error durante el registro:', error);
      alert('Error durante el registro: ' + error.message);
    }
  } else {
    alert('Por favor, completa todos los campos.');
  }
};

  const handleBack = () => {
    navigate('/'); // Redirige a la página de Login
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