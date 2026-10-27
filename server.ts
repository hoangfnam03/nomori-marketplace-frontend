import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { DEFAULT_LANG, REQUEST_LANG, readLangCookie } from './src/app/core/i18n/i18n.providers';
import { SITE_ORIGIN } from './src/app/core/seo/site-origin';

// Where the API is: crawlers ask the storefront for sitemap.xml and robots.txt, and the canonical address of a page is asked from the API.
const API_ORIGIN = (process.env['API_ORIGIN'] ?? 'http://localhost:5214').replace(/\/$/, '');
const API_TIMEOUT_MS = 3000;
// The address visitors use (https://shop.example.com). Needed behind a proxy or a tunnel; without it the address of the request is used.
const PUBLIC_URL = process.env['PUBLIC_URL']?.replace(/\/$/, '');

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // While a page is rendered here, its data requests (/api/...) go to this server first (relative addresses are resolved against the request),
  // and are passed on to the API. Only reads: visitors' own browsers reach the API in the way the deployment sets up (proxy or gateway).
  server.get('/api/*', async (req, res, next) => {
    try {
      const upstream = await fetch(`${API_ORIGIN}${req.originalUrl}`, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      res.status(upstream.status);
      const type = upstream.headers.get('content-type');
      if (type) res.type(type);
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      next(error);
    }
  });

  // sitemap.xml and robots.txt are made by the API.
  server.get(['/sitemap.xml', '/robots.txt'], async (req, res, next) => {
    try {
      const upstream = await fetch(`${API_ORIGIN}${req.path}`, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      res.status(upstream.status)
        .type(upstream.headers.get('content-type') ?? 'text/plain')
        .set('Cache-Control', 'public, max-age=3600')
        .send(await upstream.text());
    } catch (error) {
      next(error);
    }
  });

  // A product or shop page is answered at its canonical address: an old name, a bare id or another letter case gets a 301, and a page that
  // is not public gets a 404. If the API cannot be asked, the page is still rendered and the browser corrects the address.
  server.get(/^\/storefront\/(products|vendors)\/([^/?#]+)\/?$/, async (req, res, next) => {
    const type = req.params[0] === 'products' ? 'product' : 'vendor';
    try {
      const url = `${API_ORIGIN}/api/v1/seo/path?type=${type}&key=${encodeURIComponent(req.params[1])}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      if (upstream.ok) {
        const path = (await upstream.json()) as { found: boolean; canonicalPath: string; isCanonical: boolean };
        if (path.found && !path.isCanonical) {
          const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
          res.redirect(301, path.canonicalPath + query);
          return;
        }
        if (!path.found) res.status(404);
      }
    } catch {
      // Not fatal: see above.
    }
    next();
  });

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    // The page is rendered at this server's own address, so that its data requests (/api/...) come straight back here and are passed on to the API
    // without leaving the machine. The address visitors use is given separately, for canonical links and social tags.
    const internalUrl = `http://localhost:${process.env['PORT'] || 4000}${originalUrl}`;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: internalUrl,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: REQUEST_LANG, useValue: readLangCookie(headers.cookie) ?? DEFAULT_LANG },
          { provide: SITE_ORIGIN, useValue: PUBLIC_URL ?? `${protocol}://${headers.host}` },
        ],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
