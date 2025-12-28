

---

# Project Deployment Guide

This guide explains how to trigger **frontend (FE)** and **backend (BE)** deployments for this project.

- **Frontend (FE):** Published via **npm** using **pnpm Changesets**
- **Backend (BE):** Deployed to **Cloudflare Workers** using **Wrangler**
- **Webflow integration:** Loads the frontend bundle via a dynamic `<script>`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Frontend Deployment](#frontend-deployment)

   - [Step 1: Create a Changeset](#step-1-create-a-changeset)
   - [Step 2: Bump Version](#step-2-bump-version)
   - [Step 3: Push & Trigger CI](#step-3-push--trigger-ci)
   - [Step 4: Update Webflow Script Version](#step-4-update-webflow-script-version)

3. [Backend Deployment](#backend-deployment)

   - [Development Deployment](#development-deployment)
   - [Production Deployment](#production-deployment)

4. [Common Commands](#common-commands)
5. [Notes](#notes)

---

## Prerequisites

- Node.js >= 22.x
- pnpm >= 10.x
- GitHub Personal Access Token (PAT) with repo access for CI/CD
- npm token (`NPM_TOKEN`) for publishing frontend
- Wrangler CLI installed (`npm install -g wrangler`) for backend

---

## Frontend Deployment

The frontend is a package published to **npm**. Deployments are managed via **pnpm changesets**.

### Step 1: Create a Changeset

Whenever you want to release new changes:

```bash
pnpm changeset
```

- Follow prompts to describe the change (patch, minor, or major).
- A new file is created in `.changeset/` describing the change.

### Step 2: Bump Version

Apply the version bump and update the changelog:

```bash
pnpm changeset version
```

- Updates `package.json` in the frontend package.
- Updates `CHANGELOG.md` automatically.

### Step 3: Push & Trigger CI

- Commit the changes and push to `main`:

```bash
git add .
git commit -m "Release: update frontend version"
git push origin main
```

- GitHub Actions workflow will automatically:

  - Install dependencies
  - Build frontend (`pnpm --filter @assembled-brands/frontend build`)
  - Publish package to npm
  - If you merge a branch to main without changeset, the Release & Publish / Build & Publish (push) will Fail
  - This is because you cannot publish over the previously published versions
  - Thus changeset is required to bump version!!!


After workflow completes, the frontend package is live on npm.

### Step 4: Update Webflow Script Version

In Webflow, your pages include a script that loads the frontend dynamically:

```html
<script>
  (function () {
    const pageName = 'account-setup-finish-verification'; // Change as needed
    const version = '0.3.1'; // Bump this after each FE deployment
    const devMode = localStorage.getItem('script-mode');

    const SCRIPT_LOCAL_BASE = 'http://localhost:3000/pages';
    const SCRIPT_PROD_BASE = `https://cdn.jsdelivr.net/npm/@assembled-brands/frontend@${version}/dist/pages`;

    const scriptSrc =
      devMode === 'local'
        ? `${SCRIPT_LOCAL_BASE}/${pageName}/index.js`
        : `${SCRIPT_PROD_BASE}/${pageName}/index.js`;

    function loadScript() {
      const script = document.createElement('script');
      script.setAttribute('data-env', devMode || 'prod');
      script.src = scriptSrc;
      script.async = true;
      document.head.appendChild(script);
    }

    window.Webflow ||= [];
    window.Webflow.push(() => {
      try {
        loadScript();
      } catch (error) {
        console.error(error);
      }
    });
  })();
</script>
```

> **Important:** After each frontend deployment, update the `version` in this script to match the new npm version. This ensures Webflow loads the latest frontend bundle.

---

## Backend Deployment

The backend is deployed to **Cloudflare Workers** via **Wrangler**.

All backend commands are defined in the root `package.json`.

### Development Deployment

```bash
pnpm deploy:development
```

or manually with Wrangler:

```bash
wrangler deploy --minify --env development
```

- Deploys the backend to the **development environment** on Cloudflare Workers.

### Production Deployment

```bash
pnpm deploy:production
```

or manually:

```bash
wrangler deploy --minify --env production
```

- Deploys the backend to **production** on Cloudflare Workers.

---

## Common Commands

| Task                          | Command                       |
| ----------------------------- | ----------------------------- |
| Start local dev server        | `pnpm start`                  |
| Type check                    | `pnpm check`                  |
| Lint code                     | `pnpm lint`                   |
| Fix lint issues               | `pnpm lint:fix`               |
| Run tests                     | `pnpm test`                   |
| Database migrations (dev)     | `pnpm db:migrate:development` |
| Database migrations (prod)    | `pnpm db:migrate:production`  |
| Generate types for CF Workers | `pnpm cf-typegen`             |

---

## Notes

- **Frontend publishing** requires a valid `NPM_TOKEN` in GitHub Actions secrets.
- **Backend deployments** use `wrangler` and environment-specific secrets configured in Cloudflare.
- **Webflow scripts** must have their `version` updated after every FE deployment.
- Always run `pnpm install` after pulling new changes.
- Changesets ensure semantic versioning and maintain the changelog automatically.

---

