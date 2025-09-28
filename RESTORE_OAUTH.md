# How to Re-enable Gmail OAuth Verification

## Current Status
Gmail OAuth verification has been temporarily disabled to allow testing without Google Cloud setup.

## To Re-enable Gmail Verification:

### 1. Complete Google Cloud Setup
- Follow the steps in `GOOGLE_OAUTH_SETUP.md`
- Get your Google Client ID and Client Secret

### 2. Update Configuration Files

**Create `.env` file:**
```
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
NODE_ENV=development
PORT=3000
```

### 3. Restore OAuth UI (in public/quiz.html)

Replace the simple email input section (around line 301) with the Google Sign-In button:

```html
<div style="margin-bottom: 20px;">
    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Gmail Account *</label>
    <div id="googleSignInContainer" style="margin-bottom: 12px;">
        <div id="g_id_onload"
             data-client_id="YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com"
             data-callback="handleCredentialResponse"
             data-auto_prompt="false">
        </div>
        <div class="g_id_signin"></div>
    </div>
    <div id="verifiedEmailInfo" style="display: none;">
        <!-- Gmail verification UI -->
    </div>
    <input type="hidden" id="studentEmail" required>
    <input type="hidden" id="googleId">
    <input type="hidden" id="emailVerified" value="false">
</div>
```

### 4. Restore Server Validation (in server.js around line 503)

Uncomment these lines:
```javascript
// Validate Gmail verification
if (!emailVerified || !googleId) {
  return res.status(400).json({ error: 'Please verify your Gmail account first' });
}

// Ensure it's a Gmail account
if (!studentEmail.endsWith('@gmail.com')) {
  return res.status(400).json({ error: 'Only Gmail accounts are allowed for this quiz' });
}
```

### 5. Restore Client-side Validation (in public/quiz.html)

Replace the simple email validation with OAuth validation:
```javascript
// Check if Gmail is verified
if (!emailVerified || !googleUserInfo) {
    alert('Please verify your Gmail account first by clicking the "Sign in with Google" button.');
    return;
}

// Ensure it's a Gmail account
if (!studentEmail.endsWith('@gmail.com')) {
    alert('Only Gmail accounts are allowed for this quiz.');
    return;
}
```

## Quick Script
You can use the helper script:
```bash
node update-client-id.js YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
```

This will automatically update the Client ID and create the .env file.
