import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentChangePassword = () => {
  const [studentData, setStudentData] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const storedStudentData = sessionStorage.getItem('studentData');
    if (storedStudentData) {
      setStudentData(JSON.parse(storedStudentData));
    } else {
      navigate('/student/login'); // Redirect to student login if not authenticated
    }
  }, [navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmNewPassword) {
      setMessage('New password and confirmation do not match.');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 4) { // Simple validation
        setMessage('New password must be at least 4 characters long.');
        setMessageType('error');
        return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/student/change-password`, {
        studentId: studentData.student_id,
        oldPassword: oldPassword,
        newPassword: newPassword
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        // Update stored password if your app logic uses it directly
        // const updatedStudentData = { ...studentData, password: newPassword };
        // sessionStorage.setItem('studentData', JSON.stringify(updatedStudentData));
      } else {
        setMessage(response.data.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error changing password.');
      setMessageType('error');
      console.error('Change password error:', error);
    }
  };

  if (!studentData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-container"> {/* Reusing login-container styles */}
      <div className="page-container">
        <h1 className="page-title">Change Password for {studentData.name} ({studentData.student_id})</h1>
        
        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Old Password:</label>
            <input
              type="password"
              className="form-input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter your old password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password:</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password:</label>
            <input
              type="password"
              className="form-input"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentChangePassword;