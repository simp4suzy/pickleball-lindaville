/* ══════════════════════════════════════════════════════════════════════
   scrollLock — a tiny reference-counted body scroll lock
   ----------------------------------------------------------------------
   Multiple, independent UI pieces need to freeze background scrolling at the
   same time (the mobile nav drawer AND the "View ticket" modal, for example).
   When each of them writes `document.body.style.overflow` directly they clobber
   one another: whoever unmounts last wins, and a stale value can leave the page
   permanently locked ("can't scroll up or down") or unlocked while an overlay
   is still open.

   This module makes the lock a shared, counted resource instead:

     • lock()   → increments a counter; the first lock records the previous
                  inline overflow value and applies 'hidden'.
     • unlock() → decrements; only the LAST unlock restores the original value.

   Every consumer calls lock() on open and the returned/paired unlock() on
   close. Order and interleaving no longer matter — the body is locked while at
   least one owner wants it locked, and reliably restored once none do.

   Returns a disposer so callers can simply do:
       const release = lockBodyScroll()
       return release   // in a useEffect cleanup
   and never worry about double-unlocking.
   ══════════════════════════════════════════════════════════════════════ */

let lockCount = 0
let previousOverflow = ''

/**
 * Request a body scroll lock. Safe to call from several components at once.
 * @returns {() => void} A disposer that releases exactly this one lock (idempotent).
 */
export function lockBodyScroll() {
  if (typeof document === 'undefined') return () => {}

  if (lockCount === 0) {
    // First owner: remember what was there so we can put it back exactly.
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1

  let released = false
  return function release() {
    if (released) return // guard against double-release (StrictMode, etc.)
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      // Last owner: restore the original inline value (usually '').
      document.body.style.overflow = previousOverflow
    }
  }
}
