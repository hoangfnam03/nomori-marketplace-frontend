# Nomori Marketplace Frontend

Angular 18 frontend foundation for Nomori Marketplace. The repository is feature-oriented: the application shell, HTTP behavior and auth plumbing are configured once so feature teams can work mostly under `src/app/storefront`, `src/app/admin` or a future feature boundary.

## Prerequisites

- Node `24.19.0` and npm `11.x`
- Nomori Marketplace backend running at `https://localhost:7014`

## Run locally

```powershell
npm install
npm start
```

Open `http://localhost:4200`. Requests under `/api` use `proxy.conf.json` and are forwarded to the backend. The app is SSR-ready and has lazy-loaded `/storefront` and `/admin` boundaries.

## Validation

```powershell
npm run typecheck
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

## Where code belongs

- `src/app/core`: providers, API boundary, cookie credentials, CSRF and cross-cutting HTTP behavior.
- `src/app/layout`: shell and navigation only.
- `src/app/shared`: reusable UI primitives without feature business rules.
- `src/app/storefront`: customer-facing features and routes.
- `src/app/admin`: operational features and routes.
- `docs/frontend-architecture.md`: feature and API conventions.

Do not put API URLs, cookie handling, CSRF logic or business rules in components. Use a facade/data-access service and expose explicit loading, data, empty, error and forbidden states.
