# Release & Publish Process

This repository uses **Changesets** and **GitHub Actions** to automate versioning, tagging, building, and publishing packages to npm. The process minimizes manual work while ensuring consistent and traceable releases.

---

## Prerequisites

* `pnpm` installed locally
* Access to push branches and open pull requests
* GitHub repository secrets configured:

  * `PAT` – Personal Access Token with `contents` and `pull-requests` permissions
  * `NPM_TOKEN` – npm access token with publish permissions

---

## Manual Release Preparation (Fix Branch)

All releases must start from a **fix branch**.

1. From the **root directory**, generate a changeset:

   ```bash
   pnpm changeset
   ```

   During this step:

   * Select the affected package(s)
   * Choose the correct version bump (patch / minor / major)
   * Write a clear description of the change

2. Apply the version updates locally:

   ```bash
   pnpm changeset version
   ```

3. Commit and push your changes:

   ```bash
   git add .
   git commit -m "chore: prepare release"
   git push
   ```

4. Open a Pull Request targeting the `main` branch and merge it.

---

## Automated Release (on `main`)

When changes are merged into `main`, the **Release & Publish** GitHub Action is triggered automatically.

---

## GitHub Actions Workflow

### Trigger

The workflow runs on:

* Pushes to the `main` branch
* Manual invocation via `workflow_dispatch`

Concurrency is enforced per branch to avoid overlapping releases.

---

### Workflow Steps

1. **Checkout Repository**

   * Full git history is fetched
   * Authentication is done using a Personal Access Token (PAT)

2. **Setup Environment**

   * Node.js `22.x`
   * pnpm `10.11.1`
   * Dependencies installed via pnpm

3. **Version Packages**

   * Runs:

     ```bash
     pnpm changeset version
     ```
   * Commits version changes with:

     ```
     chore: version packages
     ```
   * Creates or updates a Changesets release PR if required

4. **Create Git Tag**

   * Reads the version from:

     ```
     packages/frontend/package.json
     ```
   * Creates an annotated git tag:

     ```
     vX.Y.Z
     ```
   * Pushes the tag if it does not already exist

5. **Build Frontend Package**

   ```bash
   pnpm --filter @assembled-brands/frontend build
   ```

6. **Authenticate npm**

   * Uses `NPM_TOKEN` to authenticate with the npm registry

7. **Publish to npm**

   * Publishes the frontend package as a public npm package:

     ```
     @assembled-brands/frontend
     ```

---

## Release Outcome

After a successful workflow run:

* ✅ Versions are updated and committed
* ✅ A git tag (`vX.Y.Z`) is created
* ✅ The frontend package is built successfully
* ✅ The package is published to npm

---

## Summary

This release flow provides:

* Automated semantic versioning
* Safe and repeatable releases
* Traceability through git commits and tags
* Zero manual publishing steps

All contributors should follow this process to ensure consistent and reliable releases.
