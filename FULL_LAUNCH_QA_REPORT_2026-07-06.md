# Full Launch QA Report - 2026-07-06

## Summary
- Live app tested: `https://apply.assembledbrands.com`
- Active backend tested: `assembled-brands-dev`
- QA record: `AB QA - Do Not Use - 20260706-133931`
- HubSpot contact ID: `233613266539`
- HubSpot deal ID: `62307373716`
- D1 webhook row ID: `71`
- D1 user ID: `58`
- D1 deal application ID: `56`
- D1 business ID: `17`
- D1 financial wizard application ID: `16`

## Result
Passed for controlled launch QA, with one remaining hardening item to track: HubSpot webhook signature validation is still not implemented.

## Preflight
- `https://apply.assembledbrands.com` serves the Vercel production app over HTTPS.
- Vercel production aliases the current deployment to `apply.assembledbrands.com`.
- Vercel production `API_BASE_URL` is configured for the active worker.
- Worker `WEBAPP_URL` is `https://apply.assembledbrands.com`.
- HubSpot deal properties exist: `application_link`, `application_temporary_password`.
- SendGrid, HubSpot, Drive, and R2 variables are present on the active worker.

## HubSpot Flow
- Created QA contact and QA deal via HubSpot API.
- Real HubSpot `deal.creation` webhook reached the active worker and processed successfully.
- D1 user and deal application rows were created.
- HubSpot deal received a branded application link and temporary password.
- Application link exchange succeeded through the branded domain with `200`.
- No prospect or deal-owner email is sent on deal creation by the active code path.

## Onboarding And HubSpot Sync
- Saved company profile through `https://apply.assembledbrands.com/api/onboarding`.
- HubSpot fields updated:
  - `dealname`: `AB QA - Do Not Use - 20260706-133931 LLC`
  - `hq_state`: `NY`
  - `annual_revenue`: `12345678`
- `hubspot_owner_id` remained unset because the QA team member email did not map to a HubSpot owner.
- Business row and Drive folder tree were created.

## Uploads And Drive Automation
- Uploaded all required document sections plus visible optional documents through the live app proxy.
- Invalid MIME upload was rejected with `400` and message: `Invalid file type. Allowed file formats: EXCEL`.
- Replacement test passed:
  - `monthly_income_statement` version 1 is not current.
  - `monthly_income_statement` version 2 is current.
  - Superseded Drive file is trashed.
- Delete test passed:
  - `investor_deck` is not current.
  - Deleted Drive file is trashed.
- R2 asset records exist and S3 `HeadObject` checks passed.
- R2 presigned read URLs initially returned `501`; fixed during QA by:
  - Removing unsupported GET response header overrides.
  - Correctly parsing R2 path-style asset URLs into object keys.
- Re-test passed: generated presigned read URL returned `200` and file bytes.

## Progress, Submit, And Stage Automation
- Progress reached `100`.
- Submit succeeded with `200`.
- Duplicate submit returned `200` without re-opening completion state.
- Thank-you page loads and `Return to home` points to `https://assembledbrands.com`.
- HubSpot deal stage advanced to Package Received: `cca1d0b8-397f-4309-b87e-7a663f2a78bc`.

## Email Matrix
- Active SendGrid template is the new branded transactional template: `d-d6df930d98b74baab115f13c17d7fe2a`.
- Removed remaining hardcoded old SendGrid template IDs from server send paths.
- Fixed email UX so buttons now only render when there is a real next action:
  - Application confirmation: button goes to `/login`.
  - Login magic link: button uses signed `/signin?...` URL.
  - Team invitation: button uses signed `/invite/accept?...` URL.
  - Team accept welcome: button goes to `/login`.
  - Underwriting alert: button opens HubSpot when a HubSpot deal link is available; otherwise no button renders.
  - Legacy code/status emails: no fake `Ok, got it` button.
- QA-triggered email endpoints returned success for:
  - Application submission confirmation.
  - Login magic link.
  - Team invitation.
  - Team accept welcome.
  - Underwriting alert to QA-only team-member address.
  - Legacy auth verification/reset/account emails.
- SendGrid activity API timed out during programmatic delivery lookup, so inbox-level delivery remains a manual confirmation item for the QA inbox.

## Security And Negative QA
- Invalid application token returns a user-friendly `400`.
- Valid application token sets secure httpOnly `accessToken` cookie.
- Logout returns `200` and clears `accessToken` with `Max-Age=0`.
- Upload without session returns `401`.
- Missing/bad team invite tokens return user-friendly `400`.
- Guessing a HubSpot deal ID through the Next onboarding proxy now returns `401`.
- Direct worker legacy deal-ID warm-lead routes now require auth and no longer expose unauthenticated deal-ID session/submission.
- HubSpot webhook signature validation remains a known open hardening item.

## Cleanup Decision
QA artifacts were preserved for traceability and client review because they are clearly labeled `AB QA - Do Not Use - 20260706-133931`.

Preserved artifacts:
- HubSpot QA contact and deal.
- D1 QA rows.
- Google Drive QA root folder: `1nngBh1dsIGG51zlizV_6c7DLIaUgmZAJ`
- Google Drive child folders/files.
- R2 QA objects.

## Deployments During QA
- Worker deployed after email UX pass.
- Worker deployed after security route fix.
- Vercel production deployed and aliased to `https://apply.assembledbrands.com`.
- Worker deployed after R2 presigned read fix.
