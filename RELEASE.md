# Release & Deployment Process

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and deployments.

## How It Works

1. **Create Changeset**: When you make changes, create a changeset describing them
2. **Version Bump**: When PRs are merged to `master`, Changesets automatically creates a version bump PR
3. **Version & Deploy**: When the version PR is merged, it automatically:
   - Creates a git tag (e.g., `v1.0.0`)
   - Triggers deployment to Cloudflare Pages

## Creating a Changeset

When you make changes that should be released:

```bash
pnpm changeset
```

You'll be prompted to:
- Select which packages changed
- Choose the type of change (major, minor, patch)
- Write a summary of the changes

This creates a file in `.changeset/` that describes your changes.

## Release Workflow

### Automatic Process

1. **Make changes** → Create changeset with `pnpm changeset`
2. **Commit and push** → Merge PR to `master`
3. **Version PR created** → Changesets bot creates a PR with version bumps
4. **Merge version PR** → Automatically:
   - Bumps package versions
   - Updates CHANGELOG.md
   - Creates git tag (e.g., `v1.0.0`)
   - **Deploys to Cloudflare Pages** 🚀

### Manual Process

If you need to manually trigger:

```bash
# Version packages (creates version bump PR)
pnpm changeset:version
```

## Deployment

Deployment happens automatically when:
- ✅ A version tag is created (after changesets publishes)
- ✅ You manually trigger the workflow

The frontend is automatically built and deployed to Cloudflare Pages.

## Required Secrets

### For Deploying to Cloudflare Pages (required)
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages:Edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## GitHub Actions Workflows

- **`.github/workflows/release.yml`**: Handles version bumping and tag creation
- **`.github/workflows/deploy.yml`**: Handles deployment to Cloudflare Pages
- **`.github/workflows/ci.yml`**: Runs tests and linting on PRs

## Example Workflow

```bash
# 1. Make your changes
git checkout -b feature/my-feature
# ... make changes ...

# 2. Create changeset
pnpm changeset
# Select: patch/minor/major
# Write: "Added new feature X"

# 3. Commit and push
git add .
git commit -m "feat: add new feature X"
git push origin feature/my-feature

# 4. Create PR and merge to master
# → Version PR is created automatically
# → Merge version PR
# → Deployment happens automatically! 🎉
```

## Troubleshooting

### Changesets not creating version PR
- Ensure GitHub Actions has write permissions (Settings > Actions > General > Workflow permissions)
- Check that changeset files exist in `.changeset/` directory

### Deployment fails
- Verify Cloudflare credentials are correct
- Check that the `packages/frontend/dist` directory exists after build
- Ensure Cloudflare Pages project `assembled-frontend-assets` exists
