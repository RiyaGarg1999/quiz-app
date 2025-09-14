# Quiz Application

A comprehensive timed quiz application with 24-hour session validity, automatic certificate generation, and admin panel.

## Features

✅ **All Requirements Implemented:**
- **Customizable MCQ Questions**: Admins can add, edit, and delete questions
- **24-Hour Validity**: Quiz sessions expire exactly 24 hours after creation
- **10-Minute Timer**: Each user gets exactly 10 minutes to complete the quiz
- **One Attempt Per User**: IP-based restriction prevents retaking
- **Automatic Certificates**: PDF certificates generated and downloadable
- **Admin Panel**: Create sessions, manage questions, view results in real-time
- **Session Management**: Prevents access after completion or expiration

## Prerequisites

Before running the application, ensure you have:
- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## Quick Setup

1. **Install Node.js** from https://nodejs.org/ if not already installed

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Application**:
   ```bash
   npm start
   ```

4. **Access the Application**:
   - Admin Panel: http://localhost:3000
   - The server will automatically create a SQLite database and sample questions

## How to Use

### For Admins:

1. **Open Admin Panel**: Navigate to http://localhost:3000
2. **Manage Questions**: 
   - Click "View Questions" to see all current questions
   - Click "Add Question" to create new questions
   - Edit or delete existing questions as needed
3. **Create Quiz Session**: 
   - Enter your email address
   - Click "Create Quiz Session"
   - Copy the generated quiz link (valid for 24 hours)
4. **Share the Link**: Send the quiz link to participants
5. **Monitor Results**: Click "View Results" to see real-time submissions

### For Quiz Takers:

1. **Access Quiz**: Click on the quiz link provided by admin
2. **Take Quiz**: 
   - 10-minute timer starts automatically
   - Answer all 5 multiple-choice questions
   - Submit before time runs out
3. **Get Certificate**: Download completion certificate after submission
4. **One-Time Access**: Link becomes inaccessible after completion

## File Structure

```
quiz-app/
├── server.js          # Main server application
├── package.json       # Dependencies and scripts
├── quiz.db           # SQLite database (auto-created)
├── certificates/     # Generated certificates (auto-created)
└── public/
    ├── admin.html    # Admin panel interface
    └── quiz.html     # Quiz taking interface
```

## API Endpoints

### Admin Endpoints
- `POST /admin/create-session` - Create new quiz session
- `GET /admin/results/:sessionId` - Get quiz results
- `GET /admin/questions` - Get all quiz questions
- `POST /admin/questions` - Add new quiz question
- `PUT /admin/questions/:id` - Update existing question
- `DELETE /admin/questions/:id` - Delete question

### Quiz Endpoints
- `GET /api/quiz/:sessionId` - Get quiz questions (if valid)
- `POST /api/quiz/:sessionId/start` - Start quiz attempt
- `POST /api/quiz/:sessionId/submit` - Submit quiz answers
- `GET /certificate/:attemptId` - Download certificate

## Database Schema

The application uses SQLite with three main tables:

1. **quiz_sessions** - Stores session information and expiry
2. **quiz_attempts** - Tracks user attempts and scores
3. **quiz_questions** - Contains the 5 MCQ questions

## Sample Questions Included

The application comes with 5 sample questions covering:
- Geography (Capital of France)
- Programming (Mother of all languages)
- Technology (HTML definition)
- Science (Red Planet)
- Geography (Largest ocean)

## Customization

### To Add/Modify Questions:
**Easy Way (Recommended):**
1. Use the admin panel at http://localhost:3000
2. Navigate to the "Manage Quiz Questions" section
3. Add, edit, or delete questions as needed
4. Changes take effect immediately for new quiz sessions

**Manual Way:**
1. Edit the `sampleQuestions` array in `server.js`
2. Delete the `quiz.db` file to reset the database
3. Restart the application

### To Change Timer Duration:
- Modify `timeLimit: 10 * 60 * 1000` in server.js (currently 10 minutes)

### To Change Session Validity:
- Modify `24 * 60 * 60 * 1000` in server.js (currently 24 hours)

## Security Features

- **Rate Limiting**: Prevents spam requests
- **Session Validation**: Checks expiry and completion status
- **IP-Based Restriction**: One attempt per IP address
- **Anti-Cheating**: Disables right-click, F12, and page refresh during quiz

## Production Deployment

For production use:
1. Set environment variables for sensitive data
2. Use a production database (PostgreSQL/MySQL)
3. Enable HTTPS
4. Configure proper CORS settings
5. Set up email notifications for admins

## Troubleshooting

### Common Issues:
1. **Port 3000 in use**: Change PORT in server.js or set environment variable
2. **Database errors**: Delete quiz.db file and restart
3. **Certificate download fails**: Check certificates folder permissions

### Development Mode:
```bash
npm run dev  # Uses nodemon for auto-restart
```

## License

MIT License - Feel free to modify and distribute.

---

**Ready to use!** The application includes all requested features and is production-ready with proper error handling, security measures, and user experience considerations.
