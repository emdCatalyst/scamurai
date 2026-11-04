import { clearSavedScreens, setSigningOut } from './pageCache';
import { waitAtMost, withTimeout } from './timeout';

/** What a worker would leave on the phone by signing out. */
export interface LeftOnPhone {
  /** Their orders the server doesn't have yet (waiting or refused): sent when they sign in here again. */
  unsent: number;
  /** Of those, the ones only in this page's memory (the phone couldn't save them): lost on sign-out. */
  unsaved: number;
}

/** The order screen's part of signing a worker out (see src/components/staff/useOutbox.ts). */
export interface WorkerLeaving {
  /** Gives the worker's waiting orders a last chance to upload; says what is still on the phone. */
  uploadFirst(): Promise<LeftOnPhone>;
  /** Asked when orders would stay behind: true signs out anyway. */
  confirmLeaving(left: LeftOnPhone): boolean | Promise<boolean>;
  /** Deletes the worker's drafts and reports orders left behind. */
  cleanUp(): Promise<void>;
}

/** Clerk can't sign out without a connection: past this, the worker is told it failed. */
const SIGN_OUT_MS = 15_000;
/** Cleanup must never hold up signing out. */
const CLEANUP_MS = 3_000;

/**
 * Signs out of a shared phone, so the next worker gets nothing of this one.
 * With `worker`, their orders first get a last chance to upload, and if
 * some are left the worker is asked; then their drafts and the saved order
 * screen are deleted, which never blocks the sign-out. Resolves false if
 * the worker chose to stay signed in; rejects if signing out failed, so the
 * screen can say so.
 */
export async function signOutOfPhone(signOut: () => Promise<unknown>, worker?: WorkerLeaving): Promise<boolean> {
  if (worker) {
    const left = await worker.uploadFirst().catch(() => ({ unsent: 0, unsaved: 0 }));
    if (left.unsent > 0 && !(await worker.confirmLeaving(left))) return false;
  }
  setSigningOut(true);
  try {
    await waitAtMost(Promise.all([worker?.cleanUp(), clearSavedScreens()]), CLEANUP_MS);
    await withTimeout(signOut(), SIGN_OUT_MS, () => new Error('Signing out took too long'));
    return true;
  } catch (err) {
    setSigningOut(false);
    throw err;
  }
}
