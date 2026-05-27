import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const port = 4179;
const baseUrl = `http://127.0.0.1:${port}`;

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return { response, text };
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const { response } = await fetchText('/');
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Server did not become ready: ${lastError?.message || 'timeout'}`);
}

async function assertNoDataWipeRegression() {
  const assetFiles = await readdir(join(process.cwd(), 'dist', 'assets'));
  const jsFiles = assetFiles.filter((file) => file.endsWith('.js'));

  await assert(jsFiles.length > 0, 'Expected at least one built JS asset');

  for (const file of jsFiles) {
    const contents = await readFile(join(process.cwd(), 'dist', 'assets', file), 'utf8');
    await assert(
      !contents.includes('timeflow_complete_wipe_v10'),
      `Data-wipe regression found in built asset: ${file}`,
    );
  }
}

const child = spawn('node', ['dist/server.cjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'smoke-test-key',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

try {
  await assertNoDataWipeRegression();
  await waitForServer();

  const home = await fetchText('/');
  await assert(home.response.status === 200, `Expected / to return 200, got ${home.response.status}`);
  await assert(home.text.includes('<div id="root"></div>'), 'Expected / to serve the React shell');

  const manifest = await fetchText('/manifest.json');
  await assert(manifest.response.status === 200, `Expected /manifest.json to return 200, got ${manifest.response.status}`);
  await assert(manifest.text.includes('"short_name"'), 'Expected manifest to include short_name');

  const serviceWorker = await fetchText('/sw.js');
  await assert(serviceWorker.response.status === 200, `Expected /sw.js to return 200, got ${serviceWorker.response.status}`);
  await assert(serviceWorker.text.includes('timeflow-cache-v2'), 'Expected service worker cache version v2');

  const badQuickAdd = await fetchText('/api/ai/quickadd', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  await assert(badQuickAdd.response.status === 400, `Expected bad quickadd request to return 400, got ${badQuickAdd.response.status}`);

  console.log('Smoke test passed');
} catch (error) {
  console.error(output.trim());
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill();
}
