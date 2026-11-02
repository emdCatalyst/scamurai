import { describe, expect, it } from 'vitest';
import {
  APPLICATION_STATUSES,
  canTransition,
  getAllowedTransitions,
  isApplicationStatus,
  isTerminalStatus,
  STATUS_TIMESTAMP_FIELD,
} from './status';

const live = { status: 'live' } as const;
const comingSoon = { status: 'coming_soon' } as const;

describe('application status machine', () => {
  it('walks the happy path pending → quoted → paid → approved', () => {
    expect(canTransition('pending', 'quoted', live)).toBe(true);
    expect(canTransition('quoted', 'paid', live)).toBe(true);
    expect(canTransition('paid', 'approved', live)).toBe(true);
  });

  it('never skips the payment step', () => {
    expect(canTransition('pending', 'approved', live)).toBe(false);
    expect(canTransition('quoted', 'approved', live)).toBe(false);
    expect(canTransition('pending', 'paid', live)).toBe(false);
  });

  it('allows rejection from every open status only', () => {
    for (const from of ['pending', 'quoted', 'paid'] as const) {
      expect(canTransition(from, 'rejected', live)).toBe(true);
    }
    expect(canTransition('approved', 'rejected', live)).toBe(false);
    expect(canTransition('rejected', 'rejected', live)).toBe(false);
  });

  it('treats approved and rejected as terminal', () => {
    expect(isTerminalStatus('approved')).toBe(true);
    expect(isTerminalStatus('rejected')).toBe(true);
    expect(getAllowedTransitions('approved', live)).toEqual([]);
  });

  it('only lets coming-soon interest registrations be rejected', () => {
    expect(getAllowedTransitions('pending', comingSoon)).toEqual(['rejected']);
    expect(canTransition('pending', 'quoted', comingSoon)).toBe(false);
  });

  it('records a timestamp field for every non-initial status', () => {
    for (const status of APPLICATION_STATUSES.filter((s) => s !== 'pending')) {
      expect(STATUS_TIMESTAMP_FIELD[status]).toBeTruthy();
    }
  });

  it('recognises valid statuses', () => {
    expect(isApplicationStatus('paid')).toBe(true);
    expect(isApplicationStatus('archived')).toBe(false);
    expect(isApplicationStatus(undefined)).toBe(false);
  });
});
