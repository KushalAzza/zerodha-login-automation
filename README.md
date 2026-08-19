# Zerodha Login Automation

Logs into [Zerodha Kite](https://kite.zerodha.com) with Firefox, fills TOTP, and writes the Kite Connect access token to `.env`.

Runs on **macOS** and **Linux desktops** (Ubuntu with GNOME, other GNOME sessions, KDE, and similar). Windows is not supported.

This project is login-only. It does not place orders, fetch positions, or download market data.

## What it does

1. Opens Firefox and goes to the Kite Connect login URL.
2. Enters user ID and password.
3. Generates a TOTP from `TOTP_SECRET` and submits it.
4. Reads `request_token` from the redirect URL.
5. Exchanges that for an access token and saves it as `ACCESS_TOKEN` in `.env`.

```
zerodha-login-automation/
├── .gitignore
├── LICENSE
├── README.md
├── env.example
├── index.js
├── package.json
└── utils/
    ├── auth-utils.js    # TOTP + ACCESS_TOKEN persistence
    ├── auto-login.js    # Firefox / Selenium login flow
    ├── config.js
    └── platform.js      # macOS / Linux Firefox and GeckoDriver paths
```

The OS is detected from the machine (`darwin` or `linux`). You do not need to set `OS` unless you want to override that.

## Prerequisites

- macOS, or a Linux desktop with a graphical session (X11 or Wayland)
- Node.js 18 or later
- Firefox
- [GeckoDriver](https://github.com/mozilla/geckodriver) on `PATH`, or set `GECKODRIVER_PATH`
- A [Kite Connect](https://developers.kite.trade) app (`API_KEY`, `API_SECRET`)
- Zerodha user ID, password, and TOTP secret

macOS:

```bash
brew install --cask firefox
brew install geckodriver
```

Firefox can also be installed from [mozilla.org](https://www.mozilla.org/firefox/). The default binary path is `/Applications/Firefox.app/Contents/MacOS/firefox`.

Linux: install Firefox and GeckoDriver from your distro, or set `FIREFOX_BINARY` and `GECKODRIVER_PATH`. Snap Firefox on Ubuntu still uses the extra Firefox flags this project already had.

## Setup

```bash
npm install
cp env.example .env
```

Fill `.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `API_KEY` | yes | Kite Connect API key |
| `API_SECRET` | yes | Kite Connect API secret |
| `USER_ID` | yes | Zerodha user ID |
| `PASSWORD` | yes | Zerodha password |
| `TOTP_SECRET` | yes | Authenticator secret used to generate TOTP |
| `OS` | no | Override auto-detect: `macos`, `linux`, or `ubuntu` |
| `HEADLESS` | no | `true` to hide the browser (default `false`) |
| `FIREFOX_PROFILE_PATH` | no | Existing Firefox profile |
| `FIREFOX_BINARY` | no | Path to the Firefox binary |
| `GECKODRIVER_PATH` | no | Path to GeckoDriver |
| `DISPLAY` | no | Linux X11 display, if it is not already in the environment |
| `WAYLAND_DISPLAY` | no | Linux Wayland display, if it is not already in the environment |
| `ACCESS_TOKEN` | no | Written by a successful login |

`OS=ubuntu` keeps the older Snap/Firefox workarounds. Leave `OS` empty to detect macOS or Linux automatically.

Never commit `.env`.

## Usage

```bash
npm run login
```

Same as `node index.js`. On success, `ACCESS_TOKEN` is updated in `.env`.

Programmatic:

```javascript
const ZerodhaLoginAutomation = require('./utils/auto-login');

async function login() {
  const automation = new ZerodhaLoginAutomation();
  await automation.initialize();
  const result = await automation.performLogin();
  await automation.closeBrowser();
  return result.accessToken;
}
```

## Troubleshooting

- **Login fails:** check `USER_ID`, `PASSWORD`, and `TOTP_SECRET`.
- **Browser does not start:** install Firefox and GeckoDriver. On Linux you need a graphical session (`DISPLAY` or `WAYLAND_DISPLAY`). Set `FIREFOX_BINARY` / `GECKODRIVER_PATH` if they are not found automatically.
- **No `request_token`:** the Kite Connect app redirect URL must be reachable from the browser session.

## License

MIT. See [LICENSE](LICENSE).
