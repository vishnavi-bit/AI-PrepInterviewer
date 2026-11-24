import { badge, esc, pageHead } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S05', name: 'Resume Upload and Analysis', side: 'main', icon: 'scan', nav: 'Resume', roles: ['candidate'] };

export function render({ data }) {
  const r = data.resume;

  if (r.status === 'none') {
    return `${pageHead('Resume')}
      <p class="note">No resume uploaded yet.</p>
      <div class="card">
        <h2>Upload resume (PDF or DOCX)</h2>
        ${button('Choose file', {
          notDefined: 'The file-size limit is not defined. The spec only says the configured file-size limit (REQ-429 open question). PDF and DOCX are the accepted types.'
        })}
        ${button('Upload', { action: 'upload', primary: true })}
      </div>`;
  }

  if (r.status === 'analysing') {
    return `${pageHead('Resume')}
      <div class="card"><h2>${esc(r.fileName)}</h2><p>Analysing your resume... please wait.</p></div>`;
  }

  return `${pageHead('Resume')}
    <div class="card">
      <h2>${esc(r.fileName)}</h2>
      <p class="note">Extracted information, for you to review</p>
      <div class="kv">
        <div><span>Skills</span><strong>${r.skills.map((s) => badge(s)).join(' ')}</strong></div>
        <div><span>Education</span><strong>${esc(r.education)}</strong></div>
        <div><span>Projects</span><strong>${esc(r.projects)}</strong></div>
        <div><span>Experience</span><strong>${esc(r.experience)}</strong></div>
        <div><span>Certifications</span><strong>${esc(r.certifications)}</strong></div>
      </div>
      ${button('Edit', {
        notDefined: 'Where corrections are stored is not defined: replace the AI output, or keep it next to the candidate version (REQ-430 open question).'
      })}
      ${button('Confirm', { action: 'confirm', primary: true })}
    </div>
    <div class="card">
      ${button('Replace', { toast: 'Replace would let you upload a new resume and swap out the current one.' })}
      ${button('Delete resume', {
        notDefined: 'Deletion follows the retention rules, but the retention period is not defined (REQ-429 and F-010 open questions).'
      })}
    </div>`;
}
