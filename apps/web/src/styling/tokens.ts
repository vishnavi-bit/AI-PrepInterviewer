// Design tokens: a futuristic, colourful theme with a dark and a light mode. Gradients, glow and glass are shared; the
// surface and text colours are CSS variables, so every page switches with the colour mode.
// The contract values (brand 500, body font, initial mode key) are kept so the module contract still describes the theme.
export const GRADIENT = 'linear-gradient(120deg, #22D3EE 0%, #8B5CF6 50%, #EC4899 100%)';
export const GRADIENT_SOFT = 'linear-gradient(120deg, rgba(34,211,238,0.35), rgba(139,92,246,0.35), rgba(236,72,153,0.35))';
export const GLOW = '0 0 24px rgba(139,92,246,0.45), 0 0 60px rgba(34,211,238,0.18)';

// Dark is the default theme. Light overrides the same variables on any element carrying Chakra's .chakra-ui-light class.
const DARK_VARS = {
  '--pp-bg': '#03050E',
  '--pp-text': '#EEF2FF',
  '--pp-muted': 'rgba(226,232,255,0.74)',
  '--pp-faint': 'rgba(226,232,255,0.55)',
  '--pp-border': 'rgba(255,255,255,0.12)',
  '--pp-border-strong': 'rgba(255,255,255,0.22)',
  '--pp-glass': 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 100%)',
  '--pp-fill': 'rgba(255,255,255,0.05)',
  '--pp-input': 'rgba(5,8,24,0.55)',
  '--pp-sidebar': 'rgba(10,14,38,0.55)',
  '--pp-shadow': '0 18px 50px -20px rgba(0,0,0,0.7)',
  '--pp-grid': 'rgba(139,92,246,0.10)',
  '--pp-orb-1': 'rgba(139,92,246,0.55)',
  '--pp-orb-2': 'rgba(34,211,238,0.42)',
  '--pp-orb-3': 'rgba(236,72,153,0.38)',
  '--pp-glow-soft': 'rgba(139,92,246,0.45)',
};

const LIGHT_VARS = {
  '--pp-bg': '#F3F5FF',
  '--pp-text': '#0B1030',
  '--pp-muted': 'rgba(11,16,48,0.72)',
  '--pp-faint': 'rgba(11,16,48,0.52)',
  '--pp-border': 'rgba(30,40,100,0.14)',
  '--pp-border-strong': 'rgba(30,40,100,0.26)',
  '--pp-glass': 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.62) 100%)',
  '--pp-fill': 'rgba(30,40,100,0.05)',
  '--pp-input': 'rgba(255,255,255,0.85)',
  '--pp-sidebar': 'rgba(255,255,255,0.72)',
  '--pp-shadow': '0 18px 50px -24px rgba(30,40,100,0.28)',
  '--pp-grid': 'rgba(99,102,241,0.12)',
  '--pp-orb-1': 'rgba(139,92,246,0.22)',
  '--pp-orb-2': 'rgba(34,211,238,0.2)',
  '--pp-orb-3': 'rgba(236,72,153,0.16)',
  '--pp-glow-soft': 'rgba(139,92,246,0.3)',
};

export const chakraTokens = {
  config: { initialColorMode: 'light', useSystemColorMode: false },
  colors: {
    brand: {
      50: '#EEF0FF', 100: '#DCE0FF', 200: '#B9C1FF', 300: '#939FFF', 400: '#7A87FF',
      500: '#6470F5', 600: '#4D5BE0', 700: '#3D48B5', 800: '#2D3788', 900: '#1E2661',
    },
    space: {
      950: '#03050E', 900: '#070B1F', 850: '#0B1130', 800: '#111843', 700: '#1B2358', 600: '#283076',
    },
    neon: {
      cyan: '#22D3EE', violet: '#8B5CF6', pink: '#EC4899', lime: '#A3E635', amber: '#FBBF24',
    },
  },
  fonts: {
    heading: "'Space Grotesk', 'Geist', system-ui, sans-serif",
    body: "'Geist', 'Manrope', system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
  },
  radii: { none: '0', sm: '8px', md: '12px', lg: '16px', xl: '22px', '2xl': '28px', full: '9999px' },
  shadows: { glow: GLOW },
  styles: {
    global: {
      ':root': DARK_VARS,
      '.chakra-ui-light': LIGHT_VARS,
      html: { background: 'transparent' },
      body: {
        bg: 'var(--pp-bg)',
        color: 'var(--pp-text)',
        WebkitFontSmoothing: 'antialiased',
        textWrap: 'pretty',
        overflowX: 'hidden',
        transition: 'background-color 400ms ease, color 400ms ease',
      },
      'h1, h2, h3': { textWrap: 'balance', fontFamily: "'Space Grotesk', 'Geist', system-ui, sans-serif" },
      '::selection': { background: 'rgba(139,92,246,0.5)', color: '#fff' },
      '*:focus-visible': { outline: '2px solid', outlineColor: 'neon.cyan', outlineOffset: '3px' },
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': { animationDuration: '0.001ms !important', animationIterationCount: '1 !important', transitionDuration: '0.001ms !important', scrollBehavior: 'auto !important' },
      },
    },
  },
};
