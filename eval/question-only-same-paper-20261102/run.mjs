import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BASE, read, save } from './common.mjs';
let status = 'complete', error = null;
for (const format of ['pdf', 'docx']) {
  const file = path.join(BASE, `${format}.summary.json`);
  if (!fs.existsSync(file)) {
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'eval/question-only-same-paper-20261102/worker.mjs', format], { stdio: 'inherit', timeout: 60 * 60 * 1000 });
    if (child.error) { status = 'blocked'; error = child.error.message; break; }
  }
  if (!fs.existsSync(file)) { status = 'blocked'; error = 'Worker has not saved a summary'; break; }
  const summary = read(file);
  if (summary.status !== 'complete') { status = 'blocked'; error = summary.error; break; }
}
save('execution-status.json', { status, error });
console.log(JSON.stringify({ status, error }));
if (status !== 'complete') process.exitCode = 2;
