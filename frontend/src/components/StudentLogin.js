import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentLogin = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API_URL}/api/student/login`, {
        studentId: studentId.trim(),
        password: password
      });

      if (response.data.success) {
        sessionStorage.setItem('studentData', JSON.stringify(response.data.student));
        setMessage('Login successful! Redirecting...');
        navigate('/student/dashboard'); // Redirect to student dashboard/page
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error during login');
      console.error('Student login error:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="page-container">
        <h1 className="page-title">Student Login</h1>
        
        {message && (
          <div className={`alert ${message.includes('successful') ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Student ID:</label>
            <input
              type="text"
              className="form-input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              placeholder="Enter your Student ID (e.g., S-001)"
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
              placeholder="Enter your password (e.g., 100-S)"
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

export default StudentLogin;