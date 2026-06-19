# Assembled Brands — Intake Wizard (warm inbound)

Next.js (App Router) frontend for the **warm application** an originator sends a
prospect after a discovery call. The marketing site stays on Webflow; this app
only owns the intake wizard UI. It talks to the existing Hono / Cloudflare
Workers backend (`packages/server`) through same-origin route handlers under
`app/api/*` — **no backend business logic is reimplemented here.**

- Local dev: `npm run dev` → http://localhost:3000
- Backend API base: `NEXT_PUBLIC_API_BASE_URL` (defaults to the dev Workers URL in `lib/config.ts`)
- Mount path: `/app` on Webflow Cloud, or root when `NEXT_PUBLIC_SERVE_AT_ROOT=1` (Vercel)

## The flow this app is part of

The invite is **not** built or sent by this app. It is triggered by HubSpot
automations. This app is only the screen the prospect lands in.

```
Originator opens deal in HubSpot (stage: Meeting Booked)
        ↓
Originator sends the warm application link to the prospect   ← HubSpot automation
        ↓
Prospect opens link, enters Deal ID + access password (/start), answers a few
questions, and uploads their financial package (this app)
        ↓
On upload / submit:
   → HubSpot deal fields updated (prospect answers override the originator pre-fill)
   → Files land in Google Drive: "Auto Process Opportunities" / [Company]
   → Deal stage auto-moves: Meeting Booked → Package Received
   → Underwriting team alerted (email)              ← HubSpot automation
   → Notification posts to the HubSpot-stage Slack channel  ← HubSpot automation
```

### Where each outcome is actually triggered (so we don't break the chain)

| Outcome | Trigger location |
| --- | --- |
| Deal fields updated with prospect answers | `onboarding-wizard` + `business` services on form save |
| Files in Google Drive (one file per type) | `financial-wizard` controller `uploadDocument` → `AssetService.uploadToGoogleDrive` (runs on each document upload) |
| Stage → **Package Received** | `FinancialWizardService.syncHubSpotDealStageAfterUpload` — fires when `management_bios` (and `cap_table`, unless `raised_external_equity = no`) are uploaded |
| Underwriting email + Slack message | HubSpot workflow on the stage change (external to this repo) |

Stage IDs live in `FinancialWizardService` (`HUBSPOT_STAGE_MEETING_BOOKED`,
`HUBSPOT_STAGE_PACKAGE_RECEIVED`).

## Document uploads — held until Save, overwrite on replace

To avoid duplicate files piling up in Drive (which confuses underwriting):

- **Client (`DocumentUploadForm`)**: a chosen file is held on screen and only
  uploaded when the user clicks **Save**. Re-picking before Save just swaps the
  held file — nothing reaches the backend until Save.
- **Backend (`packages/server`)**: re-uploading a document type marks the prior
  row `is_current=false` (existing behavior) **and now trashes the superseded
  Google Drive file** (`AssetService.trashGoogleDriveFile`), so the company
  folder holds exactly one current file per type. Removing a document outright
  trashes its Drive file too. Trash is recoverable; nothing is hard-deleted.

## Progress / completion

`FinancialWizardService.calculatePercentage` counts 6 backend pages. The wizard
marks the application complete on the **final** step (`POST
/financial-wizard/complete` via `/api/financial-complete`), which sets
`is_complete=true` and drives the progress bar to **100%**. Sidebar dots and the
My Applications badges read `getDocumentSectionStatuses` (`lib/documentSections.ts`):
a submitted application shows every section complete, and optional-only sections
go green when all their files are present.

## UAT — what to test

Run these against a real HubSpot deal in **Meeting Booked**. Before starting,
confirm you have: a test deal (fake company like `UAT - <initials> - 1`),
access to the **Auto Process Opportunities** Drive folder, access to the
HubSpot-stage Slack channel, and a sample financial package in the correct
formats.

**Test 1 — Happy path.** Open the link in incognito, answer every question
(enter values that **differ** from the HubSpot pre-fill to confirm override),
upload one document per required category in the correct format, submit. Within
~5 min confirm all six: (1) deal fields show your prospect answers, (2) a new
`[Company]` folder under Auto Process Opportunities, (3) every uploaded file is
there in the format uploaded, (4) underwriting alert email, (5) stage =
**Package Received**, (6) one Slack message for the stage change.

**Test 2 — Required fields enforced.** Try to submit with a required text field
blank (blocked), then with a required document missing (blocked), then upload a
wrong-format file (rejected). You should not be able to submit with anything
required missing or in the wrong format.

**Test 3 — Second clean submission (regression).** Repeat Test 1 with a
different fake company. Confirm a **new** folder is created (previous not
overwritten), that deal moves to Package Received independently, and a **second**
Slack notification posts.

Report each run in the AB ↔ BX Studio Slack channel: test deal name, test number,
✅/❌ per row, and a one-line note + screenshot for any ❌.
