// Animated aurora background behind every page. One fixed layer: drifting colour glows and a faint grid, all painted as
// background layers (no child elements). Only background-position animates, and motion stops for reduced-motion users.
import React from 'react';

const CSS = `
@keyframes pp-aurora-drift {
  0%   { background-position: 0% 0%, 100% 10%, 50% 100%, 0 0; }
  50%  { background-position: 12% 6%, 88% 18%, 62% 88%, 0 0; }
  100% { background-position: 0% 0%, 100% 10%, 50% 100%, 0 0; }
}
@keyframes pp-grid-drift { from { background-position: 0% 0%, 100% 10%, 50% 100%, 0 0; } to { background-position: 0% 0%, 100% 10%, 50% 100%, 56px 56px; } }
.pp-aurora { animation: pp-aurora-drift 26s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .pp-aurora { animation: none !important; } }
`;

const GRID = 'linear-gradient(var(--pp-grid) 1px, transparent 1px), linear-gradient(90deg, var(--pp-grid) 1px, transparent 1px)';
const ORBS = [
  'radial-gradient(circle at center, var(--pp-orb-1) 0%, transparent 62%)',
  'radial-gradient(circle at center, var(--pp-orb-2) 0%, transparent 62%)',
  'radial-gradient(circle at center, var(--pp-orb-3) 0%, transparent 62%)',
].join(', ');

export function Aurora() {
  return (
    <>
      <style>{CSS}</style>
      <div
        aria-hidden="true"
        className="pp-aurora"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: 'transparent',
          backgroundImage: `${ORBS}, ${GRID}`,
          backgroundSize: '70vmax 70vmax, 60vmax 60vmax, 80vmax 80vmax, 56px 56px',
          backgroundRepeat: 'no-repeat, no-repeat, no-repeat, repeat',
          backgroundPosition: '0% 0%, 100% 10%, 50% 100%, 0 0',
        }}
      />
    </>
  );
}
