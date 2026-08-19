const totp = require('totp-generator');
require('dotenv').config();

class TOTPGenerator {
  constructor(secret) {
    this.secret = secret;
  }

  generateCurrentTOTP() {
    try {
      return totp(this.secret);
    } catch (error) {
      console.error('Error generating TOTP:', error.message);
      throw error;
    }
  }
}

class TokenStorage {
  loadAccessTokenFromEnv() {
    return process.env.ACCESS_TOKEN || null;
  }

  saveAccessTokenToEnv(accessToken) {
    try {
      const fs = require('fs');
      const path = require('path');

      const envPath = path.join(__dirname, '..', '.env');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (envContent.includes('ACCESS_TOKEN=')) {
        envContent = envContent.replace(/ACCESS_TOKEN=.*/, `ACCESS_TOKEN=${accessToken}`);
      } else {
        envContent += `\nACCESS_TOKEN=${accessToken}`;
      }

      fs.writeFileSync(envPath, envContent);
      return true;
    } catch (error) {
      console.error('Error saving access token:', error.message);
      return false;
    }
  }
}

module.exports = { TOTPGenerator, TokenStorage };
