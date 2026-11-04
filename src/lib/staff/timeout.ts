/** `promise`, or a rejection with `timedOut()` after `ms`: one stuck call must not hold up the staff screen. */
export function withTimeout<T>(promise: Promise<T>, ms: number, timedOut: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timedOut()), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

/** Waits for `promise` to settle, but no longer than `ms`; never rejects. */
export async function waitAtMost(promise: Promise<unknown>, ms: number): Promise<void> {
  await withTimeout(promise, ms, () => new Error('Timed out')).catch(() => {});
}
