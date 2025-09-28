# Google OAuth Setup Guide

This guide explains how to set up Google OAuth for Gmail verification in the Quiz App.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sign-In API

## Step 2: Create OAuth 2.0 Credentials

1. In the Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Configure the authorized origins and redirect URIs:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (for local development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs:**
     - Not required for this implementation
5. Copy the **Client ID** - you'll need this

## Step 3: Configure Environment Variables

1. Create a `.env` file in your project root:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Application Configuration
NODE_ENV=development
PORT=3000
```

2. Replace the placeholder values with your actual Google OAuth credentials

## Step 4: Update Client ID in Code

Update the Google Client ID in the following files:

### In `public/quiz.html`:
Replace all instances of `your_google_client_id_here.apps.googleusercontent.com` with your actual Client ID:

```html
<!-- Line 305 -->
<div id="g_id_onload"
     data-client_id="YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com"
     data-callback="handleCredentialResponse"
     data-auto_prompt="false">
</div>

<!-- Also update in the JavaScript sections around lines 471, 491 -->
```

## Step 5: Install Dependencies

Run the following command to install the required dependencies:

```bash
npm install google-auth-library dotenv
```

## Step 6: Test the Setup

1. Start your application:
   ```bash
   npm start
   ```

2. Navigate to a quiz session
3. Try to sign in with a Gmail account
4. Verify that the Gmail verification works correctly

## Security Notes

- **Never commit your `.env` file** to version control
- Use different Client IDs for development and production
- Regularly rotate your OAuth credentials
- Only allow Gmail accounts (@gmail.com domains) as configured

## Troubleshooting

### Common Issues:

1. **"Invalid client" error**: Check that your Client ID is correct and properly configured
2. **"Unauthorized origin" error**: Ensure your domain is added to authorized JavaScript origins
3. **"Token verification failed"**: Check that your server can reach Google's verification endpoints

### Debug Mode:

Enable debug logging by checking the browser console for detailed error messages during OAuth flow.

## Production Deployment

For production deployment:

1. Add your production domain to authorized JavaScript origins
2. Update the Client ID in all files
3. Set the production environment variables
4. Test thoroughly with different Gmail accounts

## Support

If you encounter issues:
- Check the [Google Identity documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- Verify your OAuth configuration in Google Cloud Console
- Check browser console for error messages
