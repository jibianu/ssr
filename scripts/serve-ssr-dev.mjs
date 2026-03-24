import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: process.env.PORT || '4200',
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
