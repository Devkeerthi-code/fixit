/*
  The backend sleeps on Render's free tier, so the first request after a quiet spell can take up to a minute.
  The client reports requests that are still pending after SLOW_AFTER_MS here, and the UI shows a calm
  "waking up" notice instead of an error while they finish.
*/
type Listener = () => void;

let slowCount = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export const waking = {
  begin() {
    slowCount += 1;
    if (slowCount === 1) emit();
  },
  end() {
    slowCount = Math.max(0, slowCount - 1);
    if (slowCount === 0) emit();
  },
  isWaking(): boolean {
    return slowCount > 0;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reset() {
    slowCount = 0;
    emit();
  },
};
