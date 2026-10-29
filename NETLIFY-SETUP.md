# Wood Origins — Netlify setup

This repository includes a Netlify-ready website and admin dashboard. The original Sites/Cloudflare source remains available; Netlify uses the separate `netlify-app` build configuration.

## Install from GitHub (recommended)

1. Give the client the repository link or access needed for their Netlify account to import it.
2. In Netlify, select **Add new project → Import an existing project → GitHub** and select this repository, branch **main**.
3. Keep the settings from the root `netlify.toml`: base directory **netlify-app**, build command **npm run build**, publish directory **netlify-app/dist** relative to the repository root (the value in the configuration is **dist**, relative to the base directory). Functions directory is **netlify/functions**, relative to the base directory. Do not select a Next.js preset or replace these with `.next` settings.
4. The handoff package is configured with the agreed admin ID/password and the existing Pabbly webhook from the original ZIP. You do not need to enter those values again. The password is stored as a salted PBKDF2 verifier; the webhook and verifier are bundled only into the server function, never into public browser assets. To override the bundled configuration later, optionally set these environment variables with **Functions** scope (or all scopes):

   | Variable | Value |
   | --- | --- |
   | `ADMIN_LOGIN_ID` | Optional replacement admin ID; set together with password |
   | `ADMIN_LOGIN_PASSWORD` | Optional replacement admin password; set together with ID |
   | `PABBLY_WEBHOOK_URL` | Optional replacement Pabbly Connect webhook URL |

5. Select **Deploy**. Netlify Database uses the installed `@netlify/database` package and the migrations in `netlify-app/netlify/database/migrations` to provision Postgres and apply the schema automatically. The Netlify account must support Netlify Database (a credit-based plan). Check Data & Storage → Database and the deploy log. If the account requests database enablement, enable it there and redeploy. Do not add a manual database URL for this normal setup.
6. Open the generated Netlify URL and `/admin`. Log in, confirm the tracking IDs, and run the checks below. Connect the custom domain only after the checks pass.

## If using the ZIP

Extract the preconfigured ZIP. While logged into the client's Netlify team, upload the **source project folder** containing `netlify.toml` using the new-project upload/build flow. Keep `netlify.toml` and the folder structure intact. Follow the build log and verify the function and database are provisioned. Alternatively, import the extracted contents into the client's GitHub repository and follow the recommended steps above. Uploading only `dist` to an existing project's static deploy dropzone does not install the backend/database. Git import or Netlify CLI is the fallback if the team's upload screen only accepts static output.

## Existing production domain

If `quote.woodorigins.sg` already belongs to the client's existing Netlify project, deploy this update to that **same project** to retain the domain. If a new project is used instead, attach the domain and update DNS as directed by Netlify; the source folder cannot configure an unrelated DNS account. After activation, the public website is `https://quote.woodorigins.sg/` and admin login is `https://quote.woodorigins.sg/admin`.

## Quick checks before switching the domain

1. Open `https://YOUR-SITE.netlify.app/?test=1&utm_source=Facebook_Ads&utm_medium=feed&utm_campaign=QA_Campaign&utm_content=QA_Ad&Ad_Set_Name=QA_Adset` in an incognito window. Complete Get Your Quote once. Test mode saves test events/leads without sending to Pabbly or initializing Meta/GTM.
2. Log in at `/admin` using the agreed ID and password. The new lead must appear as **test**, with the form answers, campaign and ad set. In Analytics select **Mode → Test** to see page view, quote click, form start, completed steps, and submission. Analytics defaults to **Live** to avoid mixing QA activity into live counts.
3. Save a tracking ID or event name, reload the public website, and confirm the update. Leave only one Meta Pixel installation active (direct or through GTM). Test real Meta delivery in Meta Test Events, and GTM in Tag Assistant, on a normal visit without `test=1`.
4. In WhatsApp templates, confirm the three seeded Ecommerce Web rows. For an isolated test, add campaign **QA_Campaign**, ad set **QA_Adset**, ad **QA_Ad**, and a test hashcode. Click WhatsApp from the test landing URL. The product-specific message must include the hashcode at the end of its first sentence. A non-matching campaign must keep the message without a reference. A WhatsApp follow-up after submitting Get Your Quote must omit the hashcode.
5. Submit one deliberately labeled live QA enquiry from a fresh incognito window **without `test=1`**. Check it in the website Leads database and in Pabbly/Airtable. This creates a real workflow run; tell the sales team it is a QA enquiry. An HTTP acceptance from Pabbly is not proof that later Airtable automation steps succeeded.
6. Log out and check that `/admin` requires login and `/api/admin/analytics` returns 403. Check the public page and form on mobile and desktop. Confirm the client's approved pricing, warranty and lead-routing details before launch.

## Data and behavior

- Existing Cloudflare D1 leads/events and saved tracking/event settings are not automatically transferred to this database. The new installation starts with source defaults, empty leads/events, and three seeded Ecommerce Web campaign hashcodes. Copy any other saved overrides/templates through admin; historical-data transfer is a separate operation.
- The website keeps approved public copy, product content, layout, images, and existing WhatsApp message wording. Direct chat adds the matching campaign hashcode; Get Your Quote follow-up omits it. No Microsoft Clarity was added.
- Netlify uses native Node functions and Postgres, not Cloudflare bindings. Source handlers are bundled through an adapter so dashboard behavior remains consistent.
- Login uses HTTP-only same-site cookies, an eight-hour server-side session, logout revocation, origin checks, and a persistent login-attempt limit. The bundled password verifier and Pabbly webhook are server-only. Environment variables, when supplied, override the bundled defaults.
- Pabbly delivery is server-side. Leads are saved before delivery, retain the existing field names, and also include the original UTM field names. Test submissions never call Pabbly.
- Submission IDs are unique. Retries keep the same ID. Concurrent repeat requests do not create another website lead. A timed-out external request can have been accepted by Pabbly before the response was lost; use `submissionId` for deduplication in the Pabbly/Airtable workflow as well. Absolute exactly-once external delivery cannot be guaranteed by the website alone.
- Detailed analytics retains the existing 5,000-group/lead response limits. Analytics defaults to Live and can be filtered to Test or both; the Leads list has its own test/live filter. This is not a replacement for checking ad-platform reports.

## Developer checks

```sh
cd netlify-app
npm ci
npm run build
npm test
node scripts/verify-package.mjs
```

The tests use a temporary Postgres-compatible PGlite database and mocked Pabbly responses. They verify actual application handlers, SQL, authentication, form flow, UTM persistence, step deduplication, delivery retry behavior, template CRUD/matching, and unmodified public copy outside scripts. The official Netlify bundler verifies the function package and route mapping. They do not provision the client's Netlify account or verify real ad-platform/Airtable delivery.

For optional local testing, set the two admin environment variables locally, then run `npm run dev` from `netlify-app`. It serves at `http://127.0.0.1:8877` using a temporary test database. Use `?test=1`; local data is discarded on restart.

## Reference

- https://docs.netlify.com/start/quickstarts/deploy-from-repository/
- https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/
- https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/

Pushing to the connected GitHub branch triggers future Netlify builds. It does not update the separate ChatGPT Sites publication.
