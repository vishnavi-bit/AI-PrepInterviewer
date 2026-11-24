import { esc, pageHead, table } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S10', name: 'Interview History', side: 'main', icon: 'activity', nav: 'History', roles: ['candidate'] };

export function render({ data }) {
  const rows = data.history.recent;
  if (!rows.length) {
    return `${pageHead('Interview history')}<div class="card"><p>No completed interviews yet.</p></div>`;
  }
  return `${pageHead('Interview history')}
    <div class="card">
      ${table(
        ['Role', 'Date', 'Score', ''],
        rows.map((r) => [esc(r.role), esc(r.date), esc(r.score), button('Open', { action: 'open-report' })])
      )}
    </div>`;
}
