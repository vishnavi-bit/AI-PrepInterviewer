import { esc, pageHead } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S06', name: 'Job Role Recommendation', side: 'main', icon: 'check', nav: 'Roles', roles: ['candidate'] };

export function render({ data }) {
  const selected = data.roles.selected || data.roles.list[0].title;
  return `${pageHead('Suggested roles for your resume')}
    <p class="note" data-not-defined="How many roles are shown at once is not defined (REQ-431 open question). This mock shows two.">Roles shown: a sample of two.</p>
    ${data.roles.list
      .map(
        (r) => `
    <label class="card">
      <span class="row"><span><input type="radio" name="role" value="${esc(r.title)}"${
          r.title === selected ? ' checked' : ''
        } data-toast="${esc(r.title)} would be selected."> <strong>${esc(r.title)}</strong></span></span>
      <span class="note">Why: ${esc(r.why)}</span>
    </label>`
      )
      .join('')}
    ${button('Choose this role', { action: 'choose-role', primary: true })}`;
}
