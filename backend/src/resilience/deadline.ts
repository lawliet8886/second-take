/** Bound the caller's wait even when a provider ignores its transport timeout.
 * Late provider completion is observed but cannot re-enter the state transition.
 * This does not cancel provider billing or replace the transport's own timeout.
 */
export async function withinDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("APPLICATION_DEADLINE")), Math.max(0, milliseconds));
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
