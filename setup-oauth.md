# Quick OAuth Setup Steps

## After getting your Google Client ID:

1. Create .env file in project root with:
```
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
NODE_ENV=development
PORT=3000
```

2. Replace the placeholder in quiz.html:
   - Find: your_google_client_id_here.apps.googleusercontent.com
   - Replace with: your_actual_client_id.apps.googleusercontent.com

3. Test the setup:
```bash
npm start
```

## Locations to update Client ID in quiz.html:
- Line ~305: data-client_id attribute
- Line ~471: google.accounts.id.initialize
- Line ~491: google.accounts.id.initialize
