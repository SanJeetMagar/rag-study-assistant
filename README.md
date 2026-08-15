# RAG Study Assistant

Teachers upload a syllabus PDF; students ask questions and get answers drawn
only from that syllabus, with citations back to the page they came from.

BICTE capstone project, Tribhuvan University. Runs locally.

## How it works

Two independent pipelines.

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

The assistant is told to answer only from the retrieved excerpts, and to say
so plainly when a topic is not in the syllabus.

## Running it

Three processes. Start them in this order.

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
../venv/bin/python manage.py migrate
../venv/bin/python manage.py runserver
```

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

## Tests

```bash
cd backend
../venv/bin/python manage.py test services.tests
```

31 tests. The suite forces the mock generation provider, so it needs no
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
    services/             pure logic — no HTTP, no views
      pdf_processor.py    extract, clean, chunk (no Django imports at all)
      embedder.py         all-MiniLM-L6-v2, loaded once per process
      retriever.py        cosine search + grounded answer
      ingestion.py        the background-thread pipeline
      generation/         gemini | anthropic | mock, one env var apart
frontend/
  src/services/api.ts     axios client with the 401-refresh interceptor
  src/context/            AuthContext
  src/pages/              Landing, Login, Register, Dashboard, CourseDetail, Chat, Settings
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
| POST | `/api/chat/ask/` | Ask a question |
| GET | `/api/chat/sessions/` | Chat sessions |
| GET | `/api/chat/sessions/{id}/messages/` | One session's transcript |

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

## Notes on the design

Three corrections to the original plan, and one addition, are documented with
reasoning in `docs/superpowers/specs/`:

- Chunking previously discarded the tail of every document.
- `page_number` could never be populated, because pages were flattened before
  chunking.
- Retrieval trusted a client-supplied `course_id` with no enrollment check.
- Messages now store which chunks were used and how close each match was, so
  retrieval quality can be shown rather than asserted.

The index is **HNSW**, not IVFFlat: IVFFlat trains its clusters on the rows
present when it is built, so creating it in a migration trains it on an empty
table.
