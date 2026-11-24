import { pageHead } from '../../shared/components.js?v=1';
import { button, input } from '../../shared/form.js?v=1';

export const meta = { code: 'S03', name: 'Login page', side: 'public', bare: true, roles: ['candidate'] };

export function render() {
  return `
    ${pageHead('Log in')}
    <div class="card">
      ${input('Email or username', '', {
        required: true,
        notDefined: 'Whether login uses an email or a username is not defined (REQ-428 open question). The field is labelled Email or username until the spec decides.'
      })}
      ${input('Password', '', { required: true, type: 'password' })}
      <p class="note" data-not-defined="The wording of the login error is not defined. REQ-428 criterion 3 only requires a safe, understandable error message.">If the details are wrong, a safe error message is shown here.</p>
      ${button('Log in', { action: 'log-in', primary: true })}
    </div>`;
}
