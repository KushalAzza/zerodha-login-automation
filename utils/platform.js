const fs = require('fs');
const os = require('os');
const path = require('path');

function firstExisting(candidates) {
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

function findOnPath(command) {
  const name = process.platform === 'win32' ? `${command}.exe` : command;
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    const full = path.join(dir, name);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return undefined;
}

function detectOs() {
  const override = (process.env.OS || '').trim().toLowerCase();

  if (['macos', 'darwin', 'mac'].includes(override)) {
    return 'macos';
  }
  if (['linux', 'ubuntu'].includes(override)) {
    return 'linux';
  }
  if (['windows', 'win32', 'win'].includes(override)) {
    return 'windows';
  }

  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'linux') return 'linux';
  if (process.platform === 'win32') return 'windows';
  return process.platform;
}

function isUbuntuOverride() {
  return (process.env.OS || '').trim().toLowerCase() === 'ubuntu';
}

function defaultFirefoxBinary(detectedOs) {
  if (process.env.FIREFOX_BINARY) {
    return process.env.FIREFOX_BINARY;
  }

  if (detectedOs === 'macos') {
    return firstExisting([
      '/Applications/Firefox.app/Contents/MacOS/firefox',
      path.join(os.homedir(), 'Applications/Firefox.app/Contents/MacOS/firefox'),
    ]);
  }

  if (detectedOs === 'linux') {
    return firstExisting([
      '/usr/bin/firefox',
      '/usr/lib/firefox/firefox',
      '/usr/lib64/firefox/firefox',
      '/snap/bin/firefox',
      '/snap/firefox/current/usr/lib/firefox/firefox',
      findOnPath('firefox'),
    ]);
  }

  return findOnPath('firefox');
}

function defaultGeckoDriverPath() {
  if (process.env.GECKODRIVER_PATH) {
    return process.env.GECKODRIVER_PATH;
  }

  return firstExisting([
    findOnPath('geckodriver'),
    '/opt/homebrew/bin/geckodriver',
    '/usr/local/bin/geckodriver',
    '/usr/bin/geckodriver',
  ]);
}

function usesUbuntuFirefoxWorkarounds(firefoxBinary) {
  if (isUbuntuOverride()) {
    return true;
  }
  return typeof firefoxBinary === 'string' && firefoxBinary.includes('/snap/');
}

function userAgentFor(detectedOs) {
  if (detectedOs === 'macos') {
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0';
  }
  if (detectedOs === 'windows') {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0';
  }
  return 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';
}

module.exports = {
  detectOs,
  defaultFirefoxBinary,
  defaultGeckoDriverPath,
  usesUbuntuFirefoxWorkarounds,
  userAgentFor,
};
