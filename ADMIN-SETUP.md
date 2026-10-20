# Admin login

The public website and `/admin/login` are available without a ChatGPT account. `/admin` and all `/api/admin/*` routes require an authenticated admin session.

## Server configuration

Set `ADMIN_LOGIN_ID` and `ADMIN_LOGIN_PASSWORD` as server-side secrets in your hosting environment. Never commit their values. The current Sites deployment has these configured.

Apply `drizzle/0002_admin_sessions.sql` to the D1 database before running this version. Sites publication includes this migration.

Sessions expire after eight hours. Logout revokes the session. Login attempts are limited to ten per IP per fifteen-minute time window.

## Verification

1. Open `/` and `/admin/login` in a private browser window.
2. Confirm `/admin` redirects to `/admin/login`.
3. Confirm an incorrect password is rejected, then sign in with the configured account.
4. Check Analytics, Leads database, Tracking setup, and WhatsApp templates.
5. Log out and confirm dashboard/API access is blocked.

Publishing to GitHub does not automatically deploy the Sites website. Hosting visibility is configured separately and is currently public.
