import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BASE, read, save } from './common.mjs';
let status = 'complete', error = null;
for (const format of ['pdf', 'docx']) {
  const summary = path.join(BASE, `${format}.summary.json`);
  if (!fs.existsSync(summary)) {
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'eval/ap-query-form-20261102/worker.mjs', format], { stdio: 'inherit', timeout: 90 * 60 * 1000 });
    if (child.error) { status = 'blocked'; error = child.error.message; break; }
  }
  if (!fs.existsSync(summary)) { status = 'blocked'; error = `${format} produced no completed summary`; break; }
  const result = read(summary);
  if (result.status !== 'complete') { status = 'blocked'; error = result.error; break; }
}
save('execution-status.json', { status, error });
console.log(JSON.stringify({ status, error }));
if (status !== 'complete') process.exitCode = 2;
