// knm-managed: v1 version: 1
// Approved screen modules. Add a line here when a screen is added: CODE: './screens/<side>/<name>.js?v=1'
export const SCREENS = {
  S01: './screens/public/landing.js?v=1',
  S02: './screens/public/register.js?v=1',
  S03: './screens/public/login.js?v=1',
  S04: './screens/main/dashboard.js?v=1',
  S05: './screens/main/resume.js?v=1',
  S06: './screens/main/roles.js?v=1',
  S07: './screens/main/interview-config.js?v=1',
  S08: './screens/main/interview-room.js?v=1',
  S09: './screens/main/result.js?v=1',
  S10: './screens/main/history.js?v=1',
  S11: './screens/main/profile.js?v=1'
};

export async function loadScreen(code) {
  const path = SCREENS[code];
  if (!path) throw new Error(`Unknown screen code: ${code}`);
  return import(path);
}
