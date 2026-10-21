# Netlify handoff verification

Prepared on 21 October 2026. Status: ready for deployment and acceptance testing in the client's Netlify account; not yet verified on that account.

## Completed checks

- Netlify build completed using the dependency lockfile.
- 17 automated tests passed using a Postgres-compatible PGlite database and DOM execution of the actual public quote-form scripts.
- Netlify's official function packager successfully produced a deployable Node function and recognized `/`, `/admin`, `/admin/*`, and `/api/*` routes.
- Public website copy outside script blocks matches the existing approved template byte for byte. Images and CSS/layout are retained.
- Anonymous admin/API access is blocked. Correct login works; wrong credentials, forged sessions, cross-origin requests, and repeated login attempts are rejected; logout revokes access.
- Tracking ID updates and standard/custom event names persist and apply to future page loads.
- WhatsApp hashcode add/edit/delete, case-insensitive exact matching, and unmatched fallback passed.
- Quote flow validates consent, tracks each visited step once, retains first-touch UTM, avoids duplicate form submissions, and stays on the contact step when delivery fails.
- Test leads do not call the Pabbly webhook. Mocked live deliveries preserve the existing payload fields plus original UTM names. Concurrent duplicate requests result in one stored lead and one normal webhook delivery; failed delivery retries retain the same submission ID.
- Analytics groups event results by event/campaign/ad set/ad and supports dates plus test/live filtering. Default analytics mode is Live.
- Login credentials and the webhook are runtime environment variables; neither is compiled into public assets.

## Client-side acceptance still required

1. First Netlify deploy, account plan eligibility, automatic database provisioning/migrations, and environment values.
2. One labeled live Pabbly → Airtable end-to-end submission. Local automated tests mock the webhook and cannot verify the client's later automation steps.
3. Actual Meta Test Events and GTM Tag Assistant checks, including whether the client's GTM container already installs the same Pixel.
4. Visual review on the client's desktop/mobile browsers and final domain/DNS activation. The automated DOM tests do not replace a rendered browser review.
5. Any transfer of existing Cloudflare leads/events or saved admin overrides. New Netlify tables start empty with source defaults.

External webhook delivery can be accepted before a network timeout occurs; deduplicate on `submissionId` in Pabbly/Airtable. The website alone cannot promise absolute exactly-once delivery to an external system.

The existing 5,000-group/lead response cap is retained. Client approval of existing product prices, warranty claims, and public copy remains a business acceptance step; migration does not change those values.
