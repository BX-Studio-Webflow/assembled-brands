# Frontend Deployment Guide

## Overview

The frontend JavaScript bundles are automatically deployed to a `dist` branch on GitHub and served via [jsDelivr CDN](https://www.jsdelivr.com/). This allows Webflow users to reference the files directly without npm install.

## How It Works

1. When code is pushed to the `main` branch, GitHub Actions automatically:
   - Builds the frontend production bundle
   - Commits the built files to a `dist` branch
   - jsDelivr CDN automatically serves files from this branch

## Using Files in Webflow

Reference the JavaScript files directly in your Webflow project using jsDelivr URLs:

### URL Format

```
https://cdn.jsdelivr.net/gh/{username}/{repo}@dist/pages/{page-name}/index.js
```

### Example Usage

```html
<!-- Login page -->
<script defer src="https://cdn.jsdelivr.net/gh/finsweet/developer-starter@dist/pages/login/index.js"></script>

<!-- Financial overview page -->
<script defer src="https://cdn.jsdelivr.net/gh/finsweet/developer-starter@dist/pages/financial-financial-overview/index.js"></script>

<!-- Financial company profile -->
<script defer src="https://cdn.jsdelivr.net/gh/finsweet/developer-starter@dist/pages/financial-company-profile/index.js"></script>
```

## Available Page Bundles

All page bundles are available at `https://cdn.jsdelivr.net/gh/{username}/{repo}@dist/pages/{page-name}/index.js`:

- `login`
- `financial-financial-overview`
- `financial-company-profile`
- `onboarding-step-1`
- `onboarding-step-2`
- `onboarding-step-3`
- `team-members`
- `invite-team-members`
- `account-recovery-initiate`
- `account-recovery-complete`
- `account-setup-finish-verification`
- `claim-account`
- `cold-lead-register`
- `finance-docs-accounts-inventory`
- `finance-docs-ecommerce-performance`
- `finance-docs-financial-reports`
- `finance-docs-team-ownership`
- `financial-wizard-step-3`
- `financial-wizard-step-4`
- `financial-wizard-step-5`
- `team-acknowledge-invitation`

## Benefits

- ✅ **Free CDN** - jsDelivr provides free, fast global CDN
- ✅ **Automatic Updates** - Files update automatically when you push to main
- ✅ **No Build Step** - Users don't need to install dependencies
- ✅ **Fast Delivery** - Files are cached globally for optimal performance
- ✅ **Simple URLs** - Easy to reference in Webflow custom code

## Development

For local development, run:

```bash
pnpm --filter @assembled-brands/frontend dev
```

This starts a local server at `http://localhost:3000` where you can test your changes before deploying.

## Deployment Process

Deployment happens automatically via GitHub Actions when:
- Code is pushed to the `main` branch
- Files in `packages/frontend/**` are changed

The workflow:
1. Builds the frontend with production optimizations
2. Creates/updates the `dist` branch with built files
3. jsDelivr automatically picks up the changes (may take a few minutes for cache invalidation)

## Cache Invalidation

jsDelivr caches files for performance. To force a cache refresh, you can:
- Append `?v={timestamp}` to the URL
- Wait a few minutes for automatic cache invalidation
- Use jsDelivr's purge cache API if needed

## Troubleshooting

If files aren't updating:
1. Check that the GitHub Actions workflow completed successfully
2. Verify the `dist` branch exists and contains the latest files
3. Wait a few minutes for jsDelivr cache to refresh
4. Try accessing the file directly on GitHub to verify it exists

