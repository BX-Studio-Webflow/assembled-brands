# Assembled Brands

A financial platform for brand businesses with integrated onboarding, financial wizards, team management, and document processing capabilities.

This is a monorepo with frontend (Cloudflare Pages) and backend (Cloudflare Workers) packages. For detailed documentation, see [documentation.md](documentation.md).

## Reference

- [Included tools](#included-tools)
- [Requirements](#requirements)
- [Getting started](#getting-started)
  - [Installing](#installing)
  - [Building](#building)
    - [Serving files on development mode](#serving-files-on-development-mode)
    - [Building multiple files](#building-multiple-files)
    - [Setting up a path alias](#setting-up-a-path-alias)
- [Contributing guide](#contributing-guide)
- [Pre-defined scripts](#pre-defined-scripts)
- [CI/CD](#cicd)
  - [Continuous Integration](#continuous-integration)
  - [Continuous Deployment](#continuous-deployment)
  - [How to automatically deploy updates to npm](#how-to-automatically-deploy-updates-to-npm)

## Included tools

This project contains preconfigured development tools:

- [TypeScript](https://www.typescriptlang.org/): Type-safe development across frontend and backend.
- [Cloudflare Workers](https://workers.cloudflare.com/): Serverless edge computing platform.
- [Cloudflare D1](https://developers.cloudflare.com/d1/): SQLite-based edge database.
- [Drizzle ORM](https://orm.drizzle.team/): Type-safe database queries and migrations.
- [Playwright](https://playwright.dev/): Fast and reliable end-to-end testing.
- [Vitest](https://vitest.dev/): Fast unit testing for backend services.
- [ESLint](https://eslint.org/): Code formatting that assures consistency.
- [Prettier](https://prettier.io/): Code linting and quality enforcement.
- [Changesets](https://github.com/changesets/changesets): Version management and changelog generation.

## Requirements

This project requires:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.js.org/) - Install with:

```bash
npm i -g pnpm
```

- [Cloudflare Account](https://dash.cloudflare.com/sign-up) - For Workers and D1 database
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) - Cloudflare's CLI tool

## Getting started

### Installing

Clone the repository and install dependencies:

```bash
pnpm install
```

If this is the first time using Playwright and you want to use it in this project, you'll also have to install the browsers by running:

```bash
pnpm playwright install
```

You can read more about the use of Playwright in the [Testing](#testing) section.

It is also recommended that you install the following extensions in your VSCode editor:

- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

### Database Setup

Initialize the D1 database:

```bash
cd packages/server
pnpm wrangler d1 create <database-name>
pnpm wrangler d1 migrations apply <database-name>
```

Update `packages/server/wrangler.jsonc` with your database ID.

### Building

To run the development servers:

- `pnpm dev`: Runs both frontend and backend in development mode
- `pnpm build`: Builds both packages for production

**Frontend** (Cloudflare Pages):

```bash
cd packages/frontend
pnpm dev  # Development server at localhost:3000
```

**Backend** (Cloudflare Workers):

```bash
cd packages/server
pnpm dev  # Local worker with D1 database
```

## Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing and [Vitest](https://vitest.dev/) for unit tests.

**End-to-End Tests:**

```bash
pnpm test              # Run Playwright tests headless
pnpm test:headed       # Run tests with browser UI
```

Tests are located in:

- `packages/frontend/tests/` - Frontend E2E tests
- `packages/server/test/` - Backend integration tests

**Unit Tests:**

```bash
cd packages/server
pnpm test  # Run Vitest unit tests
```

## Contributing guide

Development workflow:

1. Create a new branch for your feature or bug fix.
2. Make your changes with proper TypeScript types.
3. Run `pnpm lint` and `pnpm test` to ensure code quality.
4. Create a Changeset: `pnpm changeset` (select packages, bump type, and describe changes).
5. Commit your code and the changeset file, then push.
6. Open a Pull Request and wait for CI checks to pass.
7. After merging to `main`, Changesets will create a "Version Packages" PR.
8. Review and merge the version PR to update `CHANGELOG.md` and bump versions.
9. Deploy manually to Cloudflare after the version PR is merged.

## Pre-defined scripts

Available scripts in `package.json`:

**Root level:**

- `pnpm dev`: Run both frontend and backend in development mode
- `pnpm build`: Build both packages for production
- `pnpm lint`: Scan codebase for linting errors
- `pnpm format`: Format code with Prettier
- `pnpm test`: Run all Playwright tests
- `pnpm test:headed`: Run Playwright tests with browser UI
- `pnpm changeset`: Create a new changeset for version tracking
- `pnpm changeset version`: Manually bump versions from changesets

**Package level** (`packages/frontend/` or `packages/server/`):

- `pnpm dev`: Start development server
- `pnpm build`: Build for production
- `pnpm deploy`: Deploy to Cloudflare (via Wrangler)
- `pnpm test`: Run tests (Vitest for server)

## CI/CD

This template contains a set of helpers with proper CI/CD workflows.

### Continuous Integration

When you open a Pull Request, a Continuous Integration workflow will run to:

- Lint & check your code. It uses the `pnpm lint` and `pnpm check` commands under the hood.
- Run the automated tests. It uses the `pnpm test` command under the hood.

If any of these jobs fail, you will get a warning in your Pull Request and should try to fix your code accordingly.

**Note:** If your project doesn't contain any defined tests in the `/tests` folder, you can skip the Tests workflow job by commenting it out in the `.github/workflows/ci.yml` file. This will significantly improve the workflow running times.

### Continuous Deployment

[Changesets](https://github.com/changesets/changesets) manages versioning and changelogs when merging to `main`.

**Creating a changeset:**

```bash
pnpm changeset
```

You'll select which packages changed (frontend/server), the version bump type (major/minor/patch), and describe the changes.

**Workflow:**

1. Merge PR with changeset to `main`
2. Changesets bot creates a "Version Packages" PR automatically
3. Review and merge the version PR to update `CHANGELOG.md` and bump versions
4. Deploy manually to Cloudflare:

```bash
# Frontend
cd packages/frontend && pnpm wrangler pages deploy

# Backend
cd packages/server && pnpm wrangler deploy

# Database migrations
cd packages/server && pnpm wrangler d1 migrations apply <database-name> --remote
```

#### How to enable Continuous Deployment with Changesets

Some repositories may not have the required permissions to let Changesets interact with the repository.

To enable full compatibility with Changesets, go to the repository settings (`Settings > Actions > General > Workflow Permissions`) and define:

- ✅ Read and write permissions.
- ✅ Allow GitHub Actions to create and approve pull requests.

Enabling this setting for your organization account (`Account Settings > Actions > General`) could help streamline the process. By doing so, any new repos created under the org will automatically inherit the setting, which can save your teammates time and effort. This can only be applied to organization accounts at the time.

#### Deployment Configuration

Ensure Cloudflare secrets and environment variables are configured:

1. **Environment Variables**: Set in `wrangler.jsonc` files
2. **Secrets**: Use Wrangler CLI:
   ```bash
   pnpm wrangler secret put SECRET_NAME
   ```
3. **D1 Database**: Bind database ID in `wrangler.jsonc`
4. **R2 Storage**: Configure buckets for asset storage (if applicable)

For production deployments, ensure all secrets (JWT keys, API keys, encryption keys) are set via Wrangler before deploying.
