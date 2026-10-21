# Wood Origins Ecommerce Web

Public website, quote form, campaign analytics, leads database, tracking settings, and ID/password-protected admin dashboard.

## Install on Netlify

**Follow [NETLIFY-SETUP.md](NETLIFY-SETUP.md).** Import this repository into Netlify and keep the root `netlify.toml` configuration. The base directory is `netlify-app`; it uses native Netlify Functions and Netlify Database (Postgres).

The private package includes the agreed admin login as a salted password verifier and the existing Pabbly connection as server-only configuration. No manual environment values are required for the supplied account. These optional server-side environment variables can override the defaults later:

- `ADMIN_LOGIN_ID`
- `ADMIN_LOGIN_PASSWORD`
- `PABBLY_WEBHOOK_URL`

Keep the source package/repository private. The Netlify account must support Netlify Database. Migrations are included; existing records/settings from the previous Cloudflare database do not automatically transfer.

Public website: `/`. Admin login: `/admin`.

See [NETLIFY-VERIFICATION.md](NETLIFY-VERIFICATION.md) for completed tests and remaining live checks, and [CLIENT-NETLIFY-MESSAGE.txt](CLIENT-NETLIFY-MESSAGE.txt) for a short client handoff message.

## Local verification

```sh
cd netlify-app
npm ci
npm run build
npm test
node scripts/verify-package.mjs
```

The Netlify build preserves the approved public copy and layout and adapts the backend/database. The previous ChatGPT Sites deployment is separate and remains available. The source ZIP can be imported through Git, deployed with Netlify CLI, or uploaded through Netlify's logged-in source-build flow. Upload the project source containing netlify.toml, not only dist. Retain the existing Netlify project to keep its domain, or configure domain/DNS separately.
