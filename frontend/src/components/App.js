import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import StudentPage from './components/StudentPage';
import StudentLogin from './components/StudentLogin'; // Import new StudentLogin
import StudentChangePassword from './components/StudentChangePassword'; // Import new StudentChangePassword
import LecturerLogin from './components/LecturerLogin';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">Attendance System</h1>
            <div className="nav-links">
              <Link to="/student/login" className="nav-link">Student</Link> {/* Link to student login */}
              <Link to="/lecturer" className="nav-link">Lecturer</Link>
              <Link to="/admin" className="nav-link">Admin</Link>
            </div>
          </div>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<StudentLogin />} /> {/* Default route to student login */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/dashboard" element={<StudentPage />} /> {/* StudentPage now serves as dashboard */}
            <Route path="/student/change-password" element={<StudentChangePassword />} /> {/* New password change route */}
            
            <Route path="/lecturer" element={<LecturerLogin />} />
            <Route path="/admin" element={<LecturerLogin />} /> {/* Admin uses same login form */}
            
            <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;