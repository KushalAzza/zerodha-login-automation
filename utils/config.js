require('dotenv').config();

const {
  detectOs,
  defaultFirefoxBinary,
  defaultGeckoDriverPath,
  usesUbuntuFirefoxWorkarounds,
  userAgentFor,
} = require('./platform');

const osName = detectOs();
const firefoxBinary = defaultFirefoxBinary(osName);
const geckoDriverPath = defaultGeckoDriverPath();

const config = {
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,

  userId: process.env.USER_ID,
  password: process.env.PASSWORD,
  totpSecret: process.env.TOTP_SECRET,

  headless: process.env.HEADLESS === 'true',
  firefoxProfilePath: process.env.FIREFOX_PROFILE_PATH,
  firefoxBinary,
  geckoDriverPath,
  os: osName,
  userAgent: userAgentFor(osName),
  useUbuntuFirefoxWorkarounds: usesUbuntuFirefoxWorkarounds(firefoxBinary),

  kiteLoginUrl: 'https://kite.zerodha.com',
  kiteApiUrl: 'https://api.kite.trade',

  pageTimeout: 30000,
  elementTimeout: 10000,

  validateConfig() {
    const required = ['apiKey', 'apiSecret', 'userId', 'password', 'totpSecret'];
    const missing = required.filter(key => !this[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    return true;
  }
};

module.exports = config;
