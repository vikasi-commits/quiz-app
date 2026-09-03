CREATE TABLE mcq_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  question_text TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mcq_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  sort_order INTEGER NOT NULL
);

CREATE TABLE mcq_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  selected_choice_id TEXT NOT NULL REFERENCES mcq_choices(id),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcq_choices_question_id ON mcq_choices(question_id);
CREATE INDEX idx_mcq_attempts_question_id ON mcq_attempts(question_id);
