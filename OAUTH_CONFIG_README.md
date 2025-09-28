# OAuth Configuration System

This quiz application now supports configurable Google OAuth authentication. You can easily enable or disable Gmail verification based on your needs.

## 🔧 Configuration Options

### config.json
```json
{
  "oauth": "disable",           // "enable" or "disable"
  "app": {
    "name": "Quiz Application",
    "version": "1.0.0",
    "description": "Timed quiz application with optional Gmail verification"
  },
  "security": {
    "requireGmailVerification": true,
    "allowedEmailDomains": ["gmail.com"]    // Can add multiple domains
  },
  "quiz": {
    "timeLimit": 600,                       // 10 minutes in seconds
    "sessionValidityHours": 24
  }
}
```

## 🚀 Quick Setup Commands

### Option 1: Disable OAuth (Default)
```bash
node toggle-oauth.js disable
npm start
```

### Option 2: Enable Gmail OAuth
```bash
# Replace with your actual Google Client ID
node toggle-oauth.js enable 1234567890-abcdef.apps.googleusercontent.com
npm start
```

## 📋 How It Works

### When OAuth is **DISABLED** (oauth: "disable"):
- ✅ Students enter any valid email address
- ✅ Simple email format validation
- ✅ No Google account required
- ✅ Faster setup for testing

### When OAuth is **ENABLED** (oauth: "enable"):
- 🔐 Students must sign in with Google
- 🔐 Only verified Gmail accounts accepted
- 🔐 Token verification with Google servers
- 🔐 Auto-fills name from Google account
- 🔐 Prevents fake email submissions

## 🛠 Manual Configuration

### 1. Edit config.json
```json
{
  "oauth": "enable"  // Change to "enable" or "disable"
}
```

### 2. For OAuth Enabled - Setup .env:
```bash
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
NODE_ENV=development
PORT=3000
```

### 3. Restart Application:
```bash
npm start
```

## 🎯 User Experience

### Disabled Mode (Current Default):
1. Student fills out name, email, school
2. Basic email validation
3. Quiz starts immediately

### Enabled Mode:
1. Student fills out name and school
2. Student clicks "Sign in with Google"
3. Google OAuth popup appears
4. Email auto-filled and verified
5. Quiz starts after verification

## 📊 Admin Benefits

### Both Modes:
- CSV exports with verification status
- Real-time results tracking
- Session management

### Enabled Mode Additional Features:
- ✅ Verified Gmail addresses
- ✅ Prevents duplicate/fake emails
- ✅ Enhanced security and authenticity

## 🔄 Switching Between Modes

### Enable OAuth:
```bash
node toggle-oauth.js enable YOUR_CLIENT_ID.apps.googleusercontent.com
```

### Disable OAuth:
```bash
node toggle-oauth.js disable
```

### Check Current Status:
The application logs will show current configuration on startup:
```
Configuration loaded: { oauth: 'disable', ... }
Google OAuth is disabled in config
```

## 🔍 Troubleshooting

### Common Issues:

1. **"OAuth verification is disabled"**: OAuth is set to "disable" in config
2. **"Google OAuth client is not initialized"**: Check Client ID in .env
3. **"Please use a verified Gmail account"**: Only Gmail accounts allowed
4. **400 error from Google**: Invalid Client ID or domain not authorized

### Debug Steps:
1. Check `config.json` oauth setting
2. Verify `.env` file has correct Client ID
3. Check Google Cloud Console authorized domains
4. Look at browser console for detailed error messages

## 📝 Configuration Examples

### For Development/Testing:
```json
{
  "oauth": "disable"
}
```

### For Production with Gmail Only:
```json
{
  "oauth": "enable",
  "security": {
    "allowedEmailDomains": ["gmail.com"]
  }
}
```

### For Multiple Email Providers:
```json
{
  "oauth": "enable",
  "security": {
    "allowedEmailDomains": ["gmail.com", "outlook.com", "company.com"]
  }
}
```

## 🚨 Important Notes

- Always test your configuration before deploying
- Keep your Google Client Secret secure
- Add production domains to Google Cloud Console
- The toggle script automatically creates/updates .env files
- Configuration changes require application restart
