import { esc } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S08', name: 'Interview Room', side: 'main', bare: true, roles: ['candidate'] };

export function render({ data }) {
  const i = data.interview;

  if (i.status === 'completed') {
    return `
      <div class="page-head">
        <span data-not-defined="How the timer is shown, and what happens when time runs out mid-answer, is not defined (REQ-433 open questions).">Time left: <strong>${esc(i.timeLeft)}</strong></span>
      </div>
      <div class="card" data-not-defined="Which 2D animation assets are used is not defined (REQ-434 open question). The avatar here is a placeholder, not the final artwork.">
        <strong>2D interviewer (placeholder)</strong> <span class="badge">State: ${esc(i.avatar)}</span>
      </div>
      <div class="card">
        <h2>Interview complete</h2>
        <p>Your answers are saved. View the report when you are ready.</p>
        ${button('View report', { action: 'view-report', primary: true })}
      </div>`;
  }

  return `
    <div class="page-head">
      <span data-not-defined="How many questions the plan has is not defined (REQ-433 open question). The count shown is a sample.">Question ${esc(i.questionNo)} of ${esc(i.questionTotal)}</span>
      <span data-not-defined="How the timer is shown, and what happens when time runs out mid-answer, is not defined (REQ-433 open questions).">Time left: <strong>${esc(i.timeLeft)}</strong></span>
    </div>
    <div class="card" data-not-defined="Which 2D animation assets are used is not defined (REQ-434 open question). The avatar here is a placeholder, not the final artwork.">
      <strong>2D interviewer (placeholder)</strong> <span class="badge">State: ${esc(i.avatar)}</span>
    </div>
    <div class="card">
      ${i.isFollowUp
        ? `<span class="badge" data-not-defined="How many follow-up questions are allowed is not defined (REQ-433 open question).">Follow-up question</span>`
        : ''}
      <p class="question">${esc(i.question)}</p>
      <div class="row">
        ${button('Replay', {
          notDefined: 'What the candidate sees when text-to-speech is unavailable is not defined (REQ-434). The question text always stays visible.'
        })}
        ${button('Mute', { toast: 'Mute would stop the interviewer voice for this interview.' })}
        ${button('Record answer', {
          notDefined: 'Which speech-to-text service is used (a browser capability or a selected provider) is not defined (REQ-434 open question).'
        })}
      </div>
      <textarea rows="4" aria-label="Your answer" placeholder="Type your answer" data-toast="Your typed answer would be saved when you submit."></textarea>
      ${button('Submit answer', { action: 'submit-answer', primary: true })}
      ${button('End interview', {
        notDefined: 'Whether an early end still produces a scored report is not defined (REQ-433 and REQ-435 open questions).'
      })}
    </div>`;
}
