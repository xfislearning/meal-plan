# Google Drive backend — setup & how it works

Good news: the Google Drive backend is already built into the code in this
package — you don't need any new code for it. This file just walks through
the one-time Google Cloud Console setup so it actually works when you sign
in, plus troubleshooting for the couple of ways it can look "stuck."

## How it already works

There are two separate things the app can do with your Google account, and
it's worth knowing the difference:

1. **Live sync (automatic, two-way).** The moment you sign in, the app
   starts keeping a single file named `family-meal-plan-data.json` in your
   Google Drive up to date with everything you save — idea banks and every
   week's plan. If you and your partner both sign in on your own devices
   and share that file (the **Share** button in the nav does this for you),
   you both read and write the same plan. This is the actual "backend" —
   it's how two people stay in sync. It's a plain JSON file, not meant to
   be opened by hand.
2. **Backup to Excel (manual, one-way).** The new **⬇ Backup** button
   gathers everything — every idea bank and every week you've ever
   planned — and uploads it to Drive as a dated, human-readable `.xlsx`
   file with three tabs: **Meal Menu**, **Meal Plan**, and **Dashboard**.
   Each click creates a new dated file (e.g. `Family Meal Plan Backup -
   2026-09-30.xlsx`), so you build up a history of snapshots you can open
   in Excel, Google Sheets, or Numbers — separate from the live sync file.

Both use the same Google sign-in and the same Drive permission, so there's
only one setup to do.

## One-time setup (Google Cloud Console)

The code already has a Google OAuth Client ID wired in
(`GSYNC_CLIENT_ID` near the top of `common.js`), so if you've done this
setup before, you likely just need to confirm the pieces below still match
your deployed site. If you're starting fresh, follow all the steps.

1. **Go to the Google Cloud Console.** [console.cloud.google.com](https://console.cloud.google.com/)
   → select or create a project (any name, e.g. "Family Meal Plan").

2. **Enable the Drive API.** APIs & Services → Library → search "Google
   Drive API" → Enable.

3. **Configure the OAuth consent screen.** APIs & Services → OAuth consent
   screen.
   - User type: **External**.
   - App name / support email: anything (e.g. "Family Meal Plan").
   - Scopes: add `https://www.googleapis.com/auth/drive` (the full Drive
     scope — needed so a file shared with a second person is actually
     visible to them; the narrower `drive.file` scope only shows files an
     account created itself).
   - **Audience → Test users:** add every Google email address that should
     be able to sign in — your own, and your partner's if they'll use the
     app too. While the app is in "Testing" mode (the default, and there's
     no need to publish it), *only* emails on this list can sign in.
     Forgetting to add someone here is the #1 reason sign-in fails for a
     second person.

4. **Create the OAuth Client ID.** APIs & Services → Credentials → Create
   Credentials → OAuth client ID.
   - Application type: **Web application**.
   - **Authorized JavaScript origins:** add the exact origin your site is
     served from, e.g. `https://xfislearning.github.io` (GitHub Pages) —
     no trailing slash, no path. If you ever host it somewhere else too
     (Firebase, a custom domain), add that origin as well.
   - Save, then copy the generated **Client ID**
     (ends in `.apps.googleusercontent.com`).

5. **Paste the Client ID into the code**, if it isn't already the right
   one: open `common.js`, find:
   ```js
   const GSYNC_CLIENT_ID = "946510553805-8km4e31fnhmlom9ko57075n0ed38cdog.apps.googleusercontent.com";
   ```
   and replace the value with the Client ID from step 4. (This package
   already has a Client ID filled in — only change it if you're setting up
   a *new* Google Cloud project, or if sign-in is failing and you want to
   rule out a mismatch.)

6. **Deploy and test.** Push the updated files, open the live site, click
   **Sign in with Google**. You should see the normal Google account
   picker and permission screen (mentioning Drive access) rather than an
   error page.

## Verifying it's working

- After signing in, the small text under your name in the nav (next to
  your photo) shows the sync state: **Local only** (not signed in),
  **Connecting…** / **Syncing…**, **Synced** (all good), or **Sync
  paused — tap to reconnect** (tap it to re-prompt Google sign-in).
- Click **⬇ Backup** — you should see the button say "Backing up…" for a
  few seconds, then an alert confirming the filename. Check your Google
  Drive (drive.google.com) for a new file with that name.
- To confirm two-way sync works, sign in on a second device (or have your
  partner sign in after you've used **Share** to grant them access) and
  confirm a change made on one shows up on the other after a few seconds
  or a page refresh.

## Troubleshooting

- **"This app is blocked" / "Access denied"** when signing in: your Google
  account isn't on the Test users list (step 3). Add it and try again.
- **"Drive permission needed"** after signing in: you (or Google)
  cancelled the permission prompt before granting Drive access. Sign out
  and sign in again, making sure to approve the Drive permission.
- **"Sync paused — tap to reconnect"**: this is normal after the app has
  been idle a while — browsers periodically block the silent background
  token renewal. Tap the status text (or just reopen the app) to
  re-prompt sign-in; your data isn't lost.
- **Backup button click does nothing / errors**: it needs network access
  to load the Excel-writing library from a CDN the first time you click
  it — if you're offline, wait until you're back online and try again.
