# Nomori Marketplace Frontend Architecture

## Purpose

This repository is the Angular frontend for Nomori Marketplace. It is an independent application that consumes the Nomori Marketplace API through `/api`.

## Boundaries

```text
src/app/
  core/       app-wide providers, HTTP, auth and API boundaries
  layout/     shell and navigation
  shared/     reusable UI primitives with no feature business rules
  storefront/ lazy storefront route boundary
  admin/      lazy admin route boundary
```

Feature work belongs inside the relevant lazy boundary. A feature should expose its routes from a `*.routes.ts` file and keep API orchestration in `data-access` or a facade. Components render state and emit intent; they do not build URLs, manage cookies or implement business rules.

## Request flow

1. A feature facade calls a core or feature data-access service.
2. `HttpClient` sends requests through the configured interceptors.
3. Credentials are included for the backend HttpOnly cookie session.
4. Unsafe API requests obtain a CSRF token when needed and send `X-CSRF-TOKEN`.
5. API errors are normalized without exposing server internals to templates.

## Adding a feature

```text
src/app/storefront/catalog/
  pages/
  components/
  data-access/
  models/
  catalog.routes.ts
```

Register the feature route in the nearest boundary only. Keep URL state in router query parameters when users need shareable filters, sorting or pagination. Use Signals for local state and expose loading, data, empty, error and forbidden states explicitly.

## API client policy

The backend OpenAPI document is the source of truth. Generated client output belongs under `src/app/core/api/generated` and must not be edited by hand. Feature facades may wrap the generated client to coordinate state, caching and error mapping.

The current foundation contains a small auth/session adapter so the shell can validate the cookie and CSRF flow. Replace or extend it through the generated-client boundary when `npm run api:generate` is introduced.

## Local development

- Frontend: `http://localhost:4200`
- Backend HTTPS: `https://localhost:7014`
- `/api` is proxied to the backend by `proxy.conf.json`.
- `withCredentials` is applied centrally; features do not add cookie options.
