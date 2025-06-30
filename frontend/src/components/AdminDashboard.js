import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]); // This will be used for both list and dropdowns
  const [allCourses, setAllCourses] = useState([]); // All courses for dropdowns
  const [allEnrollments, setAllEnrollments] = useState([]); // New state for all enrollments

  // General message state for success/error alerts
  const [message, setMessage] = useState(''); // <-- Ensure this line is present
  const [messageType, setMessageType] = useState(''); // <-- Ensure this line is present

  // State for Add Student
  const [newStudentName, setNewStudentName] = useState('');
  const [addStudentMessage, setAddStudentMessage] = useState('');
  const [addStudentMessageType, setAddStudentMessageType] = useState('');

  // State for Edit Student Name
  const [editStudentId, setEditStudentId] = useState(''); // student_id string
  const [editStudentDbId, setEditStudentDbId] = useState(''); // student DB ID
  const [editStudentNewName, setEditStudentNewName] = useState('');
  const [editStudentMessage, setEditStudentMessage] = useState('');
  const [editStudentMessageType, setEditStudentMessageType] = useState('');

  // State for Add Lecturer
  const [newLecturerUsername, setNewLecturerUsername] = useState('');
  const [newLecturerPassword, setNewLecturerPassword] = useState('');
  const [newLecturerName, setNewLecturerName] = useState('');
  const [addLecturerMessage, setAddLecturerMessage] = useState('');
  const [addLecturerMessageType, setAddLecturerMessageType] = useState('');

  // State for Assign Lecturer to Course
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState(''); // Course Code
  const [selectedLecturerToAssign, setSelectedLecturerToAssign] = useState(''); // Lecturer DB ID
  const [assignLecturerMessage, setAssignLecturerMessage] = useState('');
  const [assignLecturerMessageType, setAssignLecturerMessageType] = useState('');


  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const storedAdminData = sessionStorage.getItem('adminData');
    if (storedAdminData) {
      const data = JSON.parse(storedAdminData);
      setAdminData(data);
      fetchAllData(); // Fetch all necessary data
    } else {
      navigate('/lecturer'); // Redirect to login if not authenticated as admin
    }
  }, [navigate]);

  const fetchAllData = () => {
    fetchStudents();
    fetchLecturersAndCourses();
    fetchAllCourses(); // For dropdowns
    fetchAllEnrollments(); // For new table
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/students`);
      if (response.data.success) {
        setStudents(response.data.students);
      } else {
        console.error('Error fetching students:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchLecturersAndCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/lecturers-courses`);
      if (response.data.success) {
        setLecturers(response.data.lecturers);
      } else {
        console.error('Error fetching lecturers and courses:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching lecturers and courses:', error);
    }
  };

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

  const fetchAllEnrollments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/all-enrollments`);
      if (response.data.success) {
        setAllEnrollments(response.data.enrollments);
      } else {
        console.error('Error fetching all enrollments:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching all enrollments:', error);
    }
  };


  // --- Handlers for Admin Actions ---

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddStudentMessage('');

    if (!newStudentName.trim()) {
      setAddStudentMessage('Student Name is required.');
      setAddStudentMessageType('error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/admin/add-student`, {
        studentName: newStudentName.trim()
      });

      if (response.data.success) {
        setAddStudentMessage(response.data.message);
        setAddStudentMessageType('success');
        setNewStudentName('');
        fetchStudents(); // Refresh student list
        fetchAllEnrollments(); // Enrollments might change too
      } else {
        setAddStudentMessage(response.data.message);
        setAddStudentMessageType('error');
      }
    } catch (error) {
      setAddStudentMessage('Error adding student.');
      setAddStudentMessageType('error');
      console.error('Add student error:', error);
    }
  };

  const handleEditStudentClick = (student) => {
    setEditStudentDbId(student.id);
    setEditStudentId(student.student_id);
    setEditStudentNewName(student.name);
    setEditStudentMessage('');
    setEditStudentMessageType('');
  };

  const handleEditStudentName = async (e) => {
    e.preventDefault();
    setEditStudentMessage('');

    if (!editStudentNewName.trim()) {
      setEditStudentMessage('New student name cannot be empty.');
      setEditStudentMessageType('error');
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/api/admin/student/${editStudentDbId}`, {
        newName: editStudentNewName.trim()
      });

      if (response.data.success) {
        setEditStudentMessage(response.data.message);
        setEditStudentMessageType('success');
        fetchStudents(); // Refresh student list
        fetchAllEnrollments(); // Enrollments might change (student name)
      } else {
        setEditStudentMessage(response.data.message);
        setEditStudentMessageType('error');
      }
    } catch (error) {
      setEditStudentMessage('Error updating student name.');
      setEditStudentMessageType('error');
      console.error('Edit student name error:', error);
    }
  };

  const handleAddLecturer = async (e) => {
    e.preventDefault();
    setAddLecturerMessage('');

    if (!newLecturerUsername.trim() || !newLecturerPassword.trim() || !newLecturerName.trim()) {
      setAddLecturerMessage('All lecturer fields are required.');
      setAddLecturerMessageType('error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/admin/add-lecturer`, {
        username: newLecturerUsername.trim(),
        password: newLecturerPassword,
        name: newLecturerName.trim()
      });

      if (response.data.success) {
        setAddLecturerMessage(response.data.message);
        setAddLecturerMessageType('success');
        setNewLecturerUsername('');
        setNewLecturerPassword('');
        setNewLecturerName('');
        fetchLecturersAndCourses(); // Refresh lecturer list
      } else {
        setAddLecturerMessage(response.data.message);
        setAddLecturerMessageType('error');
      }
    } catch (error) {
      setAddLecturerMessage('Error adding lecturer.');
      setAddLecturerMessageType('error');
      console.error('Add lecturer error:', error);
    }
  };

  const handleAssignLecturer = async (e) => {
    e.preventDefault();
    setAssignLecturerMessage('');

    if (!selectedCourseToAssign || !selectedLecturerToAssign) {
      setAssignLecturerMessage('Please select a course and a lecturer.');
      setAssignLecturerMessageType('error');
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/api/admin/course/${selectedCourseToAssign}/assign-lecturer`, {
        newLecturerId: selectedLecturerToAssign
      });

      if (response.data.success) {
        setAssignLecturerMessage(response.data.message);
        setAssignLecturerMessageType('success');
        setSelectedCourseToAssign('');
        setSelectedLecturerToAssign('');
        fetchLecturersAndCourses(); // Refresh lecturer list with updated courses
        fetchAllEnrollments(); // Enrollments lecturer names might change
      } else {
        setAssignLecturerMessage(response.data.message);
        setAssignLecturerMessageType('error');
      }
    } catch (error) {
      setAssignLecturerMessage('Error assigning lecturer to course.');
      setAssignLecturerMessageType('error');
      console.error('Assign lecturer error:', error);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm(`Are you sure you want to delete student with ID: ${studentId}? This will remove all their attendance records and enrollments.`)) {
      try {
        const response = await axios.delete(`${API_URL}/api/admin/student/${studentId}`);
        if (response.data.success) {
          setMessage(response.data.message); // Use general message area
          setMessageType('success');
          fetchStudents(); // Refresh student list
          fetchAllEnrollments(); // Refresh enrollments
        } else {
          setMessage(response.data.message); // Use general message area
          setMessageType('error');
        }
      } catch (error) {
        setMessage('Error deleting student.'); // Use general message area
        setMessageType('error');
        console.error('Delete student error:', error);
      }
    }
  };

  const handleDeleteLecturer = async (lecturerId) => {
    if (window.confirm(`Are you sure you want to delete this lecturer? This will also delete ALL their associated courses, attendance codes, attendance records, and student enrollments for those courses.`)) {
      try {
        const response = await axios.delete(`${API_URL}/api/admin/lecturer/${lecturerId}`);
        if (response.data.success) {
          setMessage(response.data.message); // Use general message area
          setMessageType('success');
          fetchLecturersAndCourses(); // Refresh list
          fetchAllCourses(); // Courses list might change if some were deleted
          fetchAllEnrollments(); // Enrollments might change
        } else {
          setMessage(response.data.message); // Use general message area
          setMessageType('error');
        }
      } catch (error) {
        setMessage('Error deleting lecturer.'); // Use general message area
        setMessageType('error');
        console.error('Delete lecturer error:', error);
      }
    }
  };

  const handleDeleteCourse = async (courseCode) => {
    if (window.confirm(`Are you sure you want to delete course ${courseCode}? This will remove all its attendance codes, attendance records, and student enrollments for this course.`)) {
      try {
        const response = await axios.delete(`${API_URL}/api/admin/course/${courseCode}`);
        if (response.data.success) {
          setMessage(response.data.message); // Use general message area
          setMessageType('success');
          fetchLecturersAndCourses(); // Refresh list
          fetchAllCourses(); // Refresh courses list
          fetchAllEnrollments(); // Enrollments might change
        } else {
          setMessage(response.data.message); // Use general message area
          setMessageType('error');
        }
      } catch (error) {
        setMessage('Error deleting course.'); // Use general message area
        setMessageType('error');
        console.error('Delete course error:', error);
      }
    }
  };


  const handleLogout = () => {
    sessionStorage.removeItem('adminData');
    sessionStorage.removeItem('lecturerData'); // Also clear lecturer data just in case
    sessionStorage.removeItem('studentData'); // Also clear student data just in case
    navigate('/lecturer'); // Redirect to login
  };

  if (!adminData) {
    return <div>Loading Admin Dashboard...</div>;
  }

  return (
    <div className="page-container">
      <button onClick={handleLogout} className="btn btn-secondary logout-btn">
        Logout
      </button>

      <h1 className="page-title">Admin Dashboard</h1>

      <div className="welcome-message">
        Welcome, {adminData.name}!
      </div>

      {/* General Message Area */}
      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      {/* Add New Student Section */}
      <div className="course-section">
        <h2 className="course-title">Add New Student</h2>
        {addStudentMessage && (
          <div className={`alert ${addStudentMessageType === 'success' ? 'alert-success' : 'alert-error'}`}>
            {addStudentMessage}
          </div>
        )}
        <form onSubmit={handleAddStudent}>
          <div className="form-group">
            <label className="form-label">Student Name:</label>
            <input
              type="text"
              className="form-input"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Enter student's full name"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Add Student
          </button>
        </form>
      </div>

      {/* List of All Students with Edit Functionality */}
      <div className="course-section">
        <h2 className="course-title">Registered Students</h2>
        {editStudentDbId && ( // Show edit form if a student is selected for editing
          <div className="edit-form-container" style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
            <h3>Edit Student: {editStudentId}</h3>
            {editStudentMessage && (
              <div className={`alert ${editStudentMessageType === 'success' ? 'alert-success' : 'alert-error'}`}>
                {editStudentMessage}
              </div>
            )}
            <form onSubmit={handleEditStudentName}>
              <div className="form-group">
                <label className="form-label">New Name:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editStudentNewName}
                  onChange={(e) => setEditStudentNewName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Update Name</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditStudentDbId('')} style={{ marginLeft: '10px' }}>Cancel</button>
            </form>
          </div>
        )}

        {students.length > 0 ? (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.student_id}</td>
                  <td>{student.name}</td>
                  <td>
                    <button
                      onClick={() => handleEditStudentClick(student)}
                      className="btn btn-secondary"
                      style={{ marginRight: '5px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.student_id)}
                      className="btn btn-error"
                      style={{ backgroundColor: '#e74c3c', color: 'white' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-records">No students registered yet.</div>
        )}
      </div>

      {/* Add New Lecturer Section */}
      <div className="course-section">
        <h2 className="course-title">Add New Lecturer</h2>
        {addLecturerMessage && (
          <div className={`alert ${addLecturerMessageType === 'success' ? 'alert-success' : 'alert-error'}`}>
            {addLecturerMessage}
          </div>
        )}
        <form onSubmit={handleAddLecturer}>
          <div className="form-group">
            <label className="form-label">Username:</label>
            <input
              type="text"
              className="form-input"
              value={newLecturerUsername}
              onChange={(e) => setNewLecturerUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password:</label>
            <input
              type="password"
              className="form-input"
              value={newLecturerPassword}
              onChange={(e) => setNewLecturerPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Name:</label>
            <input
              type="text"
              className="form-input"
              value={newLecturerName}
              onChange={(e) => setNewLecturerName(e.target.value)}
              placeholder="Enter lecturer's full name"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Add Lecturer
          </button>
        </form>
      </div>

      {/* Assign Lecturer to Course */}
      <div className="course-section">
        <h2 className="course-title">Assign Lecturer to Course</h2>
        {assignLecturerMessage && (
          <div className={`alert ${assignLecturerMessageType === 'success' ? 'alert-success' : 'alert-error'}`}>
            {assignLecturerMessage}
          </div>
        )}
        <form onSubmit={handleAssignLecturer}>
          <div className="form-group">
            <label className="form-label">Select Course:</label>
            <select
              className="form-input"
              value={selectedCourseToAssign}
              onChange={(e) => setSelectedCourseToAssign(e.target.value)}
              required
            >
              <option value="">-- Select a Course --</option>
              {allCourses.map(course => (
                <option key={course.id} value={course.code}>{course.name} ({course.code})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select Lecturer:</label>
            <select
              className="form-input"
              value={selectedLecturerToAssign}
              onChange={(e) => setSelectedLecturerToAssign(e.target.value)}
              required
            >
              <option value="">-- Select a Lecturer --</option>
              {lecturers.map(lecturer => (
                <option key={lecturer.id} value={lecturer.id}>{lecturer.name} ({lecturer.username})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Assign Lecturer
          </button>
        </form>
      </div>

      {/* List of Lecturers and their Courses (includes Delete Lecturer/Course) */}
      <div className="course-section">
        <h2 className="course-title">Lecturers and Their Courses</h2>
        {lecturers.length > 0 ? (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Lecturer Name</th>
                <th>Username</th>
                <th>Courses Taught</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lecturers.map((lecturer, index) => (
                <tr key={lecturer.id}>
                  <td>{index + 1}</td>
                  <td>{lecturer.name}</td>
                  <td>{lecturer.username}</td>
                  <td>
                    {lecturer.courses.length > 0 ? (
                      <ul>
                        {lecturer.courses.map((course) => (
                          <li key={course.code}>
                            {course.name} ({course.code})
                            <button
                                onClick={() => handleDeleteCourse(course.code)}
                                className="btn btn-error"
                                style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    marginLeft: '10px',
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.8rem'
                                }}
                            >
                                Delete Course
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'No courses assigned.'
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteLecturer(lecturer.id)}
                      className="btn btn-error"
                      style={{backgroundColor: '#e74c3c', color: 'white'}}
                    >
                      Delete Lecturer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-records">No lecturers registered.</div>
        )}
      </div>

      {/* List of All Students and Their Enrollments */}
      <div className="course-section">
        <h2 className="course-title">All Student Enrollments by Course</h2>
        {allEnrollments.length > 0 ? (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Lecturer</th>
                <th>Student ID</th>
                <th>Student Name</th>
              </tr>
            </thead>
            <tbody>
              {allEnrollments.map((enrollment, index) => (
                <tr key={index}> {/* Use index as key if no unique ID from enrollment */}
                  <td>{index + 1}</td>
                  <td>{enrollment.courseCode}</td>
                  <td>{enrollment.courseName}</td>
                  <td>{enrollment.lecturerName}</td>
                  <td>{enrollment.student_id}</td>
                  <td>{enrollment.studentName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-records">No students enrolled in any courses yet.</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
