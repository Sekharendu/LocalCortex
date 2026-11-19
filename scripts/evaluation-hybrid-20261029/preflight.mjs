/** Fresh local protection scan bound to one sealed run; zero provider requests. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {args,writeNew,sha,DEADLINE,RESET} from './common.mjs';
import {readFrozenRun,verifyFrozenFiles,scanCredentials} from './validation.mjs';
const options=args(),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');if(!options.out)throw Error('--out report path required');
const out=path.dirname(options.out),run=readFrozenRun(out);verifyFrozenFiles(run,root,out);
const report=scanCredentials(root,{freePlanConfirmed:options['free-plan']==='user-confirmed'});
writeNew(options.out,{...report,runId:run.id,runManifestSha256:sha(fs.readFileSync(path.join(out,'run.json'))),at:new Date().toISOString(),deadline:DEADLINE,providerReset:RESET,providerRequests:0,limitations:'Prior account usage unknown; quota authoritative. Missing built assets remain unverified.'});
console.log(JSON.stringify({report:options.out,passed:report.passed,checks:report.checks}));if(!report.passed)process.exitCode=1;
