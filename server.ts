import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_FB_PAGE_ID = '61590852571494';
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function getBaseAppUrl(req: Request): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function resolveFacebookCredentials(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const pageId = (
    cookies.fb_page_id ||
    process.env.FACEBOOK_PAGE_ID ||
    DEFAULT_FB_PAGE_ID
  ).trim() || DEFAULT_FB_PAGE_ID;

  const envToken = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim();
  const cookieToken = (cookies.fb_page_token || '').trim();
  const accessToken = cookieToken || envToken;

  const appId = (process.env.FACEBOOK_APP_ID || '').trim();
  const appSecret = (process.env.FACEBOOK_APP_SECRET || '').trim();

  return {
    pageId,
    pageUrl: `https://www.facebook.com/profile.php?id=${encodeURIComponent(pageId)}`,
    accessToken,
    source: cookieToken ? 'oauth' : envToken ? 'env' : 'none',
    oauthConfigured: Boolean(appId && appSecret),
    appId,
    appSecret,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '8mb' }));

  // 1. Check Facebook Page Connection Status
  app.get('/api/facebook/status', (req: Request, res: Response) => {
    const creds = resolveFacebookCredentials(req);
    const redirectUri = `${getBaseAppUrl(req)}/auth/facebook/callback`;
    res.json({
      pageId: creds.pageId,
      pageUrl: creds.pageUrl,
      connected: Boolean(creds.accessToken),
      authSource: creds.source,
      oauthConfigured: creds.oauthConfigured,
      redirectUri,
    });
  });

  // 2. Construct Facebook OAuth Popup URL
  app.get('/api/auth/facebook/url', (req: Request, res: Response) => {
    const creds = resolveFacebookCredentials(req);
    if (!creds.oauthConfigured) {
      res.status(400).json({
        error:
          'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are not set in Secrets yet. Configure FACEBOOK_PAGE_ACCESS_TOKEN (or FACEBOOK_APP_ID + FACEBOOK_APP_SECRET) in the AI Studio Secrets panel.',
      });
      return;
    }

    const redirectUri = `${getBaseAppUrl(req)}/auth/facebook/callback`;
    const params = new URLSearchParams({
      client_id: creds.appId,
      redirect_uri: redirectUri,
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
      response_type: 'code',
      state: creds.pageId,
    });

    res.json({
      url: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
      redirectUri,
    });
  });

  // 3. OAuth Callback (Popup Flow with SameSite=None; Secure Cookie)
  app.get(['/auth/facebook/callback', '/auth/facebook/callback/'], async (req: Request, res: Response) => {
    const creds = resolveFacebookCredentials(req);
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const errReason = typeof req.query.error_description === 'string' ? req.query.error_description : '';

    if (!code || !creds.oauthConfigured) {
      res.status(400).send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
        <h3>Facebook Authorization Incomplete</h3>
        <p>${errReason || 'Authorization code missing or Meta App credentials not configured.'}</p>
        <script>setTimeout(() => window.close(), 2500);</script>
      </body></html>`);
      return;
    }

    try {
      const redirectUri = `${getBaseAppUrl(req)}/auth/facebook/callback`;
      const tokenParams = new URLSearchParams({
        client_id: creds.appId,
        redirect_uri: redirectUri,
        client_secret: creds.appSecret,
        code,
      });

      const tokenResp = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${tokenParams.toString()}`);
      const tokenJson = (await tokenResp.json()) as {
        access_token?: string;
        error?: { message?: string };
      };

      if (!tokenJson.access_token) {
        throw new Error(tokenJson.error?.message || 'Failed to exchange code for Facebook token.');
      }

      let finalPageToken = tokenJson.access_token;
      let finalPageId = creds.pageId;

      // Retrieve managed Page Access Token specifically for Page 61590852571494
      const accountsResp = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(
          tokenJson.access_token
        )}`
      );
      const accountsJson = (await accountsResp.json()) as {
        data?: Array<{ id: string; name: string; access_token?: string }>;
      };

      if (Array.isArray(accountsJson.data) && accountsJson.data.length > 0) {
        const targetPage =
          accountsJson.data.find((p) => p.id === DEFAULT_FB_PAGE_ID) ||
          accountsJson.data.find((p) => p.id === creds.pageId) ||
          accountsJson.data[0];
        if (targetPage?.access_token) {
          finalPageToken = targetPage.access_token;
          finalPageId = targetPage.id;
        }
      }

      const cookieFlags = 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=5184000';
      res.setHeader('Set-Cookie', [
        `fb_page_token=${encodeURIComponent(finalPageToken)}; ${cookieFlags}`,
        `fb_page_id=${encodeURIComponent(finalPageId)}; ${cookieFlags}`,
      ]);

      res.send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', pageId: ${JSON.stringify(finalPageId)} }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Facebook Page (${finalPageId}) connected! This window will close automatically.</p>
      </body></html>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OAuth token exchange failed';
      res.status(500).send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
        <h3>Facebook Connection Error</h3>
        <p>${msg}</p>
      </body></html>`);
    }
  });

  // 4. Disconnect OAuth Cookie
  app.post('/api/facebook/disconnect', (_req: Request, res: Response) => {
    const clearFlags = 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';
    res.setHeader('Set-Cookie', [
      `fb_page_token=; ${clearFlags}`,
      `fb_page_id=; ${clearFlags}`,
    ]);
    res.json({ ok: true });
  });

  // Cache resolved Page Access Tokens in memory so User Tokens work seamlessly
  const resolvedTokenCache = new Map<string, { pageToken: string; pageId: string }>();

  async function resolveManagedPageToken(
    rawToken: string,
    preferredPageId: string
  ): Promise<{ pageToken: string; pageId: string }> {
    const clean = rawToken.trim().replace(/^['"]+|['"]+$/g, '');
    const cacheKey = `${preferredPageId}:${clean}`;
    const cached = resolvedTokenCache.get(cacheKey);
    if (cached) return cached;

    try {
      const accResp = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(
          clean
        )}`
      );
      if (accResp.ok) {
        const accJson = (await accResp.json()) as {
          data?: Array<{ id: string; name?: string; access_token?: string }>;
        };
        if (Array.isArray(accJson.data) && accJson.data.length > 0) {
          const target =
            accJson.data.find((p) => p.id === preferredPageId) ||
            accJson.data.find((p) => p.id === DEFAULT_FB_PAGE_ID) ||
            accJson.data[0];
          if (target?.access_token) {
            const result = { pageToken: target.access_token, pageId: target.id };
            resolvedTokenCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch {
      // Token may already be a direct Page Access Token; proceed as-is
    }

    const fallback = { pageToken: clean, pageId: preferredPageId };
    resolvedTokenCache.set(cacheKey, fallback);
    return fallback;
  }

  // 5. Publish Match Results, Points Table, or News to Facebook Page 61590852571494
  app.post('/api/facebook/publish', async (req: Request, res: Response) => {
    const creds = resolveFacebookCredentials(req);
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const link = typeof req.body?.link === 'string' ? req.body.link.trim() : '';
    const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl.trim() : '';

    if (!message) {
      res.status(400).json({ ok: false, error: 'Post message cannot be empty.' });
      return;
    }

    if (!creds.accessToken) {
      res.status(401).json({
        ok: false,
        needsAuth: true,
        error:
          'Direct Graph API auto-post requires FACEBOOK_PAGE_ACCESS_TOKEN (or FACEBOOK_APP_ID + FACEBOOK_APP_SECRET for OAuth) in AI Studio Secrets — OR click the green "1-Click Copy + Download HD Card & Open Page" button to publish right now with zero token!',
      });
      return;
    }

    try {
      const { pageToken, pageId } = await resolveManagedPageToken(
        creds.accessToken,
        creds.pageId
      );

      // If a PNG Standings/Result card was generated, upload via /{page_id}/photos with caption
      if (imageDataUrl.startsWith('data:image/png;base64,')) {
        const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
        const binary = Buffer.from(base64Data, 'base64');
        const fullCaption = link ? `${message}\n\n🔗 ${link}` : message;
        const formData = new FormData();
        formData.append('caption', fullCaption);
        formData.append('access_token', pageToken);
        formData.append('source', new Blob([binary], { type: 'image/png' }), 'npl-update.png');

        const photoResp = await fetch(
          `${GRAPH_API_BASE}/${encodeURIComponent(pageId)}/photos`,
          { method: 'POST', body: formData }
        );
        const photoJson = (await photoResp.json()) as {
          id?: string;
          post_id?: string;
          error?: { message?: string };
        };

        if (!photoResp.ok || (!photoJson.id && !photoJson.post_id)) {
          throw new Error(photoJson.error?.message || `Meta Graph API HTTP ${photoResp.status}`);
        }

        const postId = photoJson.post_id || photoJson.id || '';
        res.json({
          ok: true,
          postId,
          pageId,
          postUrl: `https://www.facebook.com/profile.php?id=${encodeURIComponent(pageId)}`,
        });
        return;
      }

      // Text / Link feed post to /{page_id}/feed
      const bodyParams = new URLSearchParams({
        message,
        access_token: pageToken,
      });
      if (link) {
        bodyParams.set('link', link);
      }

      const feedResp = await fetch(
        `${GRAPH_API_BASE}/${encodeURIComponent(pageId)}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams.toString(),
        }
      );

      const feedJson = (await feedResp.json()) as {
        id?: string;
        error?: { message?: string };
      };

      if (!feedResp.ok || !feedJson.id) {
        throw new Error(feedJson.error?.message || `Meta Graph API HTTP ${feedResp.status}`);
      }

      res.json({
        ok: true,
        postId: feedJson.id,
        pageId,
        postUrl: `https://www.facebook.com/profile.php?id=${encodeURIComponent(pageId)}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish to Facebook Graph API.';
      res.status(502).json({ ok: false, error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    let viteInstance: { middlewares: express.RequestHandler } | null = null;
    const viteInitPromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      viteInstance = vite;
      return vite;
    })();

    viteInitPromise.catch((err) => {
      console.error('Vite middleware initialization failed:', err);
    });

    app.use((req: Request, res: Response, next) => {
      if (viteInstance) {
        viteInstance.middlewares(req, res, next);
        return;
      }
      viteInitPromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SetoPress NPL Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

