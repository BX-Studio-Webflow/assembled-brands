# Production Release Runbook

_Last updated: 2026-06-30. Owner: BX. Scope: the Next.js intake webapp (Vercel) + Hono/Cloudflare Workers backend (D1, R2, Drive, HubSpot, SendGrid)._

This document is the single source of truth for taking the intake app to production. It records the current state, the hardening already done in-tree, and the **ordered go-live checklist** — including the steps that need credentials/access only you have.

---

## 1. Architecture & environments

| Layer | Dev / Staging | Production |
| --- | --- | --- |
| Frontend (Vercel project `webapp`) | PR previews | `webapp-omega-rosy.vercel.app` (custom domain TBD) |
| Live backend (CF Worker) | `assembled-brands-dev` (`*.workers.dev`) | `assembled-brands-dev` for launch, because HubSpot already targets it |
| Prepared/standby backend | n/a | `assembled-brands-prod` (migrate to this after HubSpot webhook admin access) |
| Live database (D1) | `assembled-dev` (`088996ad-…`) | `assembled-dev` for launch, because current HubSpot-created deal rows live there |
| Prepared/standby database | n/a | `assembled-prod` (`37f9f9ea-…`) |
| Object storage (R2) | `file-storage-bucket-dev` | `file-storage-bucket` |
| DNS | n/a | Route 53 (zone for `assembledbrands.com`) |

The frontend talks to the backend **server-side only** (`API_BASE_URL`, read in route handlers/SSR). For launch, Vercel production is intentionally pointed at the same worker HubSpot already calls, so HubSpot-generated links, signing keys, users, deal applications, and document uploads all resolve against the same backend.

---

## 2. Audit + status (as of 2026-06-29)

- ✅ Dev D1 fully migrated; dev worker + Vercel staging live and verified.
- ✅ **Prod D1 migrated** — all 16 pending migrations applied (backup taken first at `/tmp/ab-backups/`). Schema now matches dev (20 tables).
- ✅ **Prod worker deployed** (`assembled-brands-prod.crystal-e8a.workers.dev`) with `NODE_ENV=production`, all 21 vars, and a freshly generated prod `SECRET_KEY`. Boots + responds under strict prod validation. **No DNS points at it yet, so it takes no real traffic.**
- ✅ **R2 isolated** — `file-storage-bucket-dev` created; dev redeployed onto it; prod uses `file-storage-bucket`.
- ✅ **`API_BASE_URL`** now fails loud on the Vercel production deployment (no silent dev fallback).
- ✅ **Safe deploys** — `pnpm deploy:development|production` preserve worker vars; bare `wrangler deploy` blocked.
- ✅ **Live launch topology = "align with active HubSpot endpoint"** (decision 2026-06-30):
  - **Production** = `webapp-omega-rosy.vercel.app` → **assembled-brands-dev worker** (`API_BASE_URL` Production set; redeployed 2026-06-30).
  - This is the clean live path for now because HubSpot private-app webhooks are already posting real deals to `assembled-brands-dev`; moving only Vercel keeps the frontend, token signing key, user rows, deal application rows, and document uploads on one backend.
  - Verified real HubSpot-generated links for Henry Rose, Squared Circles, and Springbone Kitchen return `200 {"ok":true}` on the live Vercel site.
- ✅ **Custom domain live** (2026-07-06): `https://apply.assembledbrands.com` is aliased to the Vercel production deployment with a valid Let's Encrypt cert. The active worker `WEBAPP_URL` now points to the branded domain, and a controlled HubSpot test deal wrote an `https://apply.assembledbrands.com/apply?...` link that resolves `200 {"ok":true}`.
- ⚠️ **Prod vars use interim values to review before custom domain:** `FRONTEND_URL=https://assembledbrands.com`, `WEBAPP_URL=https://webapp-omega-rosy.vercel.app` (now the live prod app URL — update when a custom subdomain is added), `TRANSACTIONAL_EMAIL_TEMPLATE_ID` mirrors the dev (new-design) template. Integration keys (HubSpot/SendGrid/Google/R2) are **shared with dev** (confirmed acceptable for launch, decision 2026-06-29).
- ⚠️ **HubSpot/SendGrid/Slack/Drive not environment-isolated** — both envs share accounts. Acceptable for launch; revisit if you want a true staging sandbox (see §6).
- ⚠️ **CI/CD drafted, not active** — `app/.github/workflows/deploy.yml` exists but GitHub Actions only runs workflows at the repo root. Move to the chosen release repo's root + set secrets to activate.
- ℹ️ Drive folder ownership must migrate to the client's Google org before production (per project brief).

---

## 3. Hardening done in this pass (in-tree, already applied)

- `webapp/lib/config.ts` — production refuses to fall back to the dev backend; requires explicit `API_BASE_URL`.
- `server/src/lib/secrets.ts` — boot-time validation now enforces all prod-critical vars are present and non-placeholder when `NODE_ENV=production` (relaxed locally).
- `server/wrangler.jsonc` — R2 binding split per environment (`file-storage-bucket-dev` vs `file-storage-bucket`).
- `server/scripts/deploy.mjs` — var-preserving deploy (recovers live vars → injects → deploys → restores). `package.json` `deploy:development|production` now use it; bare `deploy` is blocked; raw escape hatches kept as `deploy:*:unsafe`.
- Fixed the pre-existing `tsc` error in the `testGoogleDrive` endpoint so `pnpm check` is green.

---

## 4. Go-live checklist (ordered)

Legend: ✅ done · ⬜ to do · 🔑 **needs your access/credentials**

### A. Backend (prod worker + DB)

1. ✅ **Prod worker vars set** in `server/secrets/production.vars.json` (gitignored) — fresh `SECRET_KEY`, prod overrides, dev-mirrored integrations. 🔑 Review the interim values in §2 before go-live.
2. ✅ **Dev R2 bucket created** (`file-storage-bucket-dev`); dev redeployed onto it.
3. ✅ **Prod migrations applied** (backup at `/tmp/ab-backups/`). `pnpm db:migrate:production` reports "No migrations to apply."
4. ✅ **Prod worker deployed:** `pnpm deploy:production` → `assembled-brands-prod.crystal-e8a.workers.dev`.
5. ✅ **Smoke-tested** — boots under prod validation; token-session route returns the expected 400 for a bad token.

### B. Frontend (Vercel) — ✅ live

6. ✅ **Topology applied:** Production `API_BASE_URL` = `https://assembled-brands-dev.crystal-e8a.workers.dev`, matching the worker HubSpot already targets.
7. ✅ **Prod deployed** (`vercel deploy --prod`) — `webapp-omega-rosy.vercel.app` now serves against the active HubSpot-backed worker and real HubSpot-generated links resolve.
8. ⬜ Later cleanup: after HubSpot webhook admin access is available, migrate the webhook to `assembled-brands-prod`, move/verify data, and repoint Vercel production back to the prepared prod worker.

### C. Domain (Route 53) — ✅ live

8. ✅ Subdomain: `apply.assembledbrands.com`.
9. ✅ Vercel alias/certificate issued for the `webapp` production deployment.
10. ✅ Route 53: `CNAME apply → cname.vercel-dns.com`.
11. ✅ TLS verified and active worker `WEBAPP_URL` updated to `https://apply.assembledbrands.com`; new HubSpot links use the branded domain.

### D. Integrations (see §6)

12. ⬜🔑 Point staging at HubSpot sandbox / test pipeline, test SendGrid template, `#staging-alerts` Slack, dev Drive folder.
13. ⬜🔑 Migrate the production Drive folder ownership to the client's Google org.
14. ✅ **Launch state:** HubSpot is already posting to `assembled-brands-dev`; Vercel production is now aligned to that same worker. ⬜🔑 Later, move the private-app webhook to `https://assembled-brands-prod.crystal-e8a.workers.dev/api/v1/hubspot/webhook` only as part of a coordinated backend migration.

### E. Warm-lead email + deal-property policy (implemented 2026-06-29)

Per the 6/29 sync (Kunal): **no automatic email is sent to a prospect when a deal/contact is created.** Instead:

- On deal creation the worker provisions the account and writes two **HubSpot deal properties** (group `dealinformation`): **`application_link`** ("Application Link", non-expiring signed deep link) and **`application_temporary_password`** ("Application Temporary Password"). The applicant must enter the temporary password before the portal opens. The originator copies these into a manual email after their discovery call.
- HubSpot admin action: pin **Application Link** and **Application Temporary Password** to the default deal record view/sidebar so originators do not need Actions → View all properties during UAT or launch.
- The deal-creation warm-lead email and the contact-creation "welcome + credentials" email are both disabled.
- The **only** automated prospect email is a one-time **post-submission confirmation** (sent when the applicant first completes the financial wizard).
- ✅ Verified against real HubSpot-created deals after launch alignment: links written by the active worker now resolve on `webapp-omega-rosy.vercel.app`.

---

## 5. Deploy & rollback

- **Deploy backend:** `pnpm deploy:development` / `pnpm deploy:production` (from `app/packages/server`). Never `wrangler deploy` directly — it wipes vars.
- **Deploy frontend:** `vercel deploy --prod` (from `app/webapp`).
- **Rollback frontend:** Vercel dashboard → promote a previous deployment (instant).
- **Rollback backend:** `npx wrangler rollback --env production` (or redeploy a known-good commit via the safe script).
- **DB migrations are one-way** — test on dev first (`pnpm db:migrate:development`), back up prod before applying.

---

## 6. Environment isolation matrix

| Integration | Staging should use | Mechanism |
| --- | --- | --- |
| HubSpot | Sandbox portal or test pipeline | separate `HUBSPOT_API_KEY` |
| SendGrid | TEST template, internal recipients only | `TRANSACTIONAL_EMAIL_TEMPLATE_ID` |
| Slack | `#staging-alerts` (or off) | `SLACK_CHANNEL_ID`, `SLACK_NOTIFICATIONS_ENABLED` |
| Google Drive | Separate staging folder | `GOOGLE_DRIVE_FOLDER_ID` |
| Underwriting alerts | Off in staging | `UNDERWRITING_ALERT_EMAILS_ENABLED` |
| R2 storage | `file-storage-bucket-dev` | `R2_BUCKET_NAME` |
| Signing key | Distinct per env | `SECRET_KEY` (rotate for prod) |

---

## 7. Open decisions

- **Release repo / CI:** which repo owns deploys (this monorepo vs the client repo)? Once decided, add GitHub Actions: `main` → prod (`deploy:production` + `db:migrate:production`), PR previews → dev backend.
- **Staging domain:** dedicated `staging.apply.assembledbrands.com` vs keep the `.vercel.app` URL.
- **HubSpot sandbox:** does AB have one, or do we gate deal-stage writes behind a flag in staging?
- **Prod data:** confirm `assembled-prod` has no real customer rows before/after migrating (test seed cleanup).
