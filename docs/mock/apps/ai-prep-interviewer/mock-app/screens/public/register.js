import { pageHead } from '../../shared/components.js?v=1';
import { button, input } from '../../shared/form.js?v=1';

export const meta = { code: 'S02', name: 'Registration page', side: 'public', bare: true, roles: ['candidate'] };

export function render({ data }) {
  return `
    ${pageHead('Create your account')}
    <div class="card">
      <p class="note" data-not-defined="Which account details are required at registration is not defined. The spec only says Account details (to confirm) (REQ-428 open question). The three fields shown are a sample.">Account details: required fields not defined. Fields shown are a sample.</p>
      ${input('Full name', data.profile.name, { required: true })}
      ${input('Email', data.profile.email, { required: true, type: 'email' })}
      ${input('Password', '', { required: true, type: 'password' })}
      ${button('Create account', { action: 'create-account', primary: true })}
    </div>`;
}
