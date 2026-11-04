import fs from 'node:fs';
import path from 'node:path';
export function openRemaining(directory, previousLedger) {
  const events = fs.readFileSync(previousLedger, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const previous = events.filter(e => e.event === 'reserved');
  if (previous.some((r, i) => r.attempt !== i + 1) || previous.length > 468) throw Error('Prior budget invalid');
  const keys = new Set(previous.map(r => `${r.caseId}:${r.mode}`));
  if (keys.size !== previous.length) throw Error('Prior attempts duplicated');
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, 'run.lock'), lockFd = fs.openSync(lock, 'wx');
  let fd;
  try { fd = fs.openSync(path.join(directory, 'attempts.jsonl'), 'wx'); }
  catch (e) { fs.closeSync(lockFd); fs.unlinkSync(lock); throw e; }
  let count = previous.length, busy = false, stopped = false, closed = false;
  const write = e => { fs.writeSync(fd, JSON.stringify(e) + '\n'); fs.fsyncSync(fd); };
  return {
    get count() { return count; },
    attempted(caseId, mode) { return keys.has(`${caseId}:${mode}`); },
    async attempt(metadata, dispatch) {
      const key = `${metadata.caseId}:${metadata.mode}`;
      if (closed || stopped || busy || count >= 468 || keys.has(key)) throw Error('Closed/stopped/busy/budget/duplicate attempt');
      busy = true; keys.add(key); const attempt = ++count, start = performance.now();
      write({ ...metadata, event: 'reserved', attempt, at: new Date().toISOString() });
      try { const value = await dispatch(); write({ event: 'completed', attempt, elapsedMs: performance.now() - start }); return value; }
      catch (e) {
        const timeout = e.message === 'Reranking cancelled or timed out';
        stopped = !timeout;
        write({ event: timeout ? 'failed-timeout-no-retry' : 'failed-stop', attempt, elapsedMs: performance.now() - start, error: `${e.name}: ${e.message}` });
        throw e;
      } finally { busy = false; }
    },
    close() { if (busy) throw Error('Busy'); if (!closed) { closed = true; fs.closeSync(fd); fs.closeSync(lockFd); fs.unlinkSync(lock); } },
  };
}
