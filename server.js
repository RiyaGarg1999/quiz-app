const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Load configuration
let config = {};
try {
  const configPath = path.join(__dirname, 'config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
  console.log('Configuration loaded:', config);
} catch (error) {
  console.log('No config.json found, using default configuration');
  config = {
    oauth: "disable",
    app: { name: "Quiz Application" },
    security: { requireGmailVerification: false, allowedEmailDomains: ["gmail.com"] }
  };
}

// Google OAuth2 Client Configuration (only if OAuth is enabled)
let googleClient = null;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your_google_client_id_here.apps.googleusercontent.com';

if (config.oauth === 'enable') {
  try {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
    console.log('Google OAuth2 client initialized');
  } catch (error) {
    console.warn('Failed to initialize Google OAuth2 client:', error.message);
    config.oauth = 'disable'; // Fallback to disable mode
  }
} else {
  console.log('Google OAuth is disabled in config');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database ready middleware
app.use((req, res, next) => {
  if (!db) {
    console.error('Database not initialized');
    return res.status(500).json({ error: 'Database not available' });
  }
  next();
});

// Initialize Database
let db;

function initializeDatabase() {
  // Force in-memory database for Vercel/serverless environments
  const isServerless = process.env.VERCEL || process.env.VERCEL_ENV || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const dbPath = isServerless ? ':memory:' : 'quiz.db';
  
  console.log('Environment check:');
  console.log('- VERCEL:', process.env.VERCEL);
  console.log('- VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('- Is serverless:', isServerless);
  console.log('- Database path:', dbPath);
  
  try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        throw err;
      }
      console.log('Database connected successfully with path:', dbPath);
    });
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Initialize database with error handling
try {
  db = initializeDatabase();
  console.log('Database initialization completed');
} catch (error) {
  console.error('Critical database error:', error);
  process.exit(1);
}

// Create tables with error handling
db.serialize(() => {
  // Quiz sessions table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT (datetime('now')),
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    admin_email TEXT
  )`);

  // Quiz attempts table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_ip TEXT,
    student_name TEXT,
    student_email TEXT,
    school_name TEXT,
    google_id TEXT,
    email_verified BOOLEAN DEFAULT 0,
    started_at DATETIME DEFAULT (datetime('now')),
    completed_at DATETIME,
    score INTEGER,
    answers TEXT,
    is_completed BOOLEAN DEFAULT 0,
    FOREIGN KEY(session_id) REFERENCES quiz_sessions(id)
  )`);

  // Database migration: Add new columns if they don't exist
  db.all("PRAGMA table_info(quiz_attempts)", (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // Add google_id column if it doesn't exist
    if (!columnNames.includes('google_id')) {
      db.run("ALTER TABLE quiz_attempts ADD COLUMN google_id TEXT", (err) => {
        if (err) {
          console.error('Failed to add google_id column:', err);
        } else {
          console.log('✅ Added google_id column to quiz_attempts table');
        }
      });
    }
    
    // Add email_verified column if it doesn't exist
    if (!columnNames.includes('email_verified')) {
      db.run("ALTER TABLE quiz_attempts ADD COLUMN email_verified BOOLEAN DEFAULT 0", (err) => {
        if (err) {
          console.error('Failed to add email_verified column:', err);
        } else {
          console.log('✅ Added email_verified column to quiz_attempts table');
        }
      });
    }
    
    if (columnNames.includes('google_id') && columnNames.includes('email_verified')) {
      console.log('✅ Database schema is up to date');
    }
  });

  // Quiz questions table (predefined 5 MCQ questions)
  db.run(`CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL
  )`);

  // Insert sample questions if they don't exist
  db.get("SELECT COUNT(*) as count FROM quiz_questions", (err, row) => {
    if (row.count === 0) {
      const sampleQuestions = [
        {
          question: "What is the capital of France?",
          option_a: "London",
          option_b: "Berlin",
          option_c: "Paris",
          option_d: "Madrid",
          correct_answer: "c"
        },
        {
          question: "Which programming language is known as the 'mother of all languages'?",
          option_a: "C",
          option_b: "Assembly",
          option_c: "FORTRAN",
          option_d: "COBOL",
          correct_answer: "a"
        },
        {
          question: "What does HTML stand for?",
          option_a: "Hyper Text Markup Language",
          option_b: "High Tech Modern Language",
          option_c: "Home Tool Markup Language",
          option_d: "Hyperlink and Text Markup Language",
          correct_answer: "a"
        },
        {
          question: "Which planet is known as the Red Planet?",
          option_a: "Venus",
          option_b: "Mars",
          option_c: "Jupiter",
          option_d: "Saturn",
          correct_answer: "b"
        },
        {
          question: "What is the largest ocean on Earth?",
          option_a: "Atlantic Ocean",
          option_b: "Indian Ocean",
          option_c: "Arctic Ocean",
          option_d: "Pacific Ocean",
          correct_answer: "d"
        }
      ];

      const stmt = db.prepare("INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?)");
      sampleQuestions.forEach(q => {
        stmt.run(q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer);
      });
      stmt.finalize();
    }
  });
});

// Utility function to check if session is valid
function isSessionValid(expiresAt) {
  return new Date() < new Date(expiresAt);
}

// Generate certificate PDF
function generateCertificate(attemptId, score, callback) {
  const doc = new PDFDocument();
  const filename = `certificate_${attemptId}.pdf`;
  const filepath = path.join(__dirname, 'certificates', filename);

  // Create certificates directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'certificates'))) {
    fs.mkdirSync(path.join(__dirname, 'certificates'));
  }

  doc.pipe(fs.createWriteStream(filepath));

  // Certificate content
  doc.fontSize(30).text('Certificate of Completion', 100, 100);
  doc.fontSize(20).text('This is to certify that you have successfully', 100, 200);
  doc.text('completed the quiz with a score of', 100, 230);
  doc.fontSize(24).text(`${score}/5`, 250, 260);
  doc.fontSize(16).text(`Certificate ID: ${attemptId}`, 100, 320);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, 350);

  doc.end();

  doc.on('end', () => {
    callback(null, filename);
  });

  doc.on('error', (err) => {
    callback(err, null);
  });
}

// Routes

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    oauth: config.oauth,
    appName: config.app.name,
    googleClientId: config.oauth === 'enable' ? GOOGLE_CLIENT_ID : null,
    requireGmailVerification: config.security?.requireGmailVerification || false,
    allowedEmailDomains: config.security?.allowedEmailDomains || []
  });
});

// Google OAuth verification endpoint
app.post('/auth/verify-google-token', async (req, res) => {
  // Check if OAuth is enabled
  if (config.oauth !== 'enable') {
    return res.status(400).json({ 
      error: 'OAuth verification is disabled',
      details: 'Google OAuth verification is not currently enabled'
    });
  }

  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ error: 'ID token is required' });
  }

  if (!googleClient) {
    return res.status(500).json({ 
      error: 'OAuth not properly configured',
      details: 'Google OAuth client is not initialized'
    });
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    // Check if email verification is required
    const allowedDomains = config.security?.allowedEmailDomains || ['gmail.com'];
    const emailDomain = payload.email.split('@')[1];
    
    if (!payload.email_verified || !allowedDomains.includes(emailDomain)) {
      return res.status(400).json({ 
        error: `Please use a verified ${allowedDomains.join(' or ')} account`,
        details: `Only ${allowedDomains.join(', ')} accounts are allowed for this quiz`
      });
    }

    // Extract verified user information
    const userInfo = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
      googleId: payload.sub
    };

    console.log('Google OAuth verification successful for:', userInfo.email);

    res.json({
      success: true,
      user: userInfo,
      message: 'Email verification successful'
    });

  } catch (error) {
    console.error('Google OAuth verification failed:', error);
    
    if (error.message.includes('Token used too early') || error.message.includes('Token used too late')) {
      return res.status(400).json({ 
        error: 'Invalid token timing',
        details: 'Please try signing in again'
      });
    } else if (error.message.includes('Invalid token signature')) {
      return res.status(400).json({ 
        error: 'Invalid token',
        details: 'Please try signing in again'
      });
    } else {
      return res.status(400).json({ 
        error: 'Email verification failed',
        details: 'Please try again or use a different account'
      });
    }
  }
});

// Admin: Create new quiz session
app.post('/admin/create-session', (req, res) => {
  const { adminEmail } = req.body;
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  console.log('Creating session:', {
    sessionId: sessionId.substring(0, 8) + '...',
    createdAt: now.toISOString(),
    localTime: now.toLocaleString(),
    expiresAt: expiresAt.toISOString(),
    adminEmail
  });

  db.run(
    "INSERT INTO quiz_sessions (id, created_at, expires_at, admin_email) VALUES (?, ?, ?, ?)",
    [sessionId, now.toISOString(), expiresAt.toISOString(), adminEmail],
    function(err) {
      if (err) {
        console.error('Failed to create session:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      // Generate the appropriate base URL based on environment
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NODE_ENV === 'production' 
          ? `https://quiz-app-phi-ruby-52.vercel.app`  // Your actual Vercel URL
          : `http://localhost:${PORT}`;

      console.log('Session created successfully at local time:', now.toLocaleString());

      res.json({
        sessionId,
        quizLink: `${baseUrl}/quiz/${sessionId}`,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString()
      });
    }
  );
});

// Get quiz questions and check session validity (API route)
app.get('/api/quiz/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  // Better IP detection for serverless environments
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'anonymous';

  console.log('Loading quiz:', { sessionId, userIp });

  // Check if session exists and is valid
  db.get(
    "SELECT * FROM quiz_sessions WHERE id = ? AND is_active = 1",
    [sessionId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).json({ error: 'Quiz session not found' });
      }

      if (!isSessionValid(session.expires_at)) {
        return res.status(410).json({ error: 'Quiz session has expired' });
      }

          // Check if user has already completed the quiz or has an active attempt
          db.get(
            "SELECT * FROM quiz_attempts WHERE session_id = ? AND user_ip = ?",
            [sessionId, userIp],
            (err, attempt) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              if (attempt && attempt.is_completed) {
                return res.json({
                  alreadyCompleted: true,
                  score: attempt.score,
                  attemptId: attempt.id
                });
              }

              // If there's an active attempt, check if time has expired
              if (attempt && !attempt.is_completed) {
                const startTime = new Date(attempt.started_at);
                const now = new Date();
                const elapsedTime = now - startTime; // in milliseconds
                const timeLimit = 10 * 60 * 1000; // 10 minutes in milliseconds
                const remainingTime = timeLimit - elapsedTime;

                console.log('Timer check:', {
                  attemptId: attempt.id,
                  startTime: startTime.toISOString(),
                  now: now.toISOString(),
                  elapsedTime: Math.floor(elapsedTime / 1000) + 's',
                  remainingTime: Math.floor(remainingTime / 1000) + 's',
                  timeLimit: Math.floor(timeLimit / 1000) + 's',
                  willExpire: remainingTime <= 0
                });

                if (remainingTime <= 0) {
                  // Time expired, auto-submit with current saved answers
                  console.log('Auto-submitting expired quiz for attempt:', attempt.id);
                  
                  // Use existing saved answers or empty if none
                  let finalAnswers = {};
                  let finalScore = 0;
                  
                  try {
                    if (attempt.answers) {
                      finalAnswers = JSON.parse(attempt.answers);
                      
                      // Calculate score with saved answers
                      db.all("SELECT id, correct_answer FROM quiz_questions", (err, questions) => {
                        if (!err && questions) {
                          questions.forEach(question => {
                            if (finalAnswers[question.id] === question.correct_answer) {
                              finalScore++;
                            }
                          });
                        }
                        
                        // Update with calculated score
                        const completedAt = new Date().toISOString();
                        console.log('Auto-submitting expired quiz - completed at:', completedAt, 'local:', new Date().toLocaleString());
                        
                        db.run(
                          "UPDATE quiz_attempts SET completed_at = ?, score = ?, is_completed = 1 WHERE id = ?",
                          [completedAt, finalScore, attempt.id],
                          function(err) {
                            if (err) {
                              console.error('Failed to auto-submit expired quiz:', err);
                            }
                          }
                        );
                      });
                    } else {
                      // No saved answers, score is 0
                      const completedAt = new Date().toISOString();
                      console.log('Auto-submitting expired quiz (no answers) - completed at:', completedAt, 'local:', new Date().toLocaleString());
                      
                      db.run(
                        "UPDATE quiz_attempts SET completed_at = ?, score = 0, answers = '{}', is_completed = 1 WHERE id = ?",
                        [completedAt, attempt.id],
                        function(err) {
                          if (err) {
                            console.error('Failed to auto-submit expired quiz:', err);
                          }
                        }
                      );
                    }
                  } catch (e) {
                    console.error('Error processing saved answers on expiry:', e);
                  }

                  return res.json({
                    timeExpired: true,
                    message: 'Quiz time has expired. Your saved answers have been submitted.',
                    attemptId: attempt.id
                  });
                } else {
                  // Time remaining, return quiz with remaining time
                  console.log('Quiz has remaining time:', Math.floor(remainingTime / 1000) + 's');
                }

                // Return existing attempt with remaining time
                db.all("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions", (err, questions) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to fetch questions' });
                  }

                  // Parse existing answers if any
                  let savedAnswers = {};
                  try {
                    if (attempt.answers) {
                      savedAnswers = JSON.parse(attempt.answers);
                    }
                  } catch (e) {
                    console.error('Error parsing saved answers:', e);
                  }

                  return res.json({
                    sessionId,
                    questions,
                    timeLimit: remainingTime, // remaining time in milliseconds
                    alreadyStarted: true,
                    attemptId: attempt.id,
                    alreadyCompleted: false,
                    startTime: startTime.toISOString(),
                    savedAnswers: savedAnswers
                  });
                });
              } else {
                // No attempt yet, return questions for student info form
                db.all("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions", (err, questions) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to fetch questions' });
                  }

                  res.json({
                    sessionId,
                    questions,
                    timeLimit: 10 * 60 * 1000, // 10 minutes in milliseconds
                    alreadyCompleted: false,
                    alreadyStarted: false
                  });
                });
              }
            }
          );
    }
  );
});

// Start quiz attempt
app.post('/api/quiz/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  const { studentName, studentEmail, schoolName, googleId, emailVerified } = req.body;
  
  // Better IP detection for serverless environments
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'anonymous';
  const attemptId = uuidv4();

  // Validate student information
  if (!studentName || !studentEmail || !schoolName) {
    return res.status(400).json({ error: 'Student name, email, and school name are required' });
  }

  // Conditional validation based on configuration
  if (config.oauth === 'enable') {
    // OAuth is enabled - require verification
    if (!emailVerified || !googleId) {
      return res.status(400).json({ error: 'Please verify your account first using the sign-in button' });
    }
    
    // Check allowed email domains
    const allowedDomains = config.security?.allowedEmailDomains || ['gmail.com'];
    const emailDomain = studentEmail.split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      return res.status(400).json({ 
        error: `Only ${allowedDomains.join(', ')} accounts are allowed for this quiz`
      });
    }
  } else {
    // OAuth is disabled - just validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(studentEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
  }

  console.log('Starting quiz attempt:', { sessionId, userIp, attemptId, studentName, studentEmail, schoolName, googleId, emailVerified });

  // Check if session is valid
  db.get(
    "SELECT * FROM quiz_sessions WHERE id = ? AND is_active = 1",
    [sessionId],
    (err, session) => {
      if (err || !session || !isSessionValid(session.expires_at)) {
        return res.status(410).json({ error: 'Quiz session invalid or expired' });
      }

      // Check if user already has an attempt
      db.get(
        "SELECT * FROM quiz_attempts WHERE session_id = ? AND user_ip = ?",
        [sessionId, userIp],
        (err, existingAttempt) => {
          if (existingAttempt) {
            return res.json({ attemptId: existingAttempt.id });
          }

          // Create new attempt with student information and explicit start time
          const startTime = new Date().toISOString();
          db.run(
            "INSERT INTO quiz_attempts (id, session_id, user_ip, student_name, student_email, school_name, google_id, email_verified, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [attemptId, sessionId, userIp, studentName, studentEmail, schoolName, googleId, emailVerified ? 1 : 0, startTime],
            function(err) {
              if (err) {
                console.error('Failed to create quiz attempt:', err);
                return res.status(500).json({ error: 'Failed to start quiz' });
              }
              
              console.log('Quiz attempt created with Google OAuth verification:', { startTime, googleId, emailVerified });
              res.json({ 
                attemptId,
                startTime: startTime 
              });
            }
          );
        }
      );
    }
  );
});

// Save current answers (for auto-save during quiz)
app.post('/api/quiz/:sessionId/save-answers', (req, res) => {
  const { sessionId } = req.params;
  const { attemptId, answers } = req.body;
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'anonymous';

  console.log('Saving current answers for attempt:', attemptId, 'Answers count:', Object.keys(answers || {}).length);

  // Verify attempt belongs to user and is not completed
  db.get(
    "SELECT * FROM quiz_attempts WHERE id = ? AND session_id = ? AND is_completed = 0",
    [attemptId, sessionId],
    (err, attempt) => {
      if (err || !attempt) {
        return res.status(404).json({ error: 'Invalid attempt' });
      }

      // Update current answers (but don't mark as completed)
      db.run(
        "UPDATE quiz_attempts SET answers = ? WHERE id = ?",
        [JSON.stringify(answers), attemptId],
        function(err) {
          if (err) {
            console.error('Failed to save current answers:', err);
            return res.status(500).json({ error: 'Failed to save answers' });
          }

          console.log('Answers saved successfully for attempt:', attemptId);
          res.json({ success: true, saved: Object.keys(answers || {}).length });
        }
      );
    }
  );
});

// Submit quiz answers
app.post('/api/quiz/:sessionId/submit', (req, res) => {
  const { sessionId } = req.params;
  const { attemptId, answers } = req.body;
  // Better IP detection for serverless environments
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || 'anonymous';

  console.log('Quiz submission attempt:', { sessionId, attemptId, userIp, answersReceived: !!answers });

  // Verify attempt belongs to user (more flexible for serverless environments)
  db.get(
    "SELECT * FROM quiz_attempts WHERE id = ? AND session_id = ? AND is_completed = 0",
    [attemptId, sessionId],
    (err, attempt) => {
      if (err || !attempt) {
        console.log('Attempt verification failed:', { err, attempt, attemptId, sessionId });
        return res.status(404).json({ error: 'Invalid attempt or already completed' });
      }

      // Log for debugging
      console.log('Attempt found:', { attemptId: attempt.id, sessionId: attempt.session_id, originalIp: attempt.user_ip, currentIp: userIp });

      // Calculate score
      db.all("SELECT id, correct_answer FROM quiz_questions", (err, questions) => {
        if (err) {
          console.error('Failed to fetch questions for scoring:', err);
          return res.status(500).json({ error: 'Failed to calculate score' });
        }

        console.log('Questions for scoring:', questions.length);
        console.log('Submitted answers:', answers);

        let score = 0;
        questions.forEach(question => {
          if (answers[question.id] === question.correct_answer) {
            score++;
          }
        });

        console.log('Calculated score:', score, 'out of', questions.length);

        // Update attempt with completion
        const completedAt = new Date().toISOString();
        console.log('Manual quiz submission - completed at:', completedAt, 'local:', new Date().toLocaleString());
        
        db.run(
          "UPDATE quiz_attempts SET completed_at = ?, score = ?, answers = ?, is_completed = 1 WHERE id = ?",
          [completedAt, score, JSON.stringify(answers), attemptId],
          function(err) {
            if (err) {
              console.error('Failed to update attempt:', err);
              return res.status(500).json({ error: 'Failed to submit quiz' });
            }

            console.log('Quiz submission successful for attempt:', attemptId, 'Score:', score);

            // Try to generate certificate (may fail in serverless environment)
            try {
              generateCertificate(attemptId, score, (err, filename) => {
                // Always respond, even if certificate generation fails
                res.json({
                  score,
                  totalQuestions: questions.length,
                  completed: true,
                  attemptId,
                  certificate: filename || null,
                  message: err ? 'Quiz completed successfully (certificate unavailable)' : 'Quiz completed successfully'
                });
              });
            } catch (certError) {
              console.log('Certificate generation not available in serverless environment');
              // Still return success response without certificate
              res.json({
                score,
                totalQuestions: questions.length,
                completed: true,
                attemptId,
                certificate: null,
                message: 'Quiz completed successfully (certificate unavailable in this environment)'
              });
            }
          }
        );
      });
    }
  );
});

// Download certificate
app.get('/certificate/:attemptId', (req, res) => {
  const { attemptId } = req.params;
  const filename = `certificate_${attemptId}.pdf`;
  const filepath = path.join(__dirname, 'certificates', filename);

  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'Certificate not found' });
  }
});

// Admin: Get recent quiz sessions
app.get('/admin/sessions', (req, res) => {
  // Get recent sessions from the last 48 hours
  db.all(
    `SELECT id, admin_email, created_at, expires_at, is_active,
            (SELECT COUNT(*) FROM quiz_attempts WHERE session_id = quiz_sessions.id AND is_completed = 1) as completed_attempts
     FROM quiz_sessions 
     WHERE created_at > datetime('now', '-48 hours')
     ORDER BY created_at DESC
     LIMIT 10`,
    [],
    (err, sessions) => {
      if (err) {
        console.error('Failed to fetch recent sessions:', err);
        return res.status(500).json({ error: 'Failed to fetch sessions' });
      }

      res.json({ sessions });
    }
  );
});

// Admin: Get quiz results
app.get('/admin/results/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT qa.id, qa.session_id, qa.user_ip, qa.student_name, qa.student_email, qa.school_name,
            qa.started_at, qa.completed_at, qa.score, qa.answers, qa.email_verified,
            qs.admin_email, qs.created_at as session_created
     FROM quiz_attempts qa 
     JOIN quiz_sessions qs ON qa.session_id = qs.id 
     WHERE qa.session_id = ? AND qa.is_completed = 1
     ORDER BY qa.completed_at ASC`,
    [sessionId],
    (err, results) => {
      if (err) {
        console.error('Failed to fetch results for session:', sessionId, err);
        return res.status(500).json({ error: 'Failed to fetch results' });
      }

      // Log the raw timestamps for debugging
      console.log('Results timestamps for session:', sessionId);
      results.forEach(result => {
        console.log('Student:', result.student_name, 
                   'Started:', result.started_at, 
                   'Completed:', result.completed_at);
      });

      res.json({ results });
    }
  );
});

// Admin: Export quiz results as CSV
app.get('/admin/export/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT qa.student_name, qa.student_email, qa.school_name, qa.score, 
            qa.started_at, qa.completed_at, qa.email_verified,
            qs.admin_email, qs.created_at as session_created
     FROM quiz_attempts qa 
     JOIN quiz_sessions qs ON qa.session_id = qs.id 
     WHERE qa.session_id = ? AND qa.is_completed = 1
     ORDER BY qa.completed_at ASC`,
    [sessionId],
    (err, results) => {
      if (err) {
        console.error('Failed to fetch results for CSV export:', err);
        return res.status(500).json({ error: 'Failed to fetch results for export' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'No completed attempts found for this session' });
      }

      // Generate CSV content with proper timestamp handling
      const csvHeader = 'Student Name,Email ID,School Name,Score,Total Questions,Started At,Completed At,Gmail Verified,Session Created\n';
      
      const csvRows = results.map(result => {
        // Ensure proper date formatting - handle both ISO strings and SQLite datetime format
        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
              // If direct parsing failed, try adding 'Z' for SQLite UTC dates
              const utcDate = new Date(dateString + 'Z');
              return isNaN(utcDate.getTime()) ? dateString : utcDate.toLocaleString();
            }
            return date.toLocaleString();
          } catch (e) {
            console.error('Date formatting error:', e, 'Input:', dateString);
            return dateString;
          }
        };

        const startedDate = formatDate(result.started_at);
        const completedDate = formatDate(result.completed_at);
        const sessionDate = formatDate(result.session_created);
        
        console.log('CSV formatting - Student:', result.student_name, 
                   'Started raw:', result.started_at, 'formatted:', startedDate,
                   'Completed raw:', result.completed_at, 'formatted:', completedDate);
        
        // Get total questions count
        return new Promise((resolve) => {
          db.get("SELECT COUNT(*) as total FROM quiz_questions", (err, countResult) => {
            const totalQuestions = countResult ? countResult.total : 5;
            resolve([
              `"${result.student_name}"`,
              `"${result.student_email}"`,
              `"${result.school_name}"`,
              result.score,
              totalQuestions,
              `"${startedDate}"`,
              `"${completedDate}"`,
              result.email_verified ? 'Yes' : 'No',
              `"${sessionDate}"`
            ].join(','));
          });
        });
      });

      Promise.all(csvRows).then(csvData => {
        const csvContent = csvHeader + csvData.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="quiz_results_${sessionId}_${new Date().toISOString().split('T')[0]}.csv"`);
        
        res.send(csvContent);
      }).catch(error => {
        console.error('Error generating CSV:', error);
        res.status(500).json({ error: 'Failed to generate CSV' });
      });
    }
  );
});

// Admin: Get all quiz questions
app.get('/admin/questions', (req, res) => {
  db.all("SELECT * FROM quiz_questions ORDER BY id", (err, questions) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }
    res.json({ questions });
  });
});

// Admin: Add new quiz question
app.post('/admin/questions', (req, res) => {
  const { question, option_a, option_b, option_c, option_d, correct_answer } = req.body;
  
  // Validation
  if (!question || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (!['a', 'b', 'c', 'd'].includes(correct_answer.toLowerCase())) {
    return res.status(400).json({ error: 'Correct answer must be a, b, c, or d' });
  }

  db.run(
    "INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?)",
    [question, option_a, option_b, option_c, option_d, correct_answer.toLowerCase()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add question' });
      }
      
      // Return the newly created question
      db.get("SELECT * FROM quiz_questions WHERE id = ?", [this.lastID], (err, newQuestion) => {
        if (err) {
          return res.status(500).json({ error: 'Question added but failed to retrieve' });
        }
        res.status(201).json({ question: newQuestion });
      });
    }
  );
});

// Admin: Update quiz question
app.put('/admin/questions/:id', (req, res) => {
  const { id } = req.params;
  const { question, option_a, option_b, option_c, option_d, correct_answer } = req.body;
  
  // Validation
  if (!question || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (!['a', 'b', 'c', 'd'].includes(correct_answer.toLowerCase())) {
    return res.status(400).json({ error: 'Correct answer must be a, b, c, or d' });
  }

  db.run(
    "UPDATE quiz_questions SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ? WHERE id = ?",
    [question, option_a, option_b, option_c, option_d, correct_answer.toLowerCase(), id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update question' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      // Return the updated question
      db.get("SELECT * FROM quiz_questions WHERE id = ?", [id], (err, updatedQuestion) => {
        if (err) {
          return res.status(500).json({ error: 'Question updated but failed to retrieve' });
        }
        res.json({ question: updatedQuestion });
      });
    }
  );
});

// Admin: Delete quiz question
app.delete('/admin/questions/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if we have more than 1 question (minimum requirement)
  db.get("SELECT COUNT(*) as count FROM quiz_questions", (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last question. At least one question is required.' });
    }
    
    db.run("DELETE FROM quiz_questions WHERE id = ?", [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete question' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }
      
      res.json({ message: 'Question deleted successfully' });
    });
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve quiz page for specific session
app.get('/quiz/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

// Default route - serve admin panel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Export for Vercel
module.exports = app;

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Quiz application running on http://localhost:${PORT}`);
  });
}