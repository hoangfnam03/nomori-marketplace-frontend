# Local Development

## Prerequisites

- Node `24.19.0` (see `.nvmrc`)
- npm `11.x`
- Angular CLI is installed from the project lock file
- Nomori Marketplace backend available at `https://localhost:7014`

## Start

```powershell
npm install
npm start
```

Open `http://localhost:4200`. The development server proxies `/api` to the backend and accepts the local HTTPS certificate through `secure: false` in `proxy.conf.json`.

## Validation

```powershell
npm run typecheck
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

## Authentication notes

The frontend uses the backend's HttpOnly cookie session. It does not store credentials or auth cookies in localStorage. The core CSRF interceptor obtains `/api/v1/auth/csrf` before unsafe API requests and sends the returned token together with browser-managed cookies.
