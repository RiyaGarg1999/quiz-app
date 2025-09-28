// Helper script to toggle OAuth mode
// Usage: node toggle-oauth.js enable|disable [client-id]

const fs = require('fs');
const path = require('path');

const mode = process.argv[2];
const clientId = process.argv[3];

if (!mode || !['enable', 'disable'].includes(mode)) {
    console.log('❌ Please specify "enable" or "disable"');
    console.log('Usage:');
    console.log('  node toggle-oauth.js disable');
    console.log('  node toggle-oauth.js enable YOUR_CLIENT_ID.apps.googleusercontent.com');
    process.exit(1);
}

if (mode === 'enable' && !clientId) {
    console.log('❌ Client ID is required when enabling OAuth');
    console.log('Usage: node toggle-oauth.js enable YOUR_CLIENT_ID.apps.googleusercontent.com');
    process.exit(1);
}

try {
    // Load existing config
    const configPath = path.join(__dirname, 'config.json');
    let config = {};
    
    if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configData);
    } else {
        // Create default config
        config = {
            oauth: "disable",
            app: {
                name: "Quiz Application",
                version: "1.0.0",
                description: "Timed quiz application with optional Gmail verification"
            },
            security: {
                requireGmailVerification: false,
                allowedEmailDomains: ["gmail.com"]
            },
            quiz: {
                timeLimit: 600,
                sessionValidityHours: 24
            }
        };
    }
    
    // Update configuration
    config.oauth = mode;
    
    if (mode === 'enable') {
        config.security.requireGmailVerification = true;
        
        // Create/update .env file
        const envContent = `# Google OAuth Configuration
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Application Configuration
NODE_ENV=development
PORT=3000`;
        
        const envPath = path.join(__dirname, '.env');
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Created/updated .env file with Client ID');
        console.log('⚠️  Remember to add your GOOGLE_CLIENT_SECRET to .env');
    } else {
        config.security.requireGmailVerification = false;
    }
    
    // Save updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ OAuth ${mode}d successfully!`);
    console.log(`📋 Current configuration:`);
    console.log(`   - OAuth: ${config.oauth}`);
    console.log(`   - Require Gmail verification: ${config.security.requireGmailVerification}`);
    console.log(`   - Allowed domains: ${config.security.allowedEmailDomains.join(', ')}`);
    
    if (mode === 'enable') {
        console.log('\n🚀 Next steps:');
        console.log('1. Add your GOOGLE_CLIENT_SECRET to the .env file');
        console.log('2. Restart your application: npm start');
        console.log('3. Test Google Sign-In on a quiz session');
    } else {
        console.log('\n🚀 Next steps:');
        console.log('1. Restart your application: npm start');
        console.log('2. Quiz will now accept any valid email address');
    }
    
} catch (error) {
    console.error('❌ Error updating configuration:', error.message);
    process.exit(1);
}
