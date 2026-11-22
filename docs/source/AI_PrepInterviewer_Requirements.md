AI PrepInterviewer
Complete KNM Project Setup and Feature Import Prompt
Project name: AI PrepInterviewer
Project type: AI-powered virtual interview and preparation platform
Document purpose: Use this document as the complete project brief
and prompt when setting up the project in KNM with Claude Code.
1. Instructions to Claude Code
I want to create a new project named AI PrepInterviewer using the
documented and supported KNM workflows.

Read this document fully and follow these instructions:
1. First inspect the existing repository/workspace and the installed
   KNM Playbook or documentation.
2. Use only documented and supported KNM workflows. Do not invent
   commands, API routes, or tool capabilities.
3. Use the requirements in this document as the source of truth for the
   initial project setup.
4. Import exactly 10 main features into KNM.
5. Do not import 9, 11, or more than 10 main features.
6. Use the exact 10 feature names and IDs listed in Section 7.
7. Do not split the 10 main features into additional top-level
   features. Detailed requirements and acceptance criteria must remain
   under their corresponding feature, or be represented using the
   supported KNM requirement/work-item structure.
8. Before making changes, explain the supported workflow and identify
   the project/import actions you intend to perform.
9. Ask for my approval before creating the KNM project or importing
   features if the workflow requires a change to project data.
10. Do not write application code, install packages, create
    implementation files, run database migrations, or change the
    existing application during this setup.
11. After import, verify that KNM contains exactly 10 main features,
    with the IDs and names in this document.
12. Report the result clearly, including the 10 feature IDs and names,
    and identify any item that could not be imported.
13. If a required KNM capability is unavailable or unclear, stop and
    explain the limitation. Do not use undocumented workarounds.
The immediate goal is KNM project creation and import of exactly 10
main features only. Do not start implementation until I approve the
next phase.
2. Project Overview
AI PrepInterviewer is an AI-powered virtual interview practice platform.
It helps candidates prepare for job interviews by analysing their
resumes, recommending suitable job roles, conducting interactive mock
interviews with a 2D animated AI interviewer, evaluating their answers,
and tracking their progress over time.

The application should provide a realistic interview-practice experience
while keeping the user in control of their resume, interview choices,
and stored information.
2.1 Main objectives
- Allow candidates to register and securely access their accounts.
- Allow users to upload PDF or DOCX resumes.
- Analyse resume information using Google Gemini.
- Recommend suitable job roles based on resume skills and experience.
- Let users configure and attend mock interviews.
- Provide a 2D animated female interviewer.
- Support spoken questions and voice answers, with text alternatives.
- Evaluate answers and provide useful feedback after the interview.
- Save interview sessions and reports in Turso.
- Let users review their history and monitor improvement.
2.2 Target users
The main user is a candidate or job seeker who wants to practise
interviews for entry-level or other software and technology roles.

Example roles include: - Python Developer - Full Stack Developer -
Frontend Developer - Backend Developer - AI Engineer

These are examples, not a fixed list. Recommendations should depend on
the user's resume.
3. Technology Stack
Use the following intended technology stack. Inspect the existing
repository before assuming any component is already implemented.
  Layer                   Technology              Responsibility
  Frontend                React                   User interface, resume
upload, interview room,
avatar and dashboard

  Backend                 Python + FastAPI        APIs, authentication,
business logic and
service coordination

  AI                      Google Gemini           Resume analysis, role
recommendations,
question generation and
evaluation

  Database                Turso (libSQL)          User records, resume
data, sessions,
answers, reports and
progress

  Speech-to-Text          Browser capability or   Convert candidate
selected STT provider   speech into text

  Text-to-Speech          Browser capability or   Speak interviewer
selected TTS provider   questions and responses

  Avatar                  2D animation assets and Display the virtual
frontend animation      interviewer
Resume file storage     Suitable file storage   Store original PDF/DOCX
or controlled local     files
storage for development
Architecture rule
The React frontend communicates with the FastAPI backend. The FastAPI
backend communicates with Gemini, Turso, speech services, and file
storage as required.

The frontend must not connect directly to Turso or contain private
Gemini or database credentials.
Resume storage rule
Turso stores resume metadata and extracted text. The original PDF/DOCX
file must be stored using an appropriate file-storage solution or a
controlled local location during development. Do not assume Turso is a
general-purpose file-storage service.
4. Complete User Journey
1. The user opens AI PrepInterviewer.
2. The user registers or logs in.
3. The user uploads a PDF or DOCX resume.
4. The backend validates the file and extracts readable text.
5. Gemini analyses the resume and extracts skills, education, projects,
   experience, and technologies.
6. The application displays the extracted information for the user to
   review or correct.
7. Gemini recommends suitable job roles and explains why each role may
   fit.
8. The user selects a job role.
9. The user selects interview type, difficulty, and duration.
10. The backend creates an interview session and prepares relevant
    questions.
11. A 2D animated female interviewer welcomes the user and asks the
    first question.
12. The question is displayed as text and spoken using Text-to-Speech
    when available.
13. The user answers using a microphone. A text-answer option is also
    available.
14. Speech-to-Text converts the spoken answer into a transcript.
15. The user can review or correct the transcript where practical.
16. The backend sends the answer and interview context to Gemini.
17. Gemini decides whether a relevant follow-up question is needed or
    whether the interview should continue.
18. The interview continues until the question plan is completed, the
    time limit is reached, or the user ends it.
19. Gemini evaluates the candidate's answers and creates a final report.
20. The application displays the overall score, category scores,
    strengths, weaknesses, and improvement suggestions.
21. The backend saves the session, questions, answers, and report in
    Turso.
22. When the user returns, the dashboard displays previous interviews
    and progress.
5. Functional Requirements
The requirements below belong under the 10 main features. They are not
additional top-level features.
5.1 Authentication and account requirements
- A new user can register with the required account details.
- A registered user can log in and log out.
- User-specific pages require authentication.
- A user can access only their own resume, interview sessions,
  answers, and reports.
- Passwords must be securely hashed and must never be stored as plain
  text.
5.2 Resume requirements
- A logged-in user can upload a PDF or DOCX resume.
- The application validates file type and configured file-size limits.
- The application displays a useful error if a file is invalid or
  cannot be read.
- The user can view uploaded resume information.
- The user can replace an existing resume.
- The user can request deletion of a resume and its associated
  extracted information, subject to the application's retention rules.
5.3 Resume analysis requirements
Gemini analyses extracted resume text and identifies information when
present: - Skills and technologies. - Education. - Projects and project
descriptions. - Work experience and internships. - Certifications.

The AI must not invent information that is absent from the resume. The
backend must validate the AI response before storing or displaying it.
The user should be able to review extracted information.
5.4 Job-role recommendation requirements
- The system recommends roles based on confirmed resume information.
- Each recommendation includes a role title and a short explanation.
- The user chooses the role for the interview.
- The user is not forced to select the first recommendation.
5.5 Interview configuration requirements
The user can choose: - Interview type: Technical, HR, Behavioral, or
Project-based. - Difficulty: Easy, Medium, or Hard. - Duration: from the
available configured options.

The selected settings must be visible before the interview starts.
5.6 Interview requirements
- Questions are relevant to the selected role, interview type,
  difficulty, and resume.
- The system creates and tracks an interview session.
- The user can submit voice or typed answers.
- The system can ask a limited number of relevant follow-up questions.
- The system can continue to the next question.
- A timer tracks the configured duration.
- The user can end the interview early.
- The system records whether a session is completed, interrupted, or
  ended early.
- Final scores and detailed feedback are not shown during the
  interview.
5.7 Avatar and speech requirements
- The interview screen displays a 2D animated female interviewer.
- The avatar has basic states such as idle, speaking, and listening.
- Questions remain visible as text even when audio is enabled.
- TTS speaks interviewer questions and selected responses.
- The user can replay or mute audio.
- The user can answer through microphone recording.
- STT converts speech into text.
- The application provides a typed-answer fallback.
- Microphone permission errors, empty transcripts, and speech-service
  failures are handled with clear messages.
The avatar is a visual representation of the AI interviewer, not a real
human interviewer.
5.8 Evaluation requirements
At the end of the interview, the system creates a structured report that
may include: - Overall score out of 100. - Technical knowledge. -
Communication. - Answer clarity and relevance. - Problem-solving. -
Strengths. - Areas for improvement. - Suggestions for future practice. -
Question-wise or topic-wise feedback when enough data is available.

Evaluation criteria should match the interview type. The application
must explain that AI scores are practice estimates and do not guarantee
real hiring outcomes.
5.9 Dashboard and history requirements
The dashboard should display: - Total completed interviews. - Most
recent score. - Average score when enough completed sessions exist. -
Recent interview history. - Role-wise performance. - Strengths and weak
topics. - Suggestions for future practice.

The user can open previous interview reports and compare performance
over time.
5.10 Security and data management requirements
- Keep API keys and database credentials on the backend.
- Use secure authentication and authorization.
- Verify user ownership before returning personal records.
- Validate uploaded files and AI-generated data.
- Treat resume text and candidate answers as untrusted content.
- Do not allow instructions embedded in a resume to override
  application instructions.
- Define retention and deletion rules for resumes, transcripts, and
  reports.
- Do not expose one user's information to another user.
6. Non-Functional Requirements
Security and privacy
- Use HTTPS in deployment.
- Store secrets in environment variables or a secure secrets manager.
- Never expose private credentials in frontend code.
- Hash passwords securely.
- Restrict access to personal data by authenticated user.
- Explain how user data is stored and used.
Performance
- Display loading indicators while resume analysis and AI requests are
  processing.
- Avoid unnecessary repeated AI requests.
- Handle large resumes and transcripts safely.
- Keep the interview interface responsive.
Reliability
- Show understandable errors if Gemini, Turso, STT, TTS, or file
  storage is unavailable.
- Do not silently lose a submitted answer when a temporary request
  fails.
- Save session progress at appropriate points.
Usability and accessibility
- Support desktop and mobile screen sizes.
- Use clear labels and error messages.
- Keep interview questions visible as text.
- Provide a text-answer alternative to microphone input.
- Provide audio replay and mute controls.
Maintainability
- Separate frontend, backend, AI integration, speech services, and
  database access into understandable modules.
- Document API request and response formats.
- Provide an environment-variable example without real secrets.
- Keep implementation aligned with approved requirements and
  decisions.
7. Exactly 10 Main KNM Features
IMPORTANT: Import exactly these 10 main features. Do not create
additional top-level features.
F-001: User Authentication & Profile
Description:
Allow candidates to create an account, log in securely, log out, and
manage basic profile information. Protect user-specific application
pages and data.

Requirements: - User registration. - User login and logout. - Secure
password hashing. - Authentication-protected pages. - Basic profile
viewing and updating. - User-specific access control.

Acceptance criteria: 1. A new user can register successfully with
valid details. 2. A registered user can log in and log out. 3. Invalid
login details produce a safe, understandable error. 4. Passwords are not
stored as plain text. 5. A user cannot access another user's private
data.
F-002: Resume Upload & Management
Description:
Allow an authenticated candidate to upload and manage a resume in PDF or
DOCX format.

Requirements: - PDF and DOCX upload. - File type and size
validation. - Resume text extraction. - Resume viewing and
replacement. - Resume deletion and associated data handling. - Resume
ownership linked to the logged-in user.

Acceptance criteria: 1. An authenticated user can upload a valid PDF
or DOCX file. 2. Unsupported or invalid files are rejected with a useful
message. 3. The backend can extract readable text from a supported
resume. 4. A user can replace an existing resume. 5. A user cannot view
or replace another user's resume.
F-003: AI Resume Analysis
Description:
Use Gemini to analyse extracted resume text and identify the candidate's
skills, education, projects, experience, internships, certifications,
and technologies.

Requirements: - Gemini integration through the backend. - Structured
resume analysis response. - Skills and technology extraction. -
Education and certification extraction. - Project and experience
extraction. - User review and correction of extracted information. -
Validation of AI-generated output.

Acceptance criteria: 1. The system sends extracted resume text to
Gemini through the backend. 2. The analysis identifies relevant
information present in the resume. 3. The system does not invent missing
qualifications or experience. 4. The analysis is displayed in a readable
format. 5. Invalid or incomplete AI responses are handled safely.
F-004: Job Role Recommendation
Description:
Recommend suitable job roles based on the candidate's analysed resume
and allow the candidate to choose a role for interview practice.

Requirements: - Generate suitable job-role recommendations. -
Explain why each role is recommended. - Use confirmed resume
information. - Allow the candidate to select a role. - Support multiple
technology-related roles.

Acceptance criteria: 1. The system provides role recommendations
after resume analysis. 2. Each recommendation includes a role name and
explanation. 3. Recommendations are based on the candidate's skills and
experience. 4. The candidate can select one role. 5. The selected role
is saved with the interview configuration.
F-005: Interview Configuration
Description:
Allow the candidate to configure a mock interview before starting it.

Requirements: - Select job role. - Select interview type: Technical,
HR, Behavioral, or Project-based. - Select difficulty: Easy, Medium, or
Hard. - Select interview duration from configured options. - Review
configuration before starting.

Acceptance criteria: 1. The user can select an interview type. 2.
The user can select a difficulty level. 3. The user can select an
available duration. 4. The application displays the selected
configuration. 5. The selected settings are passed to the interview
session.
F-006: AI Interview Management
Description:
Conduct an interactive mock interview using Gemini-generated questions
and candidate answers. Manage question order, follow-ups, session
progress, and interview completion.

Requirements: - Create an interview session. - Generate role- and
resume-relevant questions. - Display questions as text. - Accept
candidate answers. - Generate relevant follow-up questions. - Limit
follow-ups and manage interview duration. - Track session status and
completion. - Save questions and answers.

Acceptance criteria: 1. The system creates an interview session
using the selected configuration. 2. Questions are relevant to the
selected role and interview type. 3. The user can submit an answer for
each question. 4. Gemini can generate a relevant follow-up when
appropriate. 5. The interview can proceed to the next question. 6. The
interview ends when the question plan is completed, the duration
expires, or the user ends it. 7. The session status and submitted
answers are saved.
F-007: Virtual Avatar & Voice Interaction
Description:
Provide an interactive 2D animated female interviewer with spoken
questions and voice-based candidate answers. Include text alternatives
for accessibility and reliability.

Requirements: - 2D animated interviewer avatar. - Idle, speaking,
and listening states. - Text-to-Speech for interviewer questions and
selected responses. - Microphone recording for candidate answers. -
Speech-to-Text transcription. - Transcript display and correction where
practical. - Replay and mute controls. - Typed-answer fallback. -
Microphone and speech-service error handling.

Acceptance criteria: 1. The interview screen displays the 2D avatar.
2. The avatar displays appropriate basic animation states. 3. Interview
questions remain visible as text. 4. The user can hear questions when
TTS is available. 5. The user can submit a voice answer when microphone
permission is granted. 6. The application converts recorded speech into
a transcript when STT is available. 7. The user can submit a typed
answer if voice input is unavailable. 8. Audio and microphone failures
show understandable messages.
F-008: AI Performance Evaluation
Description:
Evaluate candidate answers after the interview and generate a structured
report with scores, strengths, weaknesses, and improvement suggestions.

Requirements: - Evaluate submitted answers using Gemini. - Calculate
or generate an overall score out of 100. - Provide relevant category
scores. - Identify strengths and areas for improvement. - Provide
actionable practice suggestions. - Generate question-wise or topic-wise
feedback where supported. - Validate and save the final report. -
Explain that scores are AI-generated practice estimates.

Acceptance criteria: 1. A completed interview can be evaluated. 2.
The system generates a structured report. 3. The report includes an
overall score and useful feedback. 4. Evaluation criteria match the
selected interview type. 5. Invalid AI output is not saved as a valid
report. 6. The report is associated with the correct user and interview
session.
F-009: Dashboard & Interview History
Description:
Provide a dashboard where candidates can review interview results,
access previous reports, and track performance over time.

Requirements: - Display total completed interviews. - Display recent
and average scores where applicable. - List previous interview
sessions. - Open saved interview reports. - Display role-wise or
topic-wise performance where data is available. - Show progress
trends. - Recommend areas for further practice based on previous
results.

Acceptance criteria: 1. The dashboard displays data belonging to the
logged-in user. 2. The user can see previous completed interviews. 3.
The user can open a previous report. 4. Score comparisons use saved
interview results. 5. The dashboard handles users with no interview
history. 6. One user cannot view another user's dashboard data.
F-010: Security & Data Management
Description:
Protect personal information and manage application data securely across
the frontend, backend, Gemini integration, file storage, and Turso
database.

Requirements: - Backend-only access to private Gemini and Turso
credentials. - Secure database connection. - Authentication and
authorization checks. - User data isolation. - Uploaded file
validation. - Safe handling of resume text and AI responses. - Data
retention and deletion rules. - Safe error handling and logging without
exposing secrets.

Acceptance criteria: 1. No private Gemini or Turso credentials are
exposed in frontend code. 2. Backend endpoints verify user
authentication where required. 3. Database queries enforce user
ownership for private records. 4. Invalid files and unsafe inputs are
handled safely. 5. Logs and error messages do not reveal passwords,
tokens, or secrets. 6. The application has documented rules for storing
and deleting personal data.
8. Initial Logical Database Design
The following are proposed logical tables. Final columns, keys,
relationships, indexes, and normalization must be reviewed before
implementation.

  Table                 Purpose
  users                 User account details
resumes               Resume metadata, file location, and extracted text
user_skills           Skills extracted from or confirmed by the user
interview_sessions    Interview configuration, status, and timestamps
interview_questions   Questions asked during an interview
interview_answers     Candidate answers and transcripts
answer_evaluations    Question-level evaluation results
interview_reports     Final interview evaluation
skill_history         Progress across completed interviews
Database design rules
- Use a stable primary key for every table.
- Define foreign keys or equivalent relationships.
- Associate private records with the correct user.
- Avoid duplicating user or resume information unnecessarily.
- Store timestamps for important events.
- Define deletion behavior for related records.
- Review the schema for normalization before implementation.
- Store original resume files outside Turso; keep file metadata and
  extracted text in the database.
9. Main Application Pages
These are proposed frontend pages, not additional KNM main features.
1. Landing Page.
2. Registration Page.
3. Login Page.
4. Dashboard.
5. Resume Upload and Analysis Page.
6. Job Role Recommendation Page.
7. Interview Configuration Page.
8. Interview Room.
9. Interview Result Page.
10. Interview History Page.
11. Profile and Settings Page.
Pages may be combined where that creates a simpler user experience.
10. MVP Scope and Later Enhancements
MVP -- First working release
The first release should deliver one complete end-to-end interview
journey:
- User registration and login.
- Resume upload and text extraction.
- Gemini resume analysis.
- Job-role recommendations and selection.
- Interview type, difficulty, and duration selection.
- Gemini-generated interview questions.
- Basic interview session management.
- Basic 2D animated avatar.
- Voice input with text fallback.
- TTS for interviewer questions when supported.
- Basic follow-up questions.
- Final AI evaluation report.
- Turso persistence.
- Interview history.
Later enhancements
- More expressive avatar animations and lip-sync.
- Advanced adaptive question planning based on past performance.
- Detailed skill-wise analytics.
- Personalized practice plans.
- Multiple language support.
- Downloadable interview reports.
- Optional administrator dashboard.
Do not add these later enhancements as extra top-level features during
the initial import. They should be tracked under the relevant one of the
10 features or deferred until a later approved scope update.
11. Acceptance Criteria for the Complete MVP
The MVP is ready for demonstration when:
1. A candidate can register, log in, and log out.
2. A candidate can upload a valid PDF or DOCX resume.
3. The application extracts and displays resume information.
4. Gemini analyses the resume without inventing missing details.
5. The application recommends suitable job roles.
6. The candidate can select a role and configure an interview.
7. The system starts an interview and displays relevant questions.
8. The candidate can answer using voice or text.
9. The system can ask a relevant follow-up or move to the next
   question.
10. The interview can be completed or ended safely.
11. The system generates a structured evaluation report.
12. The session and report are saved in Turso.
13. The candidate can return later and view previous reports.
14. One candidate cannot access another candidate's private information.
15. The application handles AI, database, file, and speech-service
    errors clearly.
12. Development Phases After KNM Import
Do not begin these phases as part of the initial feature import. They
are the proposed implementation order after requirements and design have
been reviewed and approved.
Phase 1: Project foundation
- Inspect the existing repository.
- Confirm frontend, backend, Gemini integration, and installed
  dependencies.
- Review environment configuration.
- Confirm the supported KNM-to-Git workflow.
Phase 2: Requirements and design
- Review all 10 imported features.
- Finalize detailed requirements.
- Create and review the user walkthrough.
- Finalize architecture decisions.
- Review database design and relationships.
Phase 3: Authentication and database
- Connect FastAPI to Turso.
- Implement registration and login.
- Implement authorization and user data isolation.
Phase 4: Resume and role recommendation
- Implement resume upload and validation.
- Extract resume text.
- Integrate Gemini analysis.
- Display extracted skills and recommend job roles.
Phase 5: Interview setup and interview engine
- Implement interview configuration.
- Generate questions.
- Manage interview sessions and answers.
- Add follow-up question logic.
Phase 6: Avatar and speech
- Add the 2D avatar.
- Integrate TTS and STT.
- Add microphone permissions, audio controls, and typed-answer
  fallback.
Phase 7: Evaluation and dashboard
- Generate final evaluation reports.
- Save reports in Turso.
- Implement interview history and progress views.
Phase 8: Testing and release
- Test the complete user journey.
- Test authorization and data isolation.
- Test invalid files and unavailable services.
- Fix defects and verify acceptance criteria.
- Prepare deployment configuration and documentation.
13. Required KNM Import Verification
After the import, verify the following:
- [ ] The KNM project is named AI PrepInterviewer.
- [ ] The project description matches this document.
- [ ] Exactly 10 main features were imported.
- [ ] The feature IDs are F-001 through F-010.
- [ ] Each feature name matches Section 7 exactly.
- [ ] Each feature has its description.
- [ ] Requirements and acceptance criteria are attached to the correct
  feature using supported KNM structures.
- [ ] No extra top-level features were created.
- [ ] No application code was changed.
- [ ] No packages were installed.
- [ ] No database migrations were run.
- [ ] The import result was reviewed and reported.
Expected feature list
  ID      Main feature
  F-001   User Authentication & Profile
F-002   Resume Upload & Management
F-003   AI Resume Analysis
F-004   Job Role Recommendation
F-005   Interview Configuration
F-006   AI Interview Management
F-007   Virtual Avatar & Voice Interaction
F-008   AI Performance Evaluation
F-009   Dashboard & Interview History
F-010   Security & Data Management

Expected total: EXACTLY 10 main features.
14. Final Instruction
Start by inspecting the existing workspace and the documented KNM
Playbook. Explain how the supported KNM project creation and
feature-import workflow works.

Then prepare to create the AI PrepInterviewer KNM project and import
the 10 main features listed in Section 7.

Do not start coding. Do not create additional top-level features. Do
not import more or fewer than 10 main features. Ask for my approval
before making project changes. After import, verify and report that
exactly 10 main features exist.
End of AI PrepInterviewer project brief and KNM import prompt.