import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe('bubble button styles', () => {
  it('lets the hidden attribute actually hide the join button', () => {
    // Regression guard for a defect no lint/typecheck/unit test can see:
    // `.bubble__join { display: inline-block }` is an AUTHOR declaration, and
    // author rules beat the user agent's `[hidden] { display: none }` in the
    // cascade regardless of specificity. Without an explicit rule, the
    // animator's `joinButton.hidden = true` — the case where a meeting has
    // neither a join link nor an event page (lib/action.ts) — would still
    // paint a button that goes nowhere.
    expect(css).toMatch(/\.bubble__join\[hidden\]\s*\{[^}]*display:\s*none/);
  });
});
