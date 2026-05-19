import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: process.env.PORT || '4200',
  // Default SSR → API uses HTTP (launchSettings `http://localhost:52288`). Override with SSR_API_URL if needed.
  NODE_TLS_REJECT_UNAUTHORIZED:
    process.env.NODE_TLS_REJECT_UNAUTHORIZED !== undefined
      ? process.env.NODE_TLS_REJECT_UNAUTHORIZED
      : '0',
  // Must end with / so `${apiUrl}api/...` works in PublicAppService (was breaking blog + all SSR HTML).
  SSR_API_URL: process.env.SSR_API_URL || 'http://localhost:52288/',
  // Angular SSR host validation allowlist for local development.
  NG_ALLOWED_HOSTS:
    process.env.NG_ALLOWED_HOSTS || 'localhost,127.0.0.1,[::1]',
};

const child = spawn(process.execPath, ['dist/site/server/server.mjs'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
