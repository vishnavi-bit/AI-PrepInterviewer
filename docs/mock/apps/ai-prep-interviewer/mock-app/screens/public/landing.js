import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S01', name: 'Landing page', side: 'public', bare: true, roles: ['candidate'] };

export function render() {
  return `
    <section class="hero">
      <small>Practice interviews with an AI interviewer</small>
      <h1>AI PrepInterviewer</h1>
      <p>Upload your resume, practise a mock interview for a role you choose, and review your feedback over time.</p>
    </section>
    <div class="row">
      ${button('Create account', { action: 'register', primary: true })}
      ${button('Log in', { action: 'login' })}
    </div>
    <p class="note">Scores are AI-generated practice estimates, not guarantees of hiring outcomes.</p>`;
}
