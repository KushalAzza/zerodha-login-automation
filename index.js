const ZerodhaLoginAutomation = require('./utils/auto-login');

function mask(value) {
  if (!value || value.length < 8) {
    return '(set)';
  }
  return `${value.slice(0, 6)}…`;
}

async function main() {
  const automation = new ZerodhaLoginAutomation();

  try {
    console.log('=== Starting Zerodha Login Automation ===');
    await automation.initialize();

    const loginResult = await automation.performLogin();

    if (loginResult.success) {
      console.log('Login successful.');
      console.log('Access token:', mask(loginResult.accessToken));
      console.log('Request token:', mask(loginResult.requestToken));
      console.log('ACCESS_TOKEN was written to .env');
    } else {
      console.error('Login failed');
    }
  } catch (error) {
    console.error('Login automation failed:', error.message);
  } finally {
    console.log('Keeping browser open for 5 seconds…');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await automation.closeBrowser();
  }
}

main();

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, exiting…');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, exiting…');
  process.exit(0);
});
