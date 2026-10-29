# Deploy EntreNos to Netlify
1. In Netlify, Add new project → Import an existing project → GitHub → `Rood17/entrenos.app`.
2. Branch: `main`; base directory: repository root; build command: `npm run build`; publish: `dist`.
3. Set environment variable `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1` in Netlify settings, then redeploy.
4. In Render, configure `CORS_ALLOWED_ORIGINS=https://YOUR-NETLIFY-SITE.netlify.app` (or your custom domain), without trailing slash, and confirm `DJANGO_ALLOWED_HOSTS`.
5. The React app includes a demo mode. Tasks and finance cards are not persisted yet; only the JWT login/register/invitation APIs are connected.
6. To show the real logo, add corrected official brand PNGs in `public/brand/` and redeploy.
No credentials should be stored in VITE_ variables; they are embedded in client JS.
