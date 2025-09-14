<<<<<<< HEAD
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Initialize Database
// Use in-memory database for serverless environment or /tmp for file-based
const dbPath = process.env.VERCEL ? ':memory:' : 'quiz.db';
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // Quiz sessions table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    admin_email TEXT
  )`);

  // Quiz attempts table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_ip TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    score INTEGER,
    answers TEXT,
    is_completed BOOLEAN DEFAULT 0,
    FOREIGN KEY(session_id) REFERENCES quiz_sessions(id)
  )`);

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

// Admin: Create new quiz session
app.post('/admin/create-session', (req, res) => {
  const { adminEmail } = req.body;
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  db.run(
    "INSERT INTO quiz_sessions (id, expires_at, admin_email) VALUES (?, ?, ?)",
    [sessionId, expiresAt.toISOString(), adminEmail],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      res.json({
        sessionId,
        quizLink: `http://localhost:${PORT}/quiz/${sessionId}`,
        expiresAt: expiresAt.toISOString()
      });
    }
  );
});

// Get quiz questions and check session validity (API route)
app.get('/api/quiz/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const userIp = req.ip;

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

      // Check if user has already completed the quiz
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

          // Get quiz questions
          db.all("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions", (err, questions) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to fetch questions' });
            }

            res.json({
              sessionId,
              questions,
              timeLimit: 10 * 60 * 1000, // 10 minutes in milliseconds
              alreadyCompleted: false
            });
          });
        }
      );
    }
  );
});

// Start quiz attempt
app.post('/api/quiz/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  const userIp = req.ip;
  const attemptId = uuidv4();

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

          // Create new attempt
          db.run(
            "INSERT INTO quiz_attempts (id, session_id, user_ip) VALUES (?, ?, ?)",
            [attemptId, sessionId, userIp],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to start quiz' });
              }
              
              res.json({ attemptId });
            }
          );
        }
      );
    }
  );
});

// Submit quiz answers
app.post('/api/quiz/:sessionId/submit', (req, res) => {
  const { sessionId } = req.params;
  const { attemptId, answers } = req.body;
  const userIp = req.ip;

  // Verify attempt belongs to user
  db.get(
    "SELECT * FROM quiz_attempts WHERE id = ? AND session_id = ? AND user_ip = ? AND is_completed = 0",
    [attemptId, sessionId, userIp],
    (err, attempt) => {
      if (err || !attempt) {
        return res.status(404).json({ error: 'Invalid attempt' });
      }

      // Calculate score
      db.all("SELECT id, correct_answer FROM quiz_questions", (err, questions) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to calculate score' });
        }

        let score = 0;
        questions.forEach(question => {
          if (answers[question.id] === question.correct_answer) {
            score++;
          }
        });

        // Update attempt with completion
        db.run(
          "UPDATE quiz_attempts SET completed_at = CURRENT_TIMESTAMP, score = ?, answers = ?, is_completed = 1 WHERE id = ?",
          [score, JSON.stringify(answers), attemptId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to submit quiz' });
            }

            // Generate certificate
            generateCertificate(attemptId, score, (err, filename) => {
              if (err) {
                console.error('Certificate generation failed:', err);
              }

              res.json({
                score,
                totalQuestions: questions.length,
                completed: true,
                attemptId,
                certificate: filename || null
              });
            });
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

// Admin: Get quiz results
app.get('/admin/results/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT qa.*, qs.admin_email 
     FROM quiz_attempts qa 
     JOIN quiz_sessions qs ON qa.session_id = qs.id 
     WHERE qa.session_id = ? AND qa.is_completed = 1`,
    [sessionId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch results' });
      }

      res.json({ results });
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
=======
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Initialize Database
const db = new sqlite3.Database('quiz.db');

// Create tables
db.serialize(() => {
  // Quiz sessions table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    admin_email TEXT
  )`);

  // Quiz attempts table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_ip TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    score INTEGER,
    answers TEXT,
    is_completed BOOLEAN DEFAULT 0,
    FOREIGN KEY(session_id) REFERENCES quiz_sessions(id)
  )`);

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

// Admin: Create new quiz session
app.post('/admin/create-session', (req, res) => {
  const { adminEmail } = req.body;
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  db.run(
    "INSERT INTO quiz_sessions (id, expires_at, admin_email) VALUES (?, ?, ?)",
    [sessionId, expiresAt.toISOString(), adminEmail],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      res.json({
        sessionId,
        quizLink: `http://localhost:${PORT}/quiz/${sessionId}`,
        expiresAt: expiresAt.toISOString()
      });
    }
  );
});

// Get quiz questions and check session validity (API route)
app.get('/api/quiz/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const userIp = req.ip;

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

      // Check if user has already completed the quiz
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

          // Get quiz questions
          db.all("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions", (err, questions) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to fetch questions' });
            }

            res.json({
              sessionId,
              questions,
              timeLimit: 10 * 60 * 1000, // 10 minutes in milliseconds
              alreadyCompleted: false
            });
          });
        }
      );
    }
  );
});

// Start quiz attempt
app.post('/api/quiz/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  const userIp = req.ip;
  const attemptId = uuidv4();

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

          // Create new attempt
          db.run(
            "INSERT INTO quiz_attempts (id, session_id, user_ip) VALUES (?, ?, ?)",
            [attemptId, sessionId, userIp],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to start quiz' });
              }
              
              res.json({ attemptId });
            }
          );
        }
      );
    }
  );
});

// Submit quiz answers
app.post('/api/quiz/:sessionId/submit', (req, res) => {
  const { sessionId } = req.params;
  const { attemptId, answers } = req.body;
  const userIp = req.ip;

  // Verify attempt belongs to user
  db.get(
    "SELECT * FROM quiz_attempts WHERE id = ? AND session_id = ? AND user_ip = ? AND is_completed = 0",
    [attemptId, sessionId, userIp],
    (err, attempt) => {
      if (err || !attempt) {
        return res.status(404).json({ error: 'Invalid attempt' });
      }

      // Calculate score
      db.all("SELECT id, correct_answer FROM quiz_questions", (err, questions) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to calculate score' });
        }

        let score = 0;
        questions.forEach(question => {
          if (answers[question.id] === question.correct_answer) {
            score++;
          }
        });

        // Update attempt with completion
        db.run(
          "UPDATE quiz_attempts SET completed_at = CURRENT_TIMESTAMP, score = ?, answers = ?, is_completed = 1 WHERE id = ?",
          [score, JSON.stringify(answers), attemptId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to submit quiz' });
            }

            // Generate certificate
            generateCertificate(attemptId, score, (err, filename) => {
              if (err) {
                console.error('Certificate generation failed:', err);
              }

              res.json({
                score,
                totalQuestions: questions.length,
                completed: true,
                attemptId,
                certificate: filename || null
              });
            });
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

// Admin: Get quiz results
app.get('/admin/results/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT qa.*, qs.admin_email 
     FROM quiz_attempts qa 
     JOIN quiz_sessions qs ON qa.session_id = qs.id 
     WHERE qa.session_id = ? AND qa.is_completed = 1`,
    [sessionId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch results' });
      }

      res.json({ results });
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
app.use(express.static('public'));

// Serve quiz page for specific session
app.get('/quiz/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

// Default route - serve admin panel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Quiz application running on http://localhost:${PORT}`);
});
>>>>>>> ec22607a987fa221ffd9015df618f7f5fddfa28a
