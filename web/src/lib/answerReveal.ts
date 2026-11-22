const FRAME_MS = 40;
const CHARACTERS_PER_SECOND = 60;
const MAX_DRAIN_MS = 2500;

/** Pace the visible prefix of one answer independently of the network reader. */
export function createAnswerReveal(publish: (text: string) => void) {
  let text = "";
  let visible = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastFrame = 0;
  let carry = 0;
  let deadline: number | undefined;
  let resolveDrain: (() => void) | undefined;

  function reveal(count: number) {
    const next = Math.min(text.length, visible + count);
    if (next === visible) return;
    // A timing boundary can split a UTF-16 surrogate pair, even if the decoder didn't.
    visible = (text.codePointAt(next - 1) ?? 0) > 0xffff ? next + 1 : next;
    publish(text.slice(0, visible));
  }

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    resolveDrain?.();
    resolveDrain = undefined;
  }

  function frame() {
    timer = undefined;
    const now = performance.now();
    const elapsed = now - lastFrame;
    const allowance = carry + (elapsed * CHARACTERS_PER_SECOND) / 1000;
    const normal = Math.floor(allowance);
    carry = allowance - normal;
    const catchUp = deadline === undefined ? 0 :
      Math.ceil(((text.length - visible) * elapsed) / Math.max(elapsed, deadline - lastFrame));
    reveal(Math.max(normal, catchUp));
    schedule();
  }

  function schedule() {
    if (visible === text.length) {
      cancel();
    } else if (timer === undefined) {
      lastFrame = performance.now();
      timer = setTimeout(frame, FRAME_MS);
    }
  }

  return {
    update(answer: string) {
      text = answer;
      if (visible === 0) reveal(Math.round((FRAME_MS * CHARACTERS_PER_SECOND) / 1000));
      schedule();
    },
    get pending() { return visible < text.length; },
    drain() {
      if (visible === text.length) return Promise.resolve();
      deadline = performance.now() + MAX_DRAIN_MS;
      return new Promise<void>((resolve) => { resolveDrain = resolve; });
    },
    showAll() {
      reveal(text.length - visible);
      cancel();
    },
    cancel,
  };
}
