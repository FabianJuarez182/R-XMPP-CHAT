import React, { useState } from 'react';

function SignUp() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    if (username && password) {
      await signUp(username, password);
      // Navegar al login o manejar el estado
    } else {
      alert('Por favor, ingresa nombre de usuario y contraseña.');
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignUp}>Sign Up</button>
    </div>
  );
}

export default SignUp;
