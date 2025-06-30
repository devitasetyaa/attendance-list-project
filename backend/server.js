const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Import mysql2 with promise support

const app = express();
const PORT = process.env.PORT || 5000;

// Database configuration from environment variables
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root_password';
const DB_NAME = process.env.DB_NAME || 'attendance_db';

let pool; // Declare pool globally

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to reverse a string (for student passwords)
function reverseString(str) {
  return str.split('').reverse().join('');
}

// Function to initialize database and create tables
async function initializeDatabase() {
  try {
    // Create the database if it doesn't exist
    const connectionWithoutDb = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD
    });
    await connectionWithoutDb.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connectionWithoutDb.end();

    // Create a connection pool to the specified database
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Connected to MySQL database.');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lecturers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        lecturer_id INT,
        FOREIGN KEY (lecturer_id) REFERENCES lecturers(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        course_id INT,
        UNIQUE KEY student_course_unique (student_id, course_id),
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        code VARCHAR(6) NOT NULL,
        timestamp BIGINT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        course_id INT,
        timestamp BIGINT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    console.log('Tables checked/created successfully.');

    // Seed initial data if tables are empty
    const [lecturersCount] = await pool.query('SELECT COUNT(*) AS count FROM lecturers');
    if (lecturersCount[0].count === 0) {
      console.log('Seeding initial lecturer data...');
      await pool.query("INSERT INTO lecturers (username, password, name) VALUES ('nur', 'password', 'Sir Nur')");
      await pool.query("INSERT INTO lecturers (username, password, name) VALUES ('rikip', 'password', 'Sir Rikip')");
      await pool.query("INSERT INTO lecturers (username, password, name) VALUES ('fadhil', 'password', 'Sir Fadhil')");
      await pool.query("INSERT INTO lecturers (username, password, name) VALUES ('mark', 'password', 'Sir Mark')");
      // Add admin user
      await pool.query("INSERT INTO lecturers (username, password, name) VALUES ('admin', 'password', 'Administrator')");
      console.log('Lecturer data seeded.');
    }

    const [coursesCount] = await pool.query('SELECT COUNT(*) AS count FROM courses');
    if (coursesCount[0].count === 0) {
      console.log('Seeding initial course data...');
      const [sirNur] = await pool.query("SELECT id FROM lecturers WHERE username = 'nur'");
      const [sirRikip] = await pool.query("SELECT id FROM lecturers WHERE username = 'rikip'");
      const [sirFadhil] = await pool.query("SELECT id FROM lecturers WHERE username = 'fadhil'");
      const [sirMark] = await pool.query("SELECT id FROM lecturers WHERE username = 'mark'");

      await pool.query("INSERT INTO courses (code, name, lecturer_id) VALUES ('OSD-001', 'Operating System Design', ?)", [sirNur[0].id]);
      await pool.query("INSERT INTO courses (code, name, lecturer_id) VALUES ('FLA-002', 'Formal Language and Automata', ?)", [sirRikip[0].id]);
      await pool.query("INSERT INTO courses (code, name, lecturer_id) VALUES ('DPS-003', 'Data Processing and Storage', ?)", [sirFadhil[0].id]);
      await pool.query("INSERT INTO courses (code, name, lecturer_id) VALUES ('PE-004', 'Physical Education', ?)", [sirMark[0].id]);
      console.log('Course data seeded.');
    }

    // Seed initial student data (with passwords as reversed student IDs)
    const [studentsCount] = await pool.query('SELECT COUNT(*) AS count FROM students');
    if (studentsCount[0].count === 0) {
      console.log('Seeding initial student data...');
      await pool.query("INSERT INTO students (student_id, name, password) VALUES ('S-001', 'Alice Johnson', ?)", [reverseString('S-001')]);
      await pool.query("INSERT INTO students (student_id, name, password) VALUES ('S-002', 'Bob Smith', ?)", [reverseString('S-002')]);
      console.log('Student data seeded.');
    }

  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1); // Exit if database connection fails
  }
}

// Generate random 6-digit code
function generateAttendanceCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Routes

// Get all courses (for student enrollment page)
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, code, name FROM courses');
    res.json({ success: true, courses: rows });
  } catch (error) {
    console.error('Error fetching all courses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get course info by code (for students, without lecturer info initially)
app.get('/api/course/:code', async (req, res) => {
  const courseCode = req.params.code.toUpperCase();
  try {
    const [rows] = await pool.query('SELECT id, code, name FROM courses WHERE code = ?', [courseCode]);
    if (rows.length > 0) {
      res.json({
        success: true,
        course: {
          id: rows[0].id,
          code: rows[0].code,
          name: rows[0].name
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Course not found'
      });
    }
  } catch (error) {
    console.error('Error fetching course information:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit attendance (student)
app.post('/api/attendance', async (req, res) => {
  const { studentId, courseCode, attendanceCode } = req.body; // Expecting studentId now

  try {
    const [courseRows] = await pool.query('SELECT id FROM courses WHERE code = ?', [courseCode]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Invalid course code' });
    }
    const courseId = courseRows[0].id;

    const [studentRows] = await pool.query('SELECT id, name FROM students WHERE student_id = ?', [studentId]);
    if (studentRows.length === 0) {
      return res.json({ success: false, message: 'Student not found.' }); // Simplified message
    }
    const studentDbId = studentRows[0].id;
    const studentName = studentRows[0].name; // Get current name from DB

    // Check if attendance code is valid and not expired
    const [codeRows] = await pool.query('SELECT code, timestamp FROM attendance_codes WHERE course_id = ? ORDER BY timestamp DESC LIMIT 1', [courseId]);
    if (codeRows.length === 0 || codeRows[0].code !== attendanceCode) {
      return res.json({ success: false, message: 'Invalid attendance code' });
    }

    const validCode = codeRows[0];
    const codeAge = Date.now() - validCode.timestamp;
    if (codeAge > 3600000) { // 1 hour in milliseconds
      return res.json({ success: false, message: 'Attendance code has expired' });
    }

    // Check if student already attended for this course
    const [existingRecord] = await pool.query('SELECT * FROM attendance_records WHERE student_id = ? AND course_id = ?', [studentDbId, courseId]);
    if (existingRecord.length > 0) {
      return res.json({ success: false, message: 'You have already marked attendance for this class' });
    }

    // Add attendance record
    await pool.query('INSERT INTO attendance_records (student_id, course_id, timestamp) VALUES (?, ?, ?)', [studentDbId, courseId, Date.now()]);

    res.json({ success: true, message: `Valid Absence for ${studentName}, Good Luck for Your Class!` });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Student Login
app.post('/api/student/login', async (req, res) => {
  const { studentId, password } = req.body;

  try {
    const [studentRows] = await pool.query('SELECT id, student_id, name, password FROM students WHERE student_id = ?', [studentId.toUpperCase()]);
    if (studentRows.length > 0) {
      const student = studentRows[0];
      // Password check: stored password vs. entered password
      if (student.password === password) {
        res.json({
          success: true,
          student: {
            id: student.id,
            student_id: student.student_id,
            name: student.name
          }
        });
      } else {
        res.json({ success: false, message: 'Invalid Student ID or password.' });
      }
    } else {
      res.json({ success: false, message: 'Invalid Student ID or password.' });
    }
  } catch (error) {
    console.error('Error during student login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Student Change Password
app.post('/api/student/change-password', async (req, res) => {
  const { studentId, oldPassword, newPassword } = req.body;

  try {
    const [studentRows] = await pool.query('SELECT id, password FROM students WHERE student_id = ?', [studentId.toUpperCase()]);
    if (studentRows.length === 0) {
      return res.json({ success: false, message: 'Student not found.' });
    }
    const studentDbId = studentRows[0].id;
    const currentPassword = studentRows[0].password;

    if (currentPassword !== oldPassword) {
      return res.json({ success: false, message: 'Incorrect old password.' });
    }

    await pool.query('UPDATE students SET password = ? WHERE id = ?', [newPassword, studentDbId]);
    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Error changing student password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Student enroll in a course
app.post('/api/student/enroll-course', async (req, res) => {
  const { studentDbId, courseCode } = req.body; // Expecting student's DB ID now

  try {
    // Find student
    const [studentRows] = await pool.query('SELECT name FROM students WHERE id = ?', [studentDbId]);
    if (studentRows.length === 0) {
      return res.json({ success: false, message: 'Student not found.' });
    }
    const studentName = studentRows[0].name;

    // Find course and its lecturer
    const [courseRows] = await pool.query('SELECT id, name, lecturer_id FROM courses WHERE code = ?', [courseCode.toUpperCase()]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Course not found.' });
    }
    const course = courseRows[0];
    const courseId = course.id;

    // Check if student is already enrolled in this course
    const [enrollmentRows] = await pool.query('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?', [studentDbId, courseId]);
    if (enrollmentRows.length > 0) {
      return res.json({ success: false, message: 'You are already enrolled in this course.' });
    }

    // Enroll student
    await pool.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [studentDbId, courseId]);

    // Get lecturer name for the enrolled course
    const [lecturerRows] = await pool.query('SELECT name FROM lecturers WHERE id = ?', [course.lecturer_id]);
    const lecturerName = lecturerRows.length > 0 ? lecturerRows[0].name : 'N/A';

    res.json({
      success: true,
      message: `Successfully enrolled in ${course.name}. Your lecturer is ${lecturerName}.`,
      enrolledCourse: {
        code: course.code,
        name: course.name,
        lecturer: lecturerName
      }
    });

  } catch (error) {
    // Handle unique constraint violation for student_course_unique key
    if (error.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'You are already enrolled in this course.' });
    }
    console.error('Error enrolling student:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get student's enrollments (after login)
app.get('/api/student/enrollments/:studentDbId', async (req, res) => {
  const studentDbId = req.params.studentDbId;

  try {
    const [enrollments] = await pool.query(`
      SELECT c.code, c.name, l.name AS lecturerName, c.id AS courseId
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN lecturers l ON c.lecturer_id = l.id
      WHERE e.student_id = ?
    `, [studentDbId]);

    res.json({ success: true, enrollments: enrollments });
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Lecturer login (handles both lecturer and admin)
app.post('/api/lecturer/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [userRows] = await pool.query('SELECT id, name, username FROM lecturers WHERE username = ? AND password = ?', [username.toLowerCase(), password]);
    if (userRows.length > 0) {
      const user = userRows[0];
      
      let coursesData = [];
      // Only fetch courses if it's a regular lecturer
      if (user.username !== 'admin') {
        const [coursesRows] = await pool.query(`
          SELECT c.id, c.code, c.name
          FROM courses c
          WHERE c.lecturer_id = ?
        `, [user.id]);
        coursesData = coursesRows.map(course => ({
          id: course.id,
          code: course.code,
          name: course.name
        }));
      }

      res.json({
        success: true,
        user: { // Renamed from 'lecturer' to 'user' for broader use
          id: user.id,
          name: user.name,
          username: user.username,
          courses: coursesData // Will be empty for admin
        }
      });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during lecturer login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generate attendance code (lecturer)
app.post('/api/lecturer/generate-code', async (req, res) => {
  const { courseCode, lecturerId } = req.body; // Expecting lecturerId now

  try {
    const [courseRows] = await pool.query('SELECT id FROM courses WHERE code = ? AND lecturer_id = ?', [courseCode, lecturerId]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Unauthorized access to this course or course not found' });
    }
    const courseId = courseRows[0].id;

    const code = generateAttendanceCode();
    await pool.query('INSERT INTO attendance_codes (course_id, code, timestamp) VALUES (?, ?, ?)', [courseId, code, Date.now()]);

    res.json({ success: true, code: code });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get attendance records (lecturer)
app.get('/api/lecturer/attendance/:courseCode', async (req, res) => {
  const courseCode = req.params.courseCode;

  try {
    const [courseRows] = await pool.query('SELECT id, name FROM courses WHERE code = ?', [courseCode]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Course not found' });
    }
    const courseId = courseRows[0].id;
    const courseName = courseRows[0].name;

    const [records] = await pool.query(`
      SELECT s.name AS studentName, ar.timestamp
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      WHERE ar.course_id = ?
      ORDER BY ar.timestamp DESC
    `, [courseId]);

    res.json({
      success: true,
      records: records,
      course: {
        code: courseCode,
        name: courseName
      }
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current active code (lecturer)
app.get('/api/lecturer/current-code/:courseCode', async (req, res) => {
  const courseCode = req.params.courseCode;

  try {
    const [courseRows] = await pool.query('SELECT id FROM courses WHERE code = ?', [courseCode]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Course not found' });
    }
    const courseId = courseRows[0].id;

    const [codeData] = await pool.query('SELECT code, timestamp FROM attendance_codes WHERE course_id = ? ORDER BY timestamp DESC LIMIT 1', [courseId]);

    if (codeData.length > 0) {
      const validCode = codeData[0];
      const codeAge = Date.now() - validCode.timestamp;
      if (codeAge <= 3600000) { // Still valid (1 hour)
        res.json({
          success: true,
          code: validCode.code,
          timestamp: new Date(validCode.timestamp)
        });
      } else {
        res.json({ success: false, message: 'No active code' });
      }
    } else {
      res.json({ success: false, message: 'No active code' });
    }
  } catch (error) {
    console.error('Error fetching current code:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW FEATURE: Lecturer - Get students enrolled in a specific course
app.get('/api/lecturer/enrolled-students/:courseId', async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const [students] = await pool.query(`
      SELECT s.student_id, s.name AS studentName
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.course_id = ?
      ORDER BY s.name ASC
    `, [courseId]);
    res.json({ success: true, students: students });
  } catch (error) {
    console.error('Error fetching enrolled students for lecturer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ADMIN ROUTES

// Admin - Get All Students
app.get('/api/admin/students', async (req, res) => {
  try {
    const [students] = await pool.query('SELECT id, student_id, name FROM students ORDER BY student_id ASC');
    res.json({ success: true, students: students });
  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin - Add Student with Auto-ID
app.post('/api/admin/add-student', async (req, res) => {
  const { studentName } = req.body; // Only name is sent, ID is auto-generated

  if (!studentName || studentName.trim() === '') {
    return res.status(400).json({ success: false, message: 'Student Name is required.' });
  }

  try {
    // Generate next student ID (e.g., S-001, S-002)
    const [lastStudent] = await pool.query("SELECT student_id FROM students WHERE student_id LIKE 'S-%' ORDER BY student_id DESC LIMIT 1");
    let nextStudentNum = 1;
    if (lastStudent.length > 0) {
      const lastId = lastStudent[0].student_id;
      const numPart = parseInt(lastId.split('-')[1]);
      if (!isNaN(numPart)) {
        nextStudentNum = numPart + 1;
      }
    }
    const newStudentId = `S-${String(nextStudentNum).padStart(3, '0')}`;
    const newStudentPassword = reverseString(newStudentId);

    // Check if student with this name already exists (optional, but good)
    const [existingStudent] = await pool.query('SELECT id FROM students WHERE name = ?', [studentName.trim()]);
    if (existingStudent.length > 0) {
      return res.json({ success: false, message: 'A student with this name already exists.' });
    }

    await pool.query('INSERT INTO students (student_id, name, password) VALUES (?, ?, ?)', [newStudentId, studentName.trim(), newStudentPassword]);
    res.json({ success: true, message: `Student '${studentName.trim()}' added successfully with ID: ${newStudentId} and password: ${newStudentPassword}.` });
  } catch (error) {
    console.error('Error adding student by admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW FEATURE: Admin - Edit Student Name
app.put('/api/admin/student/:studentDbId', async (req, res) => {
  const studentDbId = req.params.studentDbId;
  const { newName } = req.body;

  if (!newName || newName.trim() === '') {
    return res.status(400).json({ success: false, message: 'New student name is required.' });
  }

  try {
    const [result] = await pool.query('UPDATE students SET name = ? WHERE id = ?', [newName.trim(), studentDbId]);
    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, message: 'Student name updated successfully.' });
  } catch (error) {
    console.error('Error updating student name:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Admin - Get All Lecturers with their Courses
app.get('/api/admin/lecturers-courses', async (req, res) => {
  try {
    const [lecturers] = await pool.query('SELECT id, username, name FROM lecturers');
    const lecturersWithCourses = [];

    for (const lecturer of lecturers) {
      // Exclude the 'admin' user from the lecturer list shown here
      if (lecturer.username === 'admin') continue;

      const [courses] = await pool.query(`
        SELECT c.id AS courseDbId, c.code, c.name AS courseName
        FROM courses c
        WHERE c.lecturer_id = ?
      `, [lecturer.id]);

      lecturersWithCourses.push({
        id: lecturer.id,
        name: lecturer.name,
        username: lecturer.username,
        courses: courses
      });
    }
    res.json({ success: true, lecturers: lecturersWithCourses });
  } catch (error) {
    console.error('Error fetching lecturers and courses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW FEATURE: Admin - Add New Lecturer
app.post('/api/admin/add-lecturer', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name || username.trim() === '' || password.trim() === '' || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Username, password, and name are required.' });
  }

  try {
    const [existingLecturer] = await pool.query('SELECT id FROM lecturers WHERE username = ?', [username.trim().toLowerCase()]);
    if (existingLecturer.length > 0) {
      return res.json({ success: false, message: 'Lecturer with this username already exists.' });
    }

    await pool.query('INSERT INTO lecturers (username, password, name) VALUES (?, ?, ?)', [username.trim().toLowerCase(), password, name.trim()]);
    res.json({ success: true, message: `Lecturer '${name.trim()}' added successfully with username '${username.trim()}'.` });
  } catch (error) {
    console.error('Error adding lecturer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW FEATURE: Admin - Assign Course to Lecturer
app.put('/api/admin/course/:courseCode/assign-lecturer', async (req, res) => {
  const courseCode = req.params.courseCode.toUpperCase();
  const { newLecturerId } = req.body; // newLecturerId is the DB ID of the lecturer

  try {
    const [courseRows] = await pool.query('SELECT id FROM courses WHERE code = ?', [courseCode]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Course not found.' });
    }
    const courseId = courseRows[0].id;

    const [lecturerRows] = await pool.query('SELECT id FROM lecturers WHERE id = ?', [newLecturerId]);
    if (lecturerRows.length === 0) {
      return res.json({ success: false, message: 'New lecturer not found.' });
    }

    const [result] = await pool.query('UPDATE courses SET lecturer_id = ? WHERE id = ?', [newLecturerId, courseId]);
    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Failed to assign lecturer to course.' });
    }
    res.json({ success: true, message: `Course ${courseCode} successfully assigned to new lecturer.` });
  } catch (error) {
    console.error('Error assigning lecturer to course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Admin - Delete Student
app.delete('/api/admin/student/:studentIdToDelete', async (req, res) => {
  const studentIdToDelete = req.params.studentIdToDelete; // This is the student_id string, e.g., 'S-001'

  try {
    const [studentRows] = await pool.query('SELECT id FROM students WHERE student_id = ?', [studentIdToDelete]);
    if (studentRows.length === 0) {
      return res.json({ success: false, message: 'Student not found.' });
    }
    const studentDbId = studentRows[0].id;

    // Delete related attendance records and enrollments first due to foreign key constraints
    await pool.query('DELETE FROM attendance_records WHERE student_id = ?', [studentDbId]);
    await pool.query('DELETE FROM enrollments WHERE student_id = ?', [studentDbId]);
    
    // Now delete the student
    await pool.query('DELETE FROM students WHERE id = ?', [studentDbId]);

    res.json({ success: true, message: `Student ${studentIdToDelete} and all related records deleted successfully.` });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin - Delete Lecturer (and reassign/delete their courses)
app.delete('/api/admin/lecturer/:lecturerId', async (req, res) => {
  const lecturerId = req.params.lecturerId; // This is the lecturer's DB ID

  try {
    // Prevent deletion of 'admin' user
    const [lecturerInfo] = await pool.query('SELECT username FROM lecturers WHERE id = ?', [lecturerId]);
    if (lecturerInfo.length > 0 && lecturerInfo[0].username === 'admin') {
      return res.json({ success: false, message: 'Cannot delete the main administrator account.' });
    }

    // Get courses taught by this lecturer
    const [coursesByLecturer] = await pool.query('SELECT id FROM courses WHERE lecturer_id = ?', [lecturerId]);

    // Delete attendance codes and records associated with these courses
    for (const course of coursesByLecturer) {
      await pool.query('DELETE FROM attendance_codes WHERE course_id = ?', [course.id]);
      await pool.query('DELETE FROM attendance_records WHERE course_id = ?', [course.id]);
      await pool.query('DELETE FROM enrollments WHERE course_id = ?', [course.id]);
    }

    // Delete the courses themselves
    await pool.query('DELETE FROM courses WHERE lecturer_id = ?', [lecturerId]);
    
    // Finally, delete the lecturer
    await pool.query('DELETE FROM lecturers WHERE id = ?', [lecturerId]);

    res.json({ success: true, message: 'Lecturer and associated courses/records deleted successfully.' });
  } catch (error) {
    console.error('Error deleting lecturer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin - Delete Course
app.delete('/api/admin/course/:courseCode', async (req, res) => {
  const courseCode = req.params.courseCode.toUpperCase();

  try {
    const [courseRows] = await pool.query('SELECT id FROM courses WHERE code = ?', [courseCode]);
    if (courseRows.length === 0) {
      return res.json({ success: false, message: 'Course not found.' });
    }
    const courseId = courseRows[0].id;

    // Delete related attendance codes, records, and enrollments first
    await pool.query('DELETE FROM attendance_codes WHERE course_id = ?', [courseId]);
    await pool.query('DELETE FROM attendance_records WHERE course_id = ?', [courseId]);
    await pool.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
    
    // Now delete the course
    await pool.query('DELETE FROM courses WHERE id = ?', [courseId]);

    res.json({ success: true, message: `Course ${courseCode} and all related records deleted successfully.` });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW FEATURE: Admin - Get All Enrollments
app.get('/api/admin/all-enrollments', async (req, res) => {
  try {
    const [enrollments] = await pool.query(`
      SELECT
        s.student_id,
        s.name AS studentName,
        c.code AS courseCode,
        c.name AS courseName,
        l.name AS lecturerName
      FROM
        enrollments e
      JOIN
        students s ON e.student_id = s.id
      JOIN
        courses c ON e.course_id = c.id
      JOIN
        lecturers l ON c.lecturer_id = l.id
      ORDER BY
        c.code ASC, s.name ASC
    `);
    res.json({ success: true, enrollments: enrollments });
  } catch (error) {
    console.error('Error fetching all enrollments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Start the server after database initialization
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});