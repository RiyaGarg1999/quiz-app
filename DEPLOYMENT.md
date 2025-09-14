<<<<<<< HEAD
# Quiz Application - Deployment Guide

## 🚀 Local Development Setup

### Prerequisites
1. **Install Node.js**: Download and install from https://nodejs.org/
   - Choose the LTS version (recommended)
   - This will also install npm (Node Package Manager)

### Running Locally

1. **Open Terminal/Command Prompt** in the project directory:
   ```bash
   cd C:\Users\riyaga\quiz-app
   ```

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
   - The server will create the database automatically on first run

### Verify Installation
Run these commands to check if Node.js is properly installed:
```bash
node --version
npm --version
```

## 📁 GitHub Repository Setup

### 1. Create GitHub Repository

1. Go to https://github.com and create a new repository
2. Name it something like `quiz-application` or `timed-quiz-app`
3. Don't initialize with README (we already have one)

### 2. Upload Your Code

**Option A: Using Git Command Line**
```bash
# Initialize git in your project folder
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Quiz application with question management"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Option B: Using GitHub Desktop**
1. Download GitHub Desktop
2. Click "Add existing repository"
3. Select your quiz-app folder
4. Publish to GitHub

**Option C: Upload via Web Interface**
1. Zip your entire `quiz-app` folder
2. Go to your GitHub repository
3. Click "uploading an existing file"
4. Drag and drop your files

### 3. Add .gitignore File
Create a `.gitignore` file to exclude unnecessary files:

```
node_modules/
*.db
certificates/
.env
.DS_Store
Thumbs.db
```

## 🌐 Deployment Options

### Option 1: Heroku (Free Tier Available)

1. **Create Heroku Account**: https://heroku.com

2. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli

3. **Prepare for Heroku**:
   ```bash
   # Add start script to package.json (already included)
   # Create Procfile
   echo "web: node server.js" > Procfile
   ```

4. **Deploy**:
   ```bash
   heroku login
   heroku create your-quiz-app-name
   git push heroku main
   heroku open
   ```

5. **Configure Environment**:
   ```bash
   heroku config:set NODE_ENV=production
   ```

### Option 2: Vercel (Free)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/server.js"
       }
     ]
   }
   ```

3. **Deploy**:
   ```bash
   vercel login
   vercel --prod
   ```

### Option 3: Netlify (With Serverless Functions)

1. **Restructure for Netlify**:
   - Move API routes to `/netlify/functions/`
   - Use Netlify Functions for backend

2. **Deploy**: Connect your GitHub repository to Netlify

### Option 4: Railway (Free Tier)

1. **Go to**: https://railway.app
2. **Connect GitHub repository**
3. **Deploy automatically**

### Option 5: Render (Free)

1. **Go to**: https://render.com
2. **Connect GitHub repository**
3. **Configure build and start commands**

## 🔧 Production Configuration

### Environment Variables
Create a `.env` file for production:
```
PORT=3000
NODE_ENV=production
ADMIN_EMAIL=your-admin@email.com
```

### Database for Production
For production, consider upgrading from SQLite to:
- PostgreSQL (Heroku Postgres)
- MongoDB (MongoDB Atlas)
- MySQL (PlanetScale)

### Security Enhancements
```bash
npm install helmet express-rate-limit
```

Add to server.js:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📋 Quick Deployment Checklist

- [ ] Node.js installed locally
- [ ] Application runs locally on http://localhost:3000
- [ ] Code pushed to GitHub repository
- [ ] Environment variables configured
- [ ] Production database setup (if needed)
- [ ] Domain name configured (optional)
- [ ] SSL certificate enabled
- [ ] Monitoring setup (optional)

## 🆘 Troubleshooting

### Node.js Not Found
- Restart your terminal after installing Node.js
- Check if Node.js is in your system PATH
- Try running the setup.bat file

### Port Issues
- Change PORT in server.js if 3000 is occupied
- Or set environment variable: `PORT=8080`

### Database Issues
- Delete `quiz.db` file and restart to reset database
- Check file permissions in certificates folder

### Deployment Issues
- Ensure all dependencies are in package.json
- Check logs: `heroku logs --tail` (for Heroku)
- Verify environment variables are set

## 🎯 Recommended Deployment Flow

**For Beginners:**
1. Deploy to Heroku (easiest, good documentation)
2. Use GitHub integration for automatic deployments

**For Advanced Users:**
1. Deploy to Railway or Render (modern platforms)
2. Set up CI/CD with GitHub Actions
3. Use production database

## 📧 Support

If you encounter issues:
1. Check the logs for error messages
2. Ensure all environment variables are set
3. Verify database connectivity
4. Test locally first before deploying

---

**Your quiz application is now ready for deployment! 🎉**
=======
# Quiz Application - Deployment Guide

## 🚀 Local Development Setup

### Prerequisites
1. **Install Node.js**: Download and install from https://nodejs.org/
   - Choose the LTS version (recommended)
   - This will also install npm (Node Package Manager)

### Running Locally

1. **Open Terminal/Command Prompt** in the project directory:
   ```bash
   cd C:\Users\riyaga\quiz-app
   ```

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
   - The server will create the database automatically on first run

### Verify Installation
Run these commands to check if Node.js is properly installed:
```bash
node --version
npm --version
```

## 📁 GitHub Repository Setup

### 1. Create GitHub Repository

1. Go to https://github.com and create a new repository
2. Name it something like `quiz-application` or `timed-quiz-app`
3. Don't initialize with README (we already have one)

### 2. Upload Your Code

**Option A: Using Git Command Line**
```bash
# Initialize git in your project folder
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Quiz application with question management"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Option B: Using GitHub Desktop**
1. Download GitHub Desktop
2. Click "Add existing repository"
3. Select your quiz-app folder
4. Publish to GitHub

**Option C: Upload via Web Interface**
1. Zip your entire `quiz-app` folder
2. Go to your GitHub repository
3. Click "uploading an existing file"
4. Drag and drop your files

### 3. Add .gitignore File
Create a `.gitignore` file to exclude unnecessary files:

```
node_modules/
*.db
certificates/
.env
.DS_Store
Thumbs.db
```

## 🌐 Deployment Options

### Option 1: Heroku (Free Tier Available)

1. **Create Heroku Account**: https://heroku.com

2. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli

3. **Prepare for Heroku**:
   ```bash
   # Add start script to package.json (already included)
   # Create Procfile
   echo "web: node server.js" > Procfile
   ```

4. **Deploy**:
   ```bash
   heroku login
   heroku create your-quiz-app-name
   git push heroku main
   heroku open
   ```

5. **Configure Environment**:
   ```bash
   heroku config:set NODE_ENV=production
   ```

### Option 2: Vercel (Free)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/server.js"
       }
     ]
   }
   ```

3. **Deploy**:
   ```bash
   vercel login
   vercel --prod
   ```

### Option 3: Netlify (With Serverless Functions)

1. **Restructure for Netlify**:
   - Move API routes to `/netlify/functions/`
   - Use Netlify Functions for backend

2. **Deploy**: Connect your GitHub repository to Netlify

### Option 4: Railway (Free Tier)

1. **Go to**: https://railway.app
2. **Connect GitHub repository**
3. **Deploy automatically**

### Option 5: Render (Free)

1. **Go to**: https://render.com
2. **Connect GitHub repository**
3. **Configure build and start commands**

## 🔧 Production Configuration

### Environment Variables
Create a `.env` file for production:
```
PORT=3000
NODE_ENV=production
ADMIN_EMAIL=your-admin@email.com
```

### Database for Production
For production, consider upgrading from SQLite to:
- PostgreSQL (Heroku Postgres)
- MongoDB (MongoDB Atlas)
- MySQL (PlanetScale)

### Security Enhancements
```bash
npm install helmet express-rate-limit
```

Add to server.js:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📋 Quick Deployment Checklist

- [ ] Node.js installed locally
- [ ] Application runs locally on http://localhost:3000
- [ ] Code pushed to GitHub repository
- [ ] Environment variables configured
- [ ] Production database setup (if needed)
- [ ] Domain name configured (optional)
- [ ] SSL certificate enabled
- [ ] Monitoring setup (optional)

## 🆘 Troubleshooting

### Node.js Not Found
- Restart your terminal after installing Node.js
- Check if Node.js is in your system PATH
- Try running the setup.bat file

### Port Issues
- Change PORT in server.js if 3000 is occupied
- Or set environment variable: `PORT=8080`

### Database Issues
- Delete `quiz.db` file and restart to reset database
- Check file permissions in certificates folder

### Deployment Issues
- Ensure all dependencies are in package.json
- Check logs: `heroku logs --tail` (for Heroku)
- Verify environment variables are set

## 🎯 Recommended Deployment Flow

**For Beginners:**
1. Deploy to Heroku (easiest, good documentation)
2. Use GitHub integration for automatic deployments

**For Advanced Users:**
1. Deploy to Railway or Render (modern platforms)
2. Set up CI/CD with GitHub Actions
3. Use production database

## 📧 Support

If you encounter issues:
1. Check the logs for error messages
2. Ensure all environment variables are set
3. Verify database connectivity
4. Test locally first before deploying

---

**Your quiz application is now ready for deployment! 🎉**
>>>>>>> ec22607a987fa221ffd9015df618f7f5fddfa28a
