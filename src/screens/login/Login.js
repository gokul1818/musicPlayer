import React, { useState } from 'react';
import "./styles.css"
import { account } from '../../appwrite';
import { useNavigate } from 'react-router';
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const handleSignUp = async () => {
    try {
      await account.create("unique()", email, password);
      navigate('/home'); 
      alert('User signed up successfully!');
    } catch (error) {
      console.error('Sign Up Error:', error);
      alert('Error signing up: ' + error.message);
    }
  };

  const handleLogin = async () => {
    try {
      await account.createSession(email, password);
      alert('User logged in successfully!');
    } catch (error) {
      console.error('Login Error:', error);
      alert('Error logging in: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      alert('User logged out successfully!');
    } catch (error) {
      console.error('Logout Error:', error);
      alert('Error logging out: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Appwrite Authentication</h1>
      <div className="form-group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="input-field"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="input-field"
        />
      </div>
      <div className="button-group">
        <button onClick={handleSignUp} className="button">Sign Up</button>
        <button onClick={handleLogin} className="button">Login</button>
        <button onClick={handleLogout} className="button">Logout</button>
      </div>
    </div>
  );
}

export default Login;
