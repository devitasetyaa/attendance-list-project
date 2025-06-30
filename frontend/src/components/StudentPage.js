import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import axios from 'axios';

const StudentPage = () => {
  const [studentData, setStudentData] = useState(null); // Logged in student data
  const [courseCode, setCourseCode] = useState('');
  const [courseInfo, setCourseInfo] = useState(null);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const storedStudentData = sessionStorage.getItem('studentData');
    if (storedStudentData) {
      const data = JSON.parse(storedStudentData);
      setStudentData(data);
      fetchAllCourses();
      fetchEnrolledCourses(data.id); // Fetch enrolled courses for the logged-in student
    } else {
      navigate('/student/login'); // Redirect to student login if not authenticated
    }
  }, [navigate]);

  const fetchAllCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/courses`);
      if (response.data.success) {
        setAllCourses(response.data.courses);
      } else {
        console.error('Error fetching all courses:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching all courses:', error);
    }
  };

  const fetchEnrolledCourses = async (studentDbId) => {
    try {
      const response = await axios.get(`${API_URL}/api/student/enrollments/${studentDbId}`);
      if (response.data.success) {
        setEnrolledCourses(response.data.enrollments);
      } else {
        setEnrolledCourses([]);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      setEnrolledCourses([]);
    }
  };

  const handleCourseCodeChange = async (e) => {
    const code = e.target.value.toUpperCase();
    setCourseCode(code);
    
    if (code) {
      try {
        const response = await axios.get(`${API_URL}/api/course/${code}`);
        if (response.data.success) {
          setCourseInfo(response.data.course);
          setMessage('');
        } else {
          setCourseInfo(null);
          setMessage('Course not found');
          setMessageType('error');
        }
      } catch (error) {
        setCourseInfo(null);
        setMessage('Error fetching course information');
        setMessageType('error');
      }
    } else {
      setCourseInfo(null);
      setMessage('');
    }
  };

  const handleEnrollCourse = async (selectedCourseId, selectedCourseCode) => {
    if (!studentData) { // Should not happen if page is protected, but good check
      setMessage('Please log in to enroll.');
      setMessageType('error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/student/enroll-course`, {
        studentDbId: studentData.id, // Use student's DB ID
        courseCode: selectedCourseCode
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        fetchEnrolledCourses(studentData.id); // Refresh enrolled courses
      } else {
        setMessage(response.data.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error enrolling in course');
      setMessageType('error');
      console.error('Enrollment error:', error);
    }
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();

    if (!studentData || !courseInfo || !attendanceCode.trim()) {
      setMessage('Please ensure all fields are filled and you are logged in.');
      setMessageType('error');
      return;
    }

    // Check if the student is enrolled in this course before submitting attendance
    const isEnrolled = enrolledCourses.some(course => course.code === courseCode);
    if (!isEnrolled) {
      setMessage('You are not enrolled in this course. Please enroll first.');
      setMessageType('error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/attendance`, {
        studentId: studentData.student_id, // Use student's public ID for attendance
        courseCode: courseCode,
        attendanceCode: attendanceCode.trim()
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        
        // Reset attendance form after 2 seconds
        setTimeout(() => {
          setCourseCode('');
          setCourseInfo(null);
          setAttendanceCode('');
          setMessage('');
        }, 2000);
      } else {
        setMessage(response.data.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error submitting attendance');
      setMessageType('error');
      console.error('Attendance submission error:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('studentData');
    navigate('/student/login');
  };

  if (!studentData) {
    return <div>Loading Student Dashboard...</div>;
  }

  return (
    <div className="page-container">
      <button onClick={handleLogout} className="btn btn-secondary logout-btn">
        Logout
      </button>

      <h1 className="page-title">Student Dashboard</h1>
      <div className="welcome-message">
        Welcome, {studentData.name} ({studentData.student_id})!
        <Link to="/student/change-password" className="nav-link" style={{ marginLeft: '1rem', display: 'inline-block', backgroundColor: '#6c757d', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', color: 'white' }}>
          Change Password
        </Link>
      </div>
      
      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      {/* Enrolled Courses List */}
      <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.5rem' }}>Your Enrolled Courses</h2>
      {enrolledCourses.length > 0 ? (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Lecturer</th>
            </tr>
          </thead>
          <tbody>
            {enrolledCourses.map((course, index) => (
              <tr key={course.courseId}>
                <td>{index + 1}</td>
                <td>{course.code}</td>
                <td>{course.name}</td>
                <td>{course.lecturerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-records">You are not enrolled in any courses yet.</div>
      )}


      {/* Enrollment Section */}
      <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.5rem' }}>Enroll in a New Course</h2>
      {allCourses.length > 0 ? (
        <div className="course-list">
          {allCourses.map((course) => {
            const isEnrolled = enrolledCourses.some(enrolled => enrolled.code === course.code);

            return (
              <div key={course.id} className="course-info" style={{ marginBottom: '1rem' }}>
                <p><strong>Code:</strong> {course.code}</p>
                <p><strong>Name:</strong> {course.name}</p>
                {!isEnrolled ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleEnrollCourse(course.id, course.code)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Enroll
                  </button>
                ) : (
                  <button className="btn btn-secondary" disabled style={{ marginTop: '0.5rem' }}>
                    Enrolled
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-records">No courses available for enrollment.</div>
      )}

      {/* Attendance Section */}
      <h2 className="page-title" style={{ marginTop: '2rem', fontSize: '1.5rem' }}>Mark Attendance</h2>
      <form onSubmit={handleSubmitAttendance}>
        <div className="form-group">
          <label className="form-label">Course Code:</label>
          <input
            type="text"
            className="form-input"
            value={courseCode}
            onChange={handleCourseCodeChange}
            placeholder="Enter course code (e.g., OSD-001)"
            maxLength={7}
          />
        </div>

        {courseInfo && (
          <div className="course-info">
            <div className="form-group">
              <label className="form-label">Course Name:</label>
              <input
                type="text"
                className="form-input"
                value={courseInfo.name}
                readOnly
              />
            </div>
          </div>
        )}

        {courseInfo && (
          <>
            <div className="form-group">
              <label className="form-label">Attendance Code:</label>
              <input
                type="text"
                className="form-input"
                value={attendanceCode}
                onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                placeholder="Enter attendance code from lecturer"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Submit Attendance
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default StudentPage;