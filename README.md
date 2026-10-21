# Wood Origins Ecommerce Web

Public website, quote form, campaign analytics, leads database, tracking settings, and ID/password-protected admin dashboard.

## Install on Netlify

**Follow [NETLIFY-SETUP.md](NETLIFY-SETUP.md).** Import this repository into Netlify and keep the root `netlify.toml` configuration. The base directory is `netlify-app`; it uses native Netlify Functions and Netlify Database (Postgres).

Add these server-side environment variables before deployment:

- `ADMIN_LOGIN_ID`
- `ADMIN_LOGIN_PASSWORD`
- `PABBLY_WEBHOOK_URL`

Their values are shared separately. The account must support Netlify Database. Migrations are included; existing records/settings from the previous Cloudflare database do not automatically transfer.

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

The Netlify build preserves the approved public copy and layout and adapts the backend/database. The previous ChatGPT Sites deployment is separate and remains available. A source ZIP must be imported into a Git repository or deployed with the Netlify CLI; static Netlify Drop alone does not install the backend/database.
