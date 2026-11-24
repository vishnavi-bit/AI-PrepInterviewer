import { esc, pageHead } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S09', name: 'Interview Result', side: 'main', roles: ['candidate'] };

const list = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

export function render({ data }) {
  const r = data.report;
  return `${pageHead('Interview result')}
    <section class="hero"><small>Overall score</small><h1>${esc(r.overall)} / 100</h1></section>
    <div class="card">
      <h2 data-not-defined="Which category scores apply to each interview type is not defined (REQ-435 open question). The categories shown are the examples from the spec. The scoring rubric behind the overall score is also not defined.">Category scores</h2>
      <div class="kv">
        <div><span>Technical knowledge</span><strong>${esc(r.technical)}</strong></div>
        <div><span>Communication</span><strong>${esc(r.communication)}</strong></div>
        <div><span>Answer clarity and relevance</span><strong>${esc(r.clarity)}</strong></div>
        <div><span>Problem-solving</span><strong>${esc(r.problemSolving)}</strong></div>
      </div>
    </div>
    <div class="card">
      <h2>Strengths</h2>${list(r.strengths)}
      <h2>Areas to improve</h2>${list(r.improve)}
      <h2>Suggestions for future practice</h2>${list(r.suggestions)}
    </div>
    <p class="note" data-not-defined="Whether the report is generated automatically or only when the candidate asks is not defined (REQ-435 open question). This mock shows it straight after the interview.">Report timing: see the note on this page.</p>
    <p class="note">Scores are AI-generated practice estimates. They do not guarantee real hiring outcomes.</p>
    ${button('Back', { action: 'back', primary: true })}`;
}
