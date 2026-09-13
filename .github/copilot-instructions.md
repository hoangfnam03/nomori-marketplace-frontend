# Nomori Marketplace Frontend Working Agreement

- Target Angular 18 standalone components with strict TypeScript.
- Keep `/storefront` and `/admin` lazy-loaded.
- Components render state and emit intent; facades/data-access own API calls and use cases.
- Keep API URLs, credentials, CSRF and error normalization in `src/app/core`.
- Use the backend OpenAPI document as the source of truth; do not hand-edit generated client output.
- Use HttpOnly cookie authentication with centralized credentials and CSRF handling. Never put credentials or auth cookies in localStorage.
- Represent loading, data, empty, error and forbidden states explicitly.
- Route user-facing text through the future i18n boundary; do not put business rules in templates.
- Run `npm run typecheck`, `npm run build` and focused tests after changes.
