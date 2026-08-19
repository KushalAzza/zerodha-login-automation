const { Builder, By, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const { KiteConnect } = require('kiteconnect');
const { TOTPGenerator } = require('./auth-utils');
const config = require('./config');

class ZerodhaLoginAutomation {
  constructor() {
    this.config = config;
    this.kite = new KiteConnect({ api_key: this.config.apiKey });
    this.totp = new TOTPGenerator(this.config.totpSecret);
    this.driver = null;
    this.accessToken = null;
    this.requestToken = null;
    
    // Try to load access token from .env file
    this.loadAccessTokenFromEnv();
  }

  /**
   * Load access token from .env file
   */
  loadAccessTokenFromEnv() {
    try {
      const { TokenStorage } = require('./auth-utils');
      const tokenStorage = new TokenStorage();
      const accessToken = tokenStorage.loadAccessTokenFromEnv();
      
      if (accessToken) {
        this.accessToken = accessToken;
        this.kite.setAccessToken(accessToken);
        console.log('✅ Access token loaded from .env file');
      }
    } catch (error) {
      console.log('No access token found in .env file');
    }
  }

  /**
   * Initialize the automation
   */
  async initialize() {
    try {
      console.log('Initializing Zerodha Login Automation...');
      
      if (this.config.os === 'linux' && !this.config.headless) {
        const display = process.env.DISPLAY;
        const wayland = process.env.WAYLAND_DISPLAY;
        if (display) {
          console.log(`X11 display: ${display}`);
        } else if (wayland) {
          console.log(`Wayland display: ${wayland}`);
        } else {
          console.log('No DISPLAY or WAYLAND_DISPLAY set; Firefox may fail to open a window.');
        }
      }

      this.config.validateConfig();
      console.log(`Configuration validated for ${this.config.os}`);
    } catch (error) {
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Get OS-specific Firefox configuration
   */
  getFirefoxConfig() {
    const ubuntuWorkarounds = this.config.useUbuntuFirefoxWorkarounds;

    return {
      binaryPath: this.config.firefoxBinary || undefined,
      userAgent: this.config.userAgent,
      preferences: ubuntuWorkarounds ? {
        'browser.tabs.remote.autostart': false,
        'browser.tabs.remote.autostart.2': false,
        'browser.tabs.remote.force-enable': false,
        'media.peerconnection.enabled': false,
        'media.navigator.enabled': false,
        'gfx.direct2d.disabled': true,
        'layers.acceleration.disabled': true,
        'layers.offmainthreadcomposition.enabled': false,
        'gfx.webrender.all': false,
        'gfx.webrender.enabled': false
      } : {},
      arguments: ubuntuWorkarounds ? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ] : [],
      geckoDriverPath: this.config.geckoDriverPath || undefined
    };
  }

  /**
   * Launch Firefox browser with OS-specific configuration
   */
  async launchBrowser() {
    try {
      console.log(`Launching Firefox with GeckoDriver on ${this.config.os}...`);
      
      // Configure Firefox options
      const options = new firefox.Options();
      const firefoxConfig = this.getFirefoxConfig();
      
      // Use Firefox profile if specified in .env, otherwise use default
      if (this.config.firefoxProfilePath && this.config.firefoxProfilePath.trim() !== '') {
        options.setProfile(this.config.firefoxProfilePath);
        console.log(`Using Firefox profile: ${this.config.firefoxProfilePath}`);
      } else {
        console.log('Using default Firefox profile (no custom profile specified)');
      }
      
      if (this.config.headless) {
        options.addArguments('-headless');
        console.log('Running in headless mode');
      } else {
        console.log('Running in non-headless mode - browser will be visible');
      }
      
      if (firefoxConfig.binaryPath) {
        options.setBinary(firefoxConfig.binaryPath);
        console.log(`Using Firefox binary: ${firefoxConfig.binaryPath}`);
      }
      
      // Common Firefox preferences
      options.setPreference('dom.webdriver.enabled', false);
      options.setPreference('useAutomationExtension', false);
      options.setPreference('general.useragent.override', firefoxConfig.userAgent);
      
      // OS-specific preferences
      Object.entries(firefoxConfig.preferences).forEach(([key, value]) => {
        options.setPreference(key, value);
      });
      
      firefoxConfig.arguments.forEach(arg => {
        options.addArguments(arg);
      });

      let service = null;
      if (firefoxConfig.geckoDriverPath) {
        service = new firefox.ServiceBuilder(firefoxConfig.geckoDriverPath);
        console.log(`Using GeckoDriver: ${firefoxConfig.geckoDriverPath}`);
      }
      
      // Build the driver
      const builder = new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options);
      
      if (service) {
        builder.setFirefoxService(service);
      }
      
      this.driver = await builder.build();
      
      // Set window size
      await this.driver.manage().window().setRect({ width: 1366, height: 768 });
      
      console.log('✅ Firefox browser launched successfully');
      return this.driver;
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error.message}`);
    }
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin() {
    try {
      console.log('Navigating to Zerodha login page...');
      const loginUrl = this.kite.getLoginURL();
      console.log('Login URL:', loginUrl);
      
      await this.driver.get(loginUrl);
      
      // Wait for page to load
      await this.driver.wait(until.titleContains(''), 15000);
      console.log('✅ Login page loaded successfully');
    } catch (error) {
      throw new Error(`Failed to navigate to login page: ${error.message}`);
    }
  }

  /**
   * Fill login form with delays
   */
  async fillLoginForm() {
    try {
      console.log('Filling login form...');
      
      // Wait for and fill user ID
      console.log('Entering user ID...');
      const useridSelectors = [
        'input[type="text"]',
        'input[name="userid"]',
        '#userid',
        'input[placeholder*="user"]',
        'input[placeholder*="User"]'
      ];
      
      let useridInput = null;
      for (const selector of useridSelectors) {
        try {
          useridInput = await this.driver.wait(
            until.elementLocated(By.css(selector)),
            3000
          );
          console.log(`Found user ID input with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!useridInput) {
        throw new Error('Could not find user ID input field');
      }
      
      await useridInput.clear();
      await useridInput.sendKeys(this.config.userId);
      console.log('✅ User ID entered');
      
      // Add delay after entering user ID
      console.log('⏳ Waiting 3 seconds after entering user ID...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Wait for and fill password
      console.log('Entering password...');
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        'input[placeholder*="password"]',
        'input[placeholder*="Password"]'
      ];
      
      let passwordInput = null;
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await this.driver.wait(
            until.elementLocated(By.css(selector)),
            3000
          );
          console.log(`Found password input with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!passwordInput) {
        throw new Error('Could not find password input field');
      }
      
      await passwordInput.clear();
      await passwordInput.sendKeys(this.config.password);
      console.log('✅ Password entered');
      
      // Add delay after entering password
      console.log('⏳ Waiting 3 seconds after entering password...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Click login button
      console.log('Clicking login button...');
      const buttonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.login-btn',
        'button:contains("Login")',
        'button:contains("Sign In")'
      ];
      
      let loginButton = null;
      for (const selector of buttonSelectors) {
        try {
          loginButton = await this.driver.wait(
            until.elementLocated(By.css(selector)),
            3000
          );
          console.log(`Found login button with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!loginButton) {
        throw new Error('Could not find login button');
      }
      
      await loginButton.click();
      console.log('✅ Login button clicked');
      
    } catch (error) {
      throw new Error(`Failed to fill login form: ${error.message}`);
    }
  }

  /**
   * Handle TOTP input with delays
   */
  async handleTOTP() {
    try {
      console.log('Handling TOTP authentication...');
      
      // Wait for TOTP input field
      const totpSelectors = [
        'input[type="number"]',
        'input[id="userid"]',
        '#userid',
        'input[placeholder="••••••"]',
        'input[type="text"]',
        'input[name="pin"]',
        '#pin',
        'input[placeholder*="OTP"]',
        'input[placeholder*="TOTP"]',
        'input[placeholder*="code"]',
        'input[placeholder*="Code"]'
      ];
      
      let totpInput = null;
      for (const selector of totpSelectors) {
        try {
          totpInput = await this.driver.wait(
            until.elementLocated(By.css(selector)),
            5000
          );
          console.log(`Found TOTP input with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!totpInput) {
        throw new Error('Could not find TOTP input field');
      }
      
      // Add delay before entering TOTP
      console.log('⏳ Waiting 3 seconds before entering TOTP...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate TOTP
      const totpCode = this.totp.generateCurrentTOTP();
      console.log(`Generated TOTP: ${totpCode}`);
      
      // Add 1 second delay after TOTP generation
      console.log('⏳ Waiting 1 second after TOTP generation...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await totpInput.clear();
      await totpInput.sendKeys(totpCode);
      console.log('✅ TOTP entered');
      
      // Add delay for automatic redirect
      console.log('⏳ Waiting 2 seconds for automatic redirect...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ TOTP entered - waiting for automatic redirect to localhost...');
      
    } catch (error) {
      throw new Error(`Failed to handle TOTP: ${error.message}`);
    }
  }

  /**
   * Extract request token from redirect URL
   */
  async extractRequestToken() {
    try {
      console.log('Waiting for redirect and extracting request token...');
      
      // Wait for any URL change that might contain request_token
      let currentUrl = '';
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds
      
      while (attempts < maxAttempts) {
        try {
          currentUrl = await this.driver.getCurrentUrl();
          console.log(`Current URL (attempt ${attempts + 1}): ${currentUrl}`);
          
          // Check for request_token in URL
          if (currentUrl.includes('request_token')) {
            const match = currentUrl.match(/request_token=([^&]+)/);
            if (match) {
              this.requestToken = match[1];
              console.log('✅ Request token extracted');
              return this.requestToken;
            }
          }
          
          // Check for other possible redirect patterns
          if (currentUrl.includes('success') || currentUrl.includes('callback')) {
            console.log('Found success/callback URL, checking for token...');
            // Try to extract token from page content
            const pageSource = await this.driver.getPageSource();
            const tokenMatch = pageSource.match(/request_token["\s]*[:=]["\s]*([^"&\s]+)/);
            if (tokenMatch) {
              this.requestToken = tokenMatch[1];
              console.log('✅ Request token extracted from page content');
              return this.requestToken;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
          
        } catch (error) {
          console.log(`Error checking URL (attempt ${attempts + 1}): ${error.message}`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      throw new Error(`Request token not found after ${maxAttempts} attempts`);
      
    } catch (error) {
      throw new Error(`Failed to extract request token: ${error.message}`);
    }
  }

  /**
   * Generate session using request token
   */
  async generateSession() {
    try {
      console.log('Generating session with request token...');
      
      const response = await this.kite.generateSession(
        this.requestToken, 
        this.config.apiSecret
      );
      
      this.accessToken = response.access_token;
      this.kite.setAccessToken(this.accessToken);
      
      console.log('✅ Session generated successfully');
      
      // Save access token to .env file
      const { TokenStorage } = require('./auth-utils');
      const tokenStorage = new TokenStorage();
      tokenStorage.saveAccessTokenToEnv(this.accessToken);
      
      return response;
      
    } catch (error) {
      throw new Error(`Session generation failed: ${error.message}`);
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.driver) {
      console.log('Closing browser...');
      await this.driver.quit();
      console.log('✅ Browser closed');
    }
  }

  /**
   * Perform complete login process
   */
  async performLogin() {
    try {
      console.log('=== Starting Zerodha Login Automation ===');
      
      // Launch browser
      await this.launchBrowser();
      
      // Navigate to login page
      await this.navigateToLogin();
      
      // Fill login form
      await this.fillLoginForm();
      
      // Handle TOTP
      await this.handleTOTP();
      
      // Extract request token
      await this.extractRequestToken();
      
      // Generate session
      await this.generateSession();
      
      console.log('✅ Zerodha login automation completed successfully!');
      
      return {
        success: true,
        accessToken: this.accessToken,
        requestToken: this.requestToken
      };
      
    } catch (error) {
      console.error('❌ Zerodha login automation failed:', error.message);
      throw error;
    }
  }
}

module.exports = ZerodhaLoginAutomation;