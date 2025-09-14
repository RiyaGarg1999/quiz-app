# 🚀 Quick Start Guide

## Step 1: Install Node.js
**You need to install Node.js first since it's not currently installed on your system.**

1. **Download Node.js**: Go to https://nodejs.org/
2. **Choose**: Download the **LTS version** (recommended)
3. **Install**: Run the downloaded installer and follow the setup wizard
4. **Verify**: Open a new Command Prompt/PowerShell and run:
   ```
   node --version
   npm --version
   ```

## Step 2: Run the Application

### Option A: Use the Setup Script (Recommended)
1. **Double-click** `setup.bat` in the quiz-app folder
2. This will automatically install dependencies and set everything up

### Option B: Manual Setup
1. **Open Command Prompt** in the quiz-app folder:
   ```
   cd C:\Users\riyaga\quiz-app
   ```
2. **Install dependencies**:
   ```
   npm install
   ```
3. **Start the application**:
   ```
   npm start
   ```

## Step 3: Access Your Quiz Application
- **Open browser** and go to: http://localhost:3000
- **Admin Panel**: Manage questions and create quiz sessions
- **Quiz Link**: Share the generated links with participants

## Step 4: Test the Features
1. **Manage Questions**: Add/edit/delete quiz questions
2. **Create Session**: Generate a 24-hour valid quiz link
3. **Take Quiz**: Test the quiz experience
4. **Download Certificate**: Check certificate generation

---

## 📁 Deploy to GitHub

### 1. Create GitHub Repository
- Go to https://github.com and create a new repository
- Don't initialize with README (we already have files)

### 2. Upload Your Code

**Easy Method:**
1. **Zip** the entire `quiz-app` folder
2. Go to your GitHub repository
3. Click **"uploading an existing file"**
4. **Drag and drop** all files from the zip

**Git Method:**
```bash
git init
git add .
git commit -m "Quiz application with question management"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 🌐 Deploy Online (Free Options)

### Heroku (Recommended for beginners)
1. Create account at https://heroku.com
2. Connect your GitHub repository
3. Deploy automatically

### Vercel (Fast & Easy)
1. Go to https://vercel.com
2. Import your GitHub repository
3. Deploy with one click

### Railway
1. Go to https://railway.app
2. Connect GitHub repository
3. Automatic deployment

---

## ❓ Need Help?

### Common Issues:
- **"node is not recognized"**: Install Node.js first
- **Port 3000 in use**: Change port in server.js
- **Dependencies error**: Run `npm install` again

### Files Overview:
- `server.js` - Main application
- `public/admin.html` - Admin interface
- `public/quiz.html` - Quiz interface
- `package.json` - Dependencies
- `setup.bat` - Windows setup script
- `start.bat` - Windows start script

---

**🎉 Your quiz application is ready to use!**

