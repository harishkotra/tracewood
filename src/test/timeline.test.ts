import { describe, it, expect } from 'vitest';

describe('Time-Travel Scrubber Math & Date Filtering', () => {
  const sampleSessions = [
    { id: 's1', startedAt: '2026-08-10T10:00:00Z', title: 'Initial setup' },
    { id: 's2', startedAt: '2026-08-12T14:00:00Z', title: 'Add auth' },
    { id: 's3', startedAt: '2026-08-15T18:00:00Z', title: 'Refactor UI' },
    { id: 's4', startedAt: '2026-08-17T09:00:00Z', title: 'HydraDB integration' }
  ];

  it('filters sessions accurately up to a given historical date', () => {
    const filterDate = '2026-08-12';
    const active = sampleSessions.filter(s => s.startedAt.split('T')[0] <= filterDate);
    expect(active.length).toBe(2);
    expect(active.map(s => s.id)).toEqual(['s1', 's2']);
  });

  it('computes correct min and max dates', () => {
    const dates = sampleSessions.map(s => s.startedAt.split('T')[0]).sort();
    expect(dates[0]).toBe('2026-08-10');
    expect(dates[dates.length - 1]).toBe('2026-08-17');
  });

  it('correctly steps forward 1 day at a time', () => {
    const current = new Date('2026-08-10');
    current.setDate(current.getDate() + 1);
    expect(current.toISOString().split('T')[0]).toBe('2026-08-11');
  });
});
