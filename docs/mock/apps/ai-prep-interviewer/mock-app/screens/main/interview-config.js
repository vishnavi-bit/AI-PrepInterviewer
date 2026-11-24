import { esc, pageHead } from '../../shared/components.js?v=1';
import { button, radios, select } from '../../shared/form.js?v=1';

export const meta = { code: 'S07', name: 'Interview Configuration', side: 'main', roles: ['candidate'] };

export function render({ data }) {
  const i = data.interview;
  const role = data.roles.selected || data.roles.list[0].title;
  return `${pageHead('Set up your interview')}
    <div class="card">
      <h2>Review before you start</h2>
      <div class="kv">
        <div><span>Role</span><strong>${esc(role)}</strong></div>
        <div><span>Interview type</span><strong>${esc(i.type)}</strong></div>
        <div><span>Difficulty</span><strong>${esc(i.difficulty)}</strong></div>
        <div><span>Duration</span><strong>${esc(i.duration)}</strong></div>
      </div>
    </div>
    <div class="card">
      ${radios('Interview type', 'type', ['Technical', 'HR', 'Behavioral', 'Project-based'], i.type)}
      ${radios('Difficulty', 'difficulty', ['Easy', 'Medium', 'Hard'], i.difficulty)}
      ${select('Duration', ['15 minutes', '30 minutes', '45 minutes'], i.duration, {
        notDefined: 'The duration options are configured, but the values are not defined in the spec (REQ-432 open question). These values are a sample.'
      })}
    </div>
    ${button('Start interview', { action: 'start-interview', primary: true })}`;
}
