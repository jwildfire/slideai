// Feature: slideai-framework, Property 12: Watcher debounces rapid events
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

const { createDebouncedHandler } = require('../lib/watch.js');

/**
 * Validates: Requirements 5.3
 *
 * Property 12: Watcher debounces rapid events
 * For any sequence of N file change events occurring within a 500ms window,
 * the watcher shall trigger exactly one render call.
 */
describe('Property 12: Watcher debounces rapid events', () => {

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires exactly once for N rapid events within a single debounce window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (eventCount) => {
          let callCount = 0;
          const debounceMs = 500;
          const handler = createDebouncedHandler(() => { callCount++; }, debounceMs);

          // Fire all events synchronously — all within the same debounce window
          for (let i = 0; i < eventCount; i++) {
            handler();
          }

          // Advance past the debounce window
          vi.advanceTimersByTime(debounceMs + 1);

          expect(callCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fires once per distinct debounce window when events are separated by gaps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (windowCount, eventsPerWindow) => {
          let callCount = 0;
          const debounceMs = 500;
          const handler = createDebouncedHandler(() => { callCount++; }, debounceMs);

          for (let w = 0; w < windowCount; w++) {
            // Fire a burst of events
            for (let e = 0; e < eventsPerWindow; e++) {
              handler();
            }
            // Advance past the debounce window so it settles
            vi.advanceTimersByTime(debounceMs + 1);
          }

          expect(callCount).toBe(windowCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('callback is not called before debounce window expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (eventCount) => {
          let callCount = 0;
          const debounceMs = 500;
          const handler = createDebouncedHandler(() => { callCount++; }, debounceMs);

          for (let i = 0; i < eventCount; i++) {
            handler();
          }

          // Check before debounce expires — should not have fired
          vi.advanceTimersByTime(debounceMs - 1);
          expect(callCount).toBe(0);

          // Now advance past the window
          vi.advanceTimersByTime(2);
          expect(callCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
