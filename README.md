# RAG Study Assistant

Teachers upload a syllabus PDF; students ask questions and get answers drawn
only from that syllabus, with citations back to the page they came from.

BICTE capstone project, Tribhuvan University. Runs locally.

## Where to start

Read in this order. Each assumes the one before it.

| | | |
|---|---|---|
| 1 | **[NOTE.md](NOTE.md)** | One page: how to run it, the numbers to remember, the three defense answers |
| 2 | This file | Setup, what it does, the API |
| 3 | **[docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md)** | A seven-session plan for learning the code in the order it runs, plus config and troubleshooting |
| 4 | **[docs/CONCEPTS.md](docs/CONCEPTS.md)** | Every concept the project uses, and where each one lives |
| 5 | **[docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md)** | What to build next, ranked by value |
| — | **[docs/superpowers/specs/](docs/superpowers/specs/)** | Why the design is what it is |

If you have never run this before, start with `./start.sh` below, then
Session 1 of the study guide — which is *use the app, read no code*.

## How it works

Two pipelines, plus quiz generation reusing what the first one stored.

**Ingestion** — runs once per upload, in a background thread:

```
PDF → extract text (+ page numbers) → clean → chunk (300 words, 50 overlap)
    → embed each chunk (384 dims) → store chunk + vector in Postgres/pgvector
```

**Query** — runs on every question:

```
question → embed → pgvector cosine search (top 4, within the course)
         → build prompt from retrieved chunks → LLM → answer + citations
```

**Quiz generation** — on demand, also in a background thread:

```
sample passages across the document → prompt the model for questions
    → validate the JSON → store each question against its source passage
```

The assistant is told to answer only from the retrieved excerpts, and to say
so plainly when a topic is not in the syllabus. Quiz questions are written from
those same passages, for the same reason.

## Running it

```bash
./start.sh          # database, backend and frontend, in order
./start.sh stop     # shut it all down
```

Then open <http://localhost:3000>.

The script waits for Postgres to accept queries rather than just opening a
port, installs npm packages on first run, and refuses to start if the backend
port is taken — naming the process that holds it.

The three processes, if you would rather start them by hand:

### 1. Database

```bash
docker run -d --name studyai-pg \
  -e POSTGRES_USER=studyai -e POSTGRES_PASSWORD=studyai -e POSTGRES_DB=studyai_db \
  -p 5433:5432 -v studyai-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

Host port **5433**, not the usual 5432 — another container on this machine
already holds 5432. The `vector` extension is created by the migrations, so
there is no manual `psql` step.

### 2. Backend

```bash
cd backend
cp .env.example .env          # then add your GEMINI_API_KEY
pip install -r requirements.txt
../venv/bin/python manage.py migrate
../venv/bin/python manage.py runserver 8001
```

Port **8001**, not Django's default 8000 — another project on this machine
holds that one.

Get a free Gemini key at <https://aistudio.google.com/apikey>. Everything up to
the answer step — upload, chunking, embedding, retrieval — works without one.

`.env` is gitignored. Never commit it.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Vite proxies `/api` to Django, so the browser sees a single origin and CORS
never comes into it.

## What it does

| Feature | Who |
|---|---|
| Create, edit and delete courses | Teacher |
| Join by code, leave | Student |
| Upload, rename and delete syllabus PDFs | Teacher |
| Read a PDF in the browser | Both |
| Ask questions and get cited answers | Both |
| See the passages an answer was built from, with their distances | Both |
| Generate a quiz from a document | Teacher |
| Take a quiz and have it marked | Student |

Quizzes are written from the document's own passages, and every question stores
the passage it came from — a quiz testing material the syllabus does not cover
would be the same failure as an invented answer. Multiple choice is marked by
comparing against the stored key; the language model is used only for
short-answer questions, where there is no key and a correct idea in different
words must still count.

## Tests

```bash
cd backend
../venv/bin/python manage.py test services.tests
```

57 tests. The suite forces the mock generation provider, so it needs no
network access and costs nothing to run. Embeddings and pgvector search are
real — retrieval quality is what most of these tests exist to check.

```bash
cd frontend && npm run lint     # tsc --noEmit
```

## Layout

```
backend/
  manage.py               puts src/ on sys.path, so plain `python manage.py` works
  src/
    config/               settings, root urls
    apps/users/           custom User with a teacher/student role
    apps/courses/         Course, enrollment, join-by-code, access checks
    apps/documents/       Document, DocumentChunk, upload + status polling
    apps/chat/            ChatSession, Message, the /ask endpoint
    apps/quizzes/         Quiz, Question, attempts and marking
    services/             pure logic — no HTTP, no views
      pdf_processor.py    extract, clean, chunk (no Django imports at all)
      embedder.py         all-MiniLM-L6-v2, loaded once per process
      retriever.py        cosine search + grounded answer
      ingestion.py        the background-thread pipeline
      quiz.py             question generation and marking
      prompts.py          the wording that keeps answers grounded
      generation/         gemini | anthropic | mock, one env var apart
frontend/
  src/services/api.ts     axios client with the 401-refresh interceptor
  src/context/            AuthContext
  src/components/         PageHeader, EmptyState, ErrorBanner, StatusBadge,
                          Citations, ConfirmDialog, DocumentQuizzes
  src/index.css           the seven-class type scale every page uses
  src/pages/              Landing, Login, Register, Dashboard, CourseDetail,
                          Chat, DocumentViewer, Quiz, Settings
docs/superpowers/specs/   design document
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register/` | Create an account |
| POST | `/api/auth/login/` | JWT access + refresh + user |
| POST | `/api/auth/refresh/` | New access token |
| GET | `/api/auth/me/` | Current user |
| GET/POST | `/api/courses/` | List / create |
| POST | `/api/courses/join/` | Enrol using a course code |
| GET/POST | `/api/documents/` | List (`?course_id=`) / upload |
| GET | `/api/documents/{id}/status/` | Ingestion progress |
| GET | `/api/documents/{id}/chunks/` | Stored chunks + embedding previews |
| POST | `/api/documents/{id}/reprocess/` | Re-run a failed ingestion |
| GET | `/api/documents/{id}/file/` | The PDF itself, enrollment checked |
| POST | `/api/chat/ask/` | Ask a question |
| GET | `/api/chat/sessions/` | Chat sessions |
| GET | `/api/chat/sessions/{id}/messages/` | One session's transcript |
| GET/POST | `/api/quizzes/` | List (`?document_id=`) / create (teacher only) |
| GET | `/api/quizzes/{id}/` | Quiz with its questions, answer key withheld |
| GET | `/api/quizzes/{id}/status/` | Generation progress |
| POST | `/api/quizzes/{id}/submit/` | Submit an attempt, get it marked |
| GET | `/api/quizzes/{id}/attempts/` | Your attempts at this quiz |

Interactive documentation is generated from the code itself:

| | |
|---|---|
| **Swagger UI** | <http://localhost:8001/api/docs/> — sends real requests |
| **ReDoc** | <http://localhost:8001/api/redoc/> — read-only |
| **OpenAPI schema** | <http://localhost:8001/api/schema/> |

To try an endpoint in Swagger: call `/api/auth/login/`, copy the `access` value,
press **Authorize**, paste it.

## Known limitations

State these plainly rather than hiding them.

- **Scanned PDFs do not work.** A scan has no text layer, so nothing can be
  extracted. Ingestion detects this and fails the document with a clear
  message instead of storing empty chunks. OCR is out of scope.
- **Ingestion does not survive a restart.** It runs in a background thread, so
  restarting the server mid-upload strands a document in `processing`.
  `python manage.py requeue_stuck_documents` clears those. Celery would fix
  this properly at the cost of running Redis and a worker.
- **Citations are chunk-level, not sentence-level.** A chunk is cited by the
  page most of its text came from. On a short document, where one chunk can
  span several pages, the cited page can be adjacent to the exact sentence.
  This tightens as documents get longer.
- **One server only.** Background-thread ingestion does not scale horizontally.
- **Nepali-language content is weak.** The embedding model is trained mainly on
  English; Nepali passages retrieve less reliably.
- **Quiz questions are not reviewed before students see them.** They are
  grounded in the document and each cites its passage, but nothing checks that
  a question is fair or unambiguous. A teacher can delete and regenerate; a
  review-before-publish step would be the honest fix.
- **Retrieval accuracy is not measured.** The system demonstrably works on the
  examples tried, but no number has been put on it. That is the single most
  valuable thing left to do — see [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md).

## Notes on the design

Four corrections and one addition, documented with reasoning in
`docs/superpowers/specs/`:

- Chunking previously discarded the tail of every document.
- `page_number` could never be populated, because pages were flattened before
  chunking.
- Retrieval trusted a client-supplied `course_id` with no enrollment check.
- Leaving a course was refused as if it were editing one, because every POST to
  a course was treated as an edit.
- Messages now store the passages that were used and how close each match was,
  so retrieval quality can be shown rather than asserted.

The index is **HNSW**, not IVFFlat: IVFFlat trains its clusters on the rows
present when it is built, so creating it in a migration trains it on an empty
table.
