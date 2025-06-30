import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LecturerLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API_URL}/api/lecturer/login`, {
        username: username.trim(),
        password: password
      });

      if (response.data.success) {
        const userData = response.data.user; // Changed from .lecturer to .user
        if (userData.username.toLowerCase() === 'admin') {
          sessionStorage.setItem('adminData', JSON.stringify(userData));
          sessionStorage.removeItem('lecturerData'); // Clear other session data
          sessionStorage.removeItem('studentData');
          navigate('/admin/dashboard');
        } else {
          sessionStorage.setItem('lecturerData', JSON.stringify(userData));
          sessionStorage.removeItem('adminData'); // Clear other session data
          sessionStorage.removeItem('studentData');
          navigate('/lecturer/dashboard');
        }
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error during login');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="page-container">
        <h1 className="page-title">{window.location.pathname === '/admin' ? 'Admin Login' : 'Lecturer Login'}</h1>
        
        {message && (
          <div className={`alert ${message.includes('successful') ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username:</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password:</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LecturerLogin;