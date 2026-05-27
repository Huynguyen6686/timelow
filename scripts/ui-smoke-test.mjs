import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.log('UI smoke skipped: Chrome/Edge executable was not found.');
  process.exit(0);
}

const port = 4188;
const profileDir = join(tmpdir(), `timeflow-ui-smoke-${Date.now()}`);
const screenshotPath = join(tmpdir(), 'timeflow-ui-smoke.png');
mkdirSync(profileDir, { recursive: true });

const server = spawn('node', ['dist/server.cjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'smoke-test-key',
  },
  stdio: ['ignore', 'ignore', 'ignore'],
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

try {
  await wait(2000);

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    `--user-data-dir=${profileDir}`,
    '--window-size=390,844',
    '--virtual-time-budget=15000',
    `--screenshot=${screenshotPath}`,
    `http://127.0.0.1:${port}/`,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  const exitCode = await new Promise((resolve) => chrome.on('exit', resolve));
  if (exitCode !== 0) {
    throw new Error(`Chrome exited with code ${exitCode}`);
  }

  if (!existsSync(screenshotPath) || statSync(screenshotPath).size < 10000) {
    throw new Error('UI screenshot was not created or is too small');
  }

  console.log(`UI smoke passed: ${screenshotPath}`);
} finally {
  server.kill();
  rmSync(profileDir, { recursive: true, force: true });
}
