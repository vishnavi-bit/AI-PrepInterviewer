import { pageHead } from '../../shared/components.js?v=1';
import { button, input } from '../../shared/form.js?v=1';

export const meta = { code: 'S11', name: 'Profile and Settings', side: 'main', icon: 'people', nav: 'Profile', roles: ['candidate'] };

export function render({ data }) {
  const p = data.profile;
  return `${pageHead('Profile and settings')}
    <div class="card">
      ${input('Name', p.name, { required: true })}
      ${input('Email', p.email, { type: 'email' })}
      <p class="note" data-not-defined="Which basic profile fields can be viewed or updated is not defined (REQ-428 open question). Name and email are a sample.">Editable profile fields: not defined.</p>
      ${button('Save', { toast: 'Save would store the changed profile details.' })}
    </div>
    <div class="card">
      ${button('Log out', { action: 'log-out' })}
    </div>`;
}
