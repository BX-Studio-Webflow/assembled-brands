#!/usr/bin/env node
/**
 * Safe Cloudflare Worker deploy.
 *
 * Why this exists: all worker config (SECRET_KEY, GOOGLE_PRIVATE_KEY, HubSpot/
 * SendGrid keys, WEBAPP_URL, R2_BUCKET_NAME, ...) is stored as plain_text vars
 * on the deployed worker, NOT as Cloudflare secrets. A bare `wrangler deploy`
 * with a wrangler.jsonc that has no `vars` block will DELETE all of them and
 * the worker will fail to boot. This script preserves them by:
 *
 *   1. recovering the current plain_text vars from the live worker (or a local
 *      secrets/<env>.vars.json file, if you maintain one),
 *   2. applying per-environment overrides (e.g. the R2 bucket),
 *   3. validating the prod-critical vars are present,
 *   4. injecting them into a temporary wrangler.jsonc, deploying, then
 *      restoring the clean committed-style config.
 *
 * Usage:  node scripts/deploy.mjs <development|production>
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV = process.argv[2];
if (!ENV || !['development', 'production'].includes(ENV)) {
	console.error('Usage: node scripts/deploy.mjs <development|production>');
	process.exit(1);
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'e8a9920aa94111ca60571c30408287d9';
const SERVER_DIR = path.resolve(fileURLToPath(import.meta.url), '../..');
const WRANGLER = path.join(SERVER_DIR, 'wrangler.jsonc');
const BACKUP = path.join(SERVER_DIR, '.wrangler.jsonc.deploy-backup');
const LOCAL_VARS = path.join(SERVER_DIR, 'secrets', `${ENV}.vars.json`); // optional, gitignored

const SCRIPT_NAME = ENV === 'production' ? 'assembled-brands-prod' : 'assembled-brands-dev';

// Per-environment overrides applied on top of recovered vars.
const UNDERWRITING_ALERT_VARS = {
	UNDERWRITING_ALERT_EMAILS: 'david@assembledbrands.com',
	UNDERWRITING_ALERT_EMAILS_ENABLED: 'true',
};
const OVERRIDES = {
	development: { R2_BUCKET_NAME: 'file-storage-bucket-dev', ...UNDERWRITING_ALERT_VARS },
	production: { R2_BUCKET_NAME: 'file-storage-bucket', ...UNDERWRITING_ALERT_VARS },
};

const PRODUCTION_REQUIRED = [
	'SECRET_KEY',
	'FRONTEND_URL',
	'WEBAPP_URL',
	'SENDGRID_API_KEY',
	'TRANSACTIONAL_EMAIL_TEMPLATE_ID',
	'HUBSPOT_API_KEY',
	'R2_ACCOUNT_ID',
	'R2_SECRET_ACCESS_KEY_ID',
	'R2_SECRET_ACCESS_KEY',
	'R2_BUCKET_NAME',
	'GOOGLE_CLIENT_EMAIL',
	'GOOGLE_PRIVATE_KEY',
	'GOOGLE_DRIVE_FOLDER_ID',
];

function readWranglerOauthToken() {
	// wrangler rewrites this file with a fresh token; `whoami` below refreshes it.
	const p = path.join(homedir(), 'Library/Preferences/.wrangler/config/default.toml');
	const m = readFileSync(p, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
	if (!m) throw new Error('Could not read wrangler oauth_token. Run `npx wrangler login` first.');
	return m[1];
}

async function recoverLiveVars() {
	// Refresh the oauth token, then pull plain_text bindings off the live worker.
	try {
		execSync('npx wrangler whoami', { cwd: SERVER_DIR, stdio: 'ignore', env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID } });
	} catch {
		/* whoami is best-effort; the API call below surfaces real auth errors */
	}
	const token = readWranglerOauthToken();
	const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/settings`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) {
		throw new Error(
			`Could not read live vars for ${SCRIPT_NAME} (HTTP ${res.status}). ` + `Provide ${path.relative(SERVER_DIR, LOCAL_VARS)} instead.`,
		);
	}
	const data = await res.json();
	const vars = {};
	for (const b of data.result?.bindings ?? []) {
		if (b.type === 'plain_text') vars[b.name] = b.text ?? '';
	}
	return vars;
}

function stripJsonc(s) {
	let out = '',
		i = 0,
		instr = false,
		esc = false;
	while (i < s.length) {
		const c = s[i];
		if (instr) {
			out += c;
			if (esc) esc = false;
			else if (c === '\\') esc = true;
			else if (c === '"') instr = false;
			i++;
			continue;
		}
		if (c === '"') {
			instr = true;
			out += c;
			i++;
			continue;
		}
		if (c === '/' && s[i + 1] === '/') {
			while (i < s.length && s[i] !== '\n') i++;
			continue;
		}
		if (c === '/' && s[i + 1] === '*') {
			i += 2;
			while (i + 1 < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
			i += 2;
			continue;
		}
		out += c;
		i++;
	}
	return out;
}

async function main() {
	let vars;
	if (existsSync(LOCAL_VARS)) {
		console.log(`Using local vars file: ${path.relative(SERVER_DIR, LOCAL_VARS)}`);
		vars = JSON.parse(readFileSync(LOCAL_VARS, 'utf8'));
	} else {
		console.log(`Recovering vars from live worker: ${SCRIPT_NAME}`);
		vars = await recoverLiveVars();
	}

	vars = { ...vars, ...OVERRIDES[ENV] };

	if (ENV === 'production') {
		const missing = PRODUCTION_REQUIRED.filter((k) => !vars[k] || /placeholder|change-me|^local-dev-/i.test(vars[k]));
		if (missing.length) {
			throw new Error(`Refusing to deploy production: missing/placeholder vars: ${missing.join(', ')}`);
		}
	}

	const cfg = JSON.parse(stripJsonc(readFileSync(WRANGLER, 'utf8')));
	cfg.env ??= {};
	cfg.env[ENV] ??= {};
	cfg.env[ENV].vars = vars;

	copyFileSync(WRANGLER, BACKUP);
	writeFileSync(WRANGLER, JSON.stringify(cfg, null, 2));
	console.log(`Injected ${Object.keys(vars).length} vars; deploying ${SCRIPT_NAME}...`);
	try {
		execFileSync('npx', ['wrangler', 'deploy', '--minify', '--env', ENV], {
			cwd: SERVER_DIR,
			stdio: 'inherit',
			env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID },
		});
	} finally {
		copyFileSync(BACKUP, WRANGLER);
		execSync(`rm -f ${JSON.stringify(BACKUP)}`);
		console.log('Restored clean wrangler.jsonc');
	}
}

main().catch((err) => {
	console.error('\nDeploy failed:', err.message);
	process.exit(1);
});
