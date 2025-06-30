import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LecturerDashboard = () => {
  const [lecturerData, setLecturerData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [currentCodes, setCurrentCodes] = useState({});
  const [enrolledStudentsPerCourse, setEnrolledStudentsPerCourse] = useState({}); // New state for enrolled students
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const storedLecturerData = sessionStorage.getItem('lecturerData');
    const storedAdminData = sessionStorage.getItem('adminData');

    if (storedAdminData) {
      navigate('/admin/dashboard'); // If admin is logged in, redirect them to admin dashboard
    } else if (storedLecturerData) {
      const data = JSON.parse(storedLecturerData);
      setLecturerData(data);
      loadAttendanceData(data.courses);
      loadCurrentCodes(data.courses);
      loadEnrolledStudents(data.courses); // Load enrolled students for each course
    } else {
      navigate('/lecturer'); // No valid session, redirect to login
    }
  }, [navigate]);

  const loadAttendanceData = async (courses) => {
    const records = {};
    for (const course of courses) {
      try {
        const response = await axios.get(`${API_URL}/api/lecturer/attendance/${course.code}`);
        if (response.data.success) {
          records[course.code] = response.data.records;
        }
      } catch (error) {
        console.error(`Error loading attendance data for ${course.code}:`, error);
      }
    }
    setAttendanceRecords(records);
  };

  const loadCurrentCodes = async (courses) => {
    const codes = {};
    for (const course of courses) {
      try {
        const response = await axios.get(`${API_URL}/api/lecturer/current-code/${course.code}`);
        if (response.data.success) {
          codes[course.code] = response.data.code;
        }
      } catch (error) {
        console.error(`Error loading current codes for ${course.code}:`, error);
      }
    }
    setCurrentCodes(codes);
  };

  const loadEnrolledStudents = async (courses) => {
    const studentsData = {};
    for (const course of courses) {
      try {
        const response = await axios.get(`${API_URL}/api/lecturer/enrolled-students/${course.id}`); // Use course.id
        if (response.data.success) {
          studentsData[course.code] = response.data.students;
        }
      } catch (error) {
        console.error(`Error loading enrolled students for ${course.code}:`, error);
      }
    }
    setEnrolledStudentsPerCourse(studentsData);
  };

  const generateAttendanceCode = async (courseCode) => {
    try {
      const response = await axios.post(`${API_URL}/api/lecturer/generate-code`, {
        courseCode: courseCode,
        lecturerId: lecturerData.id // Use lecturer's DB ID
      });

      if (response.data.success) {
        setCurrentCodes(prev => ({
          ...prev,
          [courseCode]: response.data.code
        }));
        
        loadAttendanceData(lecturerData.courses); // Refresh attendance data
      } else {
        console.error('Failed to generate code:', response.data.message);
      }
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lecturerData');
    navigate('/lecturer');
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!lecturerData) {
    return <div>Loading Lecturer Dashboard...</div>;
  }

  return (
    <div className="page-container">
      <button onClick={handleLogout} className="btn btn-secondary logout-btn">
        Logout
      </button>
      
      <div className="welcome-message">
        Welcome to Your Class {lecturerData.name}
      </div>

      {lecturerData.courses.map((course) => (
        <div key={course.code} className="course-section">
          <div className="course-header">
            <h2 className="course-title">{course.name} ({course.code})</h2>
            <button 
              onClick={() => generateAttendanceCode(course.code)}
              className="btn btn-success"
            >
              Generate New Code
            </button>
          </div>

          {currentCodes[course.code] && (
            <div className="current-code">
              Current Attendance Code: {currentCodes[course.code]}
            </div>
          )}

          {/* Enrolled Students List for this Course */}
          <h3>Students Enrolled in {course.code}</h3>
          {enrolledStudentsPerCourse[course.code] && enrolledStudentsPerCourse[course.code].length > 0 ? (
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Student ID</th>
                  <th>Student Name</th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudentsPerCourse[course.code].map((student, index) => (
                  <tr key={student.student_id}>
                    <td>{index + 1}</td>
                    <td>{student.student_id}</td>
                    <td>{student.studentName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-records">No students enrolled in this course yet.</div>
          )}

          {/* Student Attendance Records */}
          <h3 style={{ marginTop: '20px' }}>Student Attendance Records</h3>
          {attendanceRecords[course.code] && attendanceRecords[course.code].length > 0 ? (
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Student Name</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords[course.code].map((record, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{record.studentName}</td>
                    <td>{formatTimestamp(record.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-records">
              No attendance records yet
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LecturerDashboard;