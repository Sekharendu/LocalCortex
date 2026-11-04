import fs from 'node:fs';
import path from 'node:path';

/** One process/run only. A prior ledger can never be silently reset or resumed. */
export function openRun(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, 'run.lock');
  const lockFd = fs.openSync(lock, 'wx');
  let ledger;
  try { ledger = fs.openSync(path.join(directory, 'attempts.jsonl'), 'wx'); }
  catch (error) { fs.closeSync(lockFd); fs.unlinkSync(lock); throw error; }
  let count = 0, stopped = false, active = false, closed = false;
  const write = row => { fs.writeSync(ledger, JSON.stringify(row) + '\n'); fs.fsyncSync(ledger); };
  return {
    get count() { return count; },
    async attempt(metadata, dispatch) {
      if (closed || stopped || active || count >= 44) throw Error('Run closed, stopped, busy or at its 44-attempt budget');
      active = true;
      const attempt = ++count, started = performance.now();
      // Persist reservation durably BEFORE dispatch. Even ambiguous network failures count.
      write({ ...metadata, event: 'reserved', attempt, at: new Date().toISOString() });
      try {
        const result = await dispatch();
        write({ event: 'completed', attempt, elapsedMs: performance.now() - started });
        return result;
      } catch (error) {
        stopped = true;
        write({ event: 'failed-stop', attempt, elapsedMs: performance.now() - started, error: error.name + ': ' + error.message });
        throw error;
      } finally { active = false; }
    },
    close() {
      if (active) throw Error('Cannot close an active operation');
      if (!closed) { closed = true; fs.closeSync(ledger); fs.closeSync(lockFd); fs.unlinkSync(lock); }
    },
  };
}
