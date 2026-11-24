# DB design
Target DB: Turso (libSQL), SQLite dialect; client @libsql/client 0.17 (server version not stated)
Constraints:
- Naming: snake_case plural table names; foreign key columns are <singular>_id.
- Ids: TEXT UUID primary key on every table.
- Timestamps: created_at and updated_at on every table, TEXT ISO-8601 UTC.
- Enums: TEXT codes with CHECK (snake_case). Flags: INTEGER 0/1 with CHECK.
- Foreign keys enforced (PRAGMA foreign_keys = ON on every connection).
- Deletion: hard delete. Deleting a user cascades to all private rows; deleting a resume cascades to its entries, skills and recommendations; a session keeps its report and history when its resume is deleted (resume_id set null).
- Tenancy: user_id on every private table. Child rows use a composite FK (parent_id, user_id) -> parent(id, user_id), so ownership cannot drift. Parents carry UQ(id, user_id).
- Audit: timestamps only; no audit table.
- 3NF: kept, except JSON text lists in interview_reports and user_id on child tables (ownership); both noted in their rows.
- Files: original PDF/DOCX stored outside Turso; resumes.storage_key holds only its location.
Sources: docs/source/AI_PrepInterviewer_Requirements.md (sections 5, 7, 8); docs/requirements/REQ-428 to REQ-437 (req.md, mock.md); docs/project/intent.md.
Tables: db_design_tables.csv (Status: New = proposed by Claude · Feedback = open feedback to apply or answer · Final = accepted)

## Columns
### users
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | - | Account id |
| email | TEXT | no | - | UQ | UQ | unique on lower(email) | Login identifier (open: email or username) |
| password_hash | TEXT | no | - | - | - | never plain text | Hashed password (algorithm open) |
| created_at | TEXT | no | now (UTC) | - | - | - | Account created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Last change |

### resumes
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | - | Resume id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE; UQ(id, user_id) | Owner |
| original_filename | TEXT | no | - | - | - | - | Name as uploaded |
| file_type | TEXT | no | - | - | - | CHECK in ('pdf', 'docx') | Supported format |
| file_size_bytes | INTEGER | no | - | - | - | CHECK >= 0 | Size of original file (limit open) |
| storage_key | TEXT | no | - | UQ | UQ | - | Location of original file outside Turso |
| extracted_text | TEXT | no | - | - | - | written after extraction succeeds | Readable text from the file |
| created_at | TEXT | no | now (UTC) | - | - | - | Uploaded |
| updated_at | TEXT | no | now (UTC) | - | - | - | Replaced or changed |

### resume_entries
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Entry id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| resume_id | TEXT | no | - | FK -> resumes.(id, user_id) | yes | composite FK; ON DELETE CASCADE | Resume the entry comes from |
| category | TEXT | no | - | - | - | CHECK in ('education', 'project', 'experience', 'internship', 'certification') | Kind of item |
| title | TEXT | no | - | - | - | - | Degree, project, role or certificate name |
| details | TEXT | yes | - | - | - | - | Text as found in the resume |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Corrected by candidate |

### user_skills
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Skill id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| resume_id | TEXT | no | - | FK -> resumes.(id, user_id) | yes | composite FK; ON DELETE CASCADE; UQ(resume_id, skill_name) | Resume the skill comes from |
| skill_name | TEXT | no | - | - | - | - | Skill or technology name |
| confirmed_by_user | INTEGER | no | 0 | - | - | CHECK in (0, 1) | 1 when the candidate confirmed it |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

### role_recommendations
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Recommendation id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| resume_id | TEXT | no | - | FK -> resumes.(id, user_id) | yes | composite FK; ON DELETE CASCADE; UQ(resume_id, role_title) | Resume the role was recommended for |
| role_title | TEXT | no | - | - | - | - | Role name (list not fixed) |
| explanation | TEXT | no | - | - | - | - | Why the role may fit (F-004 Why) |
| position | INTEGER | no | - | - | - | CHECK >= 1 | Display order |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

### interview_sessions
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Session id |
| user_id | TEXT | no | - | FK -> users.id | yes (user_id, created_at) | ON DELETE CASCADE | Owner |
| resume_id | TEXT | yes | - | FK -> resumes.id | - | ON DELETE SET NULL; ownership checked in app | Resume used for questions |
| role_title | TEXT | no | - | - | - | - | Role selected in F-004 |
| interview_type | TEXT | no | - | - | - | CHECK in ('technical', 'hr', 'behavioral', 'project_based') | Interview type |
| difficulty | TEXT | no | - | - | - | CHECK in ('easy', 'medium', 'hard') | Difficulty |
| duration_minutes | INTEGER | no | - | - | - | CHECK > 0 | Configured duration (options open) |
| planned_question_count | INTEGER | yes | - | - | - | CHECK > 0 | Size of question plan (open) |
| status | TEXT | no | 'in_progress' | - | - | CHECK in ('in_progress', 'completed', 'interrupted', 'ended_early') | Session status |
| started_at | TEXT | yes | - | - | - | set when session starts | Start, for the timer |
| ended_at | TEXT | yes | - | - | - | set when session ends | End time |
| created_at | TEXT | no | now (UTC) | - | - | - | Configured |
| updated_at | TEXT | no | now (UTC) | - | - | - | Progress saved |

### interview_questions
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Question id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| session_id | TEXT | no | - | FK -> interview_sessions.(id, user_id) | yes | composite FK; ON DELETE CASCADE; UQ(session_id, position) | Session the question belongs to |
| parent_question_id | TEXT | yes | - | FK -> interview_questions.id | - | ON DELETE CASCADE | Question this follow-up belongs to |
| position | INTEGER | no | - | - | - | CHECK >= 1 | Order in session (F-006 Question n of plan) |
| question_text | TEXT | no | - | - | - | - | Question shown as text |
| is_follow_up | INTEGER | no | 0 | - | - | CHECK in (0, 1) | 1 for a follow-up question |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

### interview_answers
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Answer id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| question_id | TEXT | no | - | FK -> interview_questions.(id, user_id) | - | composite FK; ON DELETE CASCADE; UQ(question_id) | Question answered |
| answer_text | TEXT | no | - | - | - | - | Typed answer, or transcript as reviewed |
| transcript_text | TEXT | yes | - | - | - | NULL when typed | Raw speech-to-text output |
| input_mode | TEXT | no | - | - | - | CHECK in ('voice', 'typed') | How the answer was given |
| submitted_at | TEXT | no | - | - | - | - | Time of submit (not lost on retry) |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

### answer_evaluations
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Evaluation id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| answer_id | TEXT | no | - | FK -> interview_answers.(id, user_id) | - | composite FK; ON DELETE CASCADE; UQ(answer_id) | Answer evaluated |
| score | INTEGER | yes | - | - | - | CHECK 0 to 100 | Question-level score (rubric open) |
| feedback_text | TEXT | yes | - | - | - | - | Question-wise feedback |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

### interview_reports
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Report id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| session_id | TEXT | no | - | FK -> interview_sessions.(id, user_id) | - | composite FK; ON DELETE CASCADE; UQ(session_id) | Session the report is for |
| overall_score | INTEGER | no | - | - | - | CHECK 0 to 100 | Overall score out of 100 |
| strengths_json | TEXT | no | - | - | - | JSON array of text (3NF deviation) | Strengths list |
| improvement_areas_json | TEXT | no | - | - | - | JSON array of text (3NF deviation) | Areas to improve |
| suggestions_json | TEXT | no | - | - | - | JSON array of text (3NF deviation) | Practice suggestions |
| created_at | TEXT | no | now (UTC) | - | - | only validated AI output is saved | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

The practice-estimate disclaimer is fixed UI text, not stored.

### interview_report_scores
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | Score id |
| user_id | TEXT | no | - | FK -> users.id | yes | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| report_id | TEXT | no | - | FK -> interview_reports.(id, user_id) | - | composite FK; ON DELETE CASCADE; UQ(report_id, category) | Report the score belongs to |
| category | TEXT | no | - | - | - | - | Category name (list open) |
| score | INTEGER | no | - | - | - | CHECK 0 to 100 | Category score |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |

### skill_history
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | no | - | PK | - | UQ(id, user_id) | History id |
| user_id | TEXT | no | - | FK -> users.id | yes (user_id, topic) | ON DELETE CASCADE | Owner (3NF deviation: ownership) |
| session_id | TEXT | no | - | FK -> interview_sessions.(id, user_id) | - | composite FK; ON DELETE CASCADE; UQ(session_id, topic) | Completed session |
| topic | TEXT | no | - | - | - | - | Skill or topic scored |
| score | INTEGER | no | - | - | - | CHECK 0 to 100 | Topic score in that session |
| recorded_at | TEXT | no | - | - | - | - | When the result was recorded |
| created_at | TEXT | no | now (UTC) | - | - | - | Created |
| updated_at | TEXT | no | now (UTC) | - | - | - | Changed |
