import { esc, pageHead, table } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S04', name: 'Dashboard', side: 'main', icon: 'home', nav: 'Home', roles: ['candidate'] };

const averageNote = () =>
  `<p class="note" data-not-defined="The average score is shown only after enough completed interviews. The number needed is not defined (REQ-436 open question).">Average score: shown once there are enough completed interviews.</p>`;

export function render({ user, data }) {
  const h = data.history;
  const hero = `<section class="hero"><small>Welcome back</small><h1>Hi, ${esc(user.name)}</h1></section>`;

  if (!h.completed) {
    return `${hero}
      <div class="card">
        <h2>No interviews yet</h2>
        <p>Upload a resume to get started. Your completed interviews and reports will appear here.</p>
        ${button('Upload resume', { action: 'open-resume', primary: true })}
      </div>
      ${averageNote()}`;
  }

  const rp = data.report;
  return `${hero}
    <div class="tiles">
      <div class="tile"><span>Completed interviews</span><strong>${esc(h.completed)}</strong></div>
      <div class="tile"><span>Most recent score</span><strong>${esc(h.lastScore)} / 100</strong></div>
    </div>
    ${averageNote()}
    <div class="card">
      <h2>Recent interviews</h2>
      ${table(['Role', 'Date', 'Score'], h.recent.map((r) => [esc(r.role), esc(r.date), esc(r.score)]))}
    </div>
    <div class="card">
      <h2>Role-wise performance</h2>
      <p>${h.recent.map((r) => `${esc(r.role)}: ${esc(r.score)}`).join(', ')}</p>
    </div>
    <div class="card">
      <h2>Strengths and weak topics</h2>
      <p><strong>Strengths:</strong> ${esc(rp.strengths.join(', '))}</p>
      <p data-not-defined="What counts as a weak topic, and how the progress trend is calculated, are not defined (REQ-436 open questions)."><strong>Weak topics:</strong> ${esc(rp.improve.join(', '))}</p>
    </div>
    <div class="card">
      <h2>Suggested practice</h2>
      <ul>${rp.suggestions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${button('Start a new interview', { toast: 'Start a new interview would open Job Role Recommendation.' })}
    </div>`;
}
