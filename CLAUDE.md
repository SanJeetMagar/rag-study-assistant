# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A RAG study assistant: teachers upload syllabus PDFs, students ask questions, answers come only from the uploaded material with citations. BICTE capstone, runs locally — no deployment target.

See [NOTE.md](NOTE.md) for a one-page summary, [README.md](README.md) for setup, [docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md) for the study plan and config reference, [docs/CONCEPTS.md](docs/CONCEPTS.md) for every concept used, and [docs/superpowers/specs/](docs/superpowers/specs/) for the design rationale.

## Commands

Postgres must be running first — the app is useless without it:

```bash
docker start studyai-pg     # or the full docker run in README.md
```

### Backend

`manage.py` inserts `src/` into `sys.path`, so no `PYTHONPATH` prefix is needed despite the package root being `backend/src/`:

```bash
cd backend
../venv/bin/python manage.py runserver
../venv/bin/python manage.py test services.tests                          # all 31
../venv/bin/python manage.py test services.tests.test_pdf_processor       # pure functions, ~0.002s
../venv/bin/python manage.py test services.tests.test_api.ChatTests       # one class
../venv/bin/python manage.py test services.tests.test_api.ChatTests.test_ask_retrieves_the_topically_matching_chunk
../venv/bin/python manage.py requeue_stuck_documents                      # clear stranded ingestions
```

The venv is at the repo root (`./venv`), not inside `backend/`. There is still no `requirements.txt` — add one if you add dependencies.

### Frontend

```bash
cd frontend
npm run dev       # :3000, proxies /api to :8001
npm run lint      # tsc --noEmit — the only check; there is no ESLint, no test runner
npm run build
```

## Architecture

### The two pipelines

Everything is one of these. Keep them separate when debugging — a retrieval bug and an ingestion bug look nothing alike.

**Ingestion** (once per upload, background thread): PDF → extract with page numbers → clean → chunk (300 words, 50 overlap) → embed → store in pgvector.

**Query** (every question): question → embed → cosine search top-4 within the course → build prompt → LLM → answer + citations.

### `services/` is not a Django app

It is a plain package holding pure logic, deliberately kept out of `INSTALLED_APPS`. Django apps own HTTP and the ORM; `services/` owns the pipeline.

- [pdf_processor.py](backend/src/services/pdf_processor.py) imports nothing from Django — chunking and cleaning are testable with no database.
- [embedder.py](backend/src/services/embedder.py) loads `all-MiniLM-L6-v2` **once at module level**, thread-safely. Loading it per call is the single biggest performance trap here: the model takes seconds to load and a 130-chunk document would pay that 130 times.
- [retriever.py](backend/src/services/retriever.py) is the only module in `services/` that touches the ORM.
- [generation/](backend/src/services/generation/) — `gemini` (default, free tier), `anthropic`, `mock`. Selected by `LLM_PROVIDER`. Tests force `mock`, so the suite needs no network and costs nothing.

### Corrections to the original spec

The project brief this was built from had three defects. They are fixed, and the fixes have tests — don't reintroduce them:

1. **Chunking dropped every document's tail.** The original ended the loop with `if len(chunk_words) < 50: break`, silently discarding the final short chunk of every file.
2. **`page_number` was unpopulatable.** Pages were flattened into one string before chunking, destroying the information. Page provenance is now carried through, and a chunk is attributed to the page contributing *most* of its words — not the page it started on, which sends readers to the wrong page when a chunk straddles a break.
3. **Retrieval trusted a client-supplied `course_id`.** Any student could read any course. Every course-scoped endpoint now goes through `get_accessible_course()` in [apps/courses/permissions.py](backend/src/apps/courses/permissions.py).

Added beyond the spec: `Message.citations` stores the retrieved chunk IDs and their cosine distances, so retrieval quality can be demonstrated rather than described.

### Index: HNSW, not IVFFlat

The spec called for IVFFlat. IVFFlat clusters the rows present at build time, so creating it in a migration trains it on an empty table and recall stays poor. HNSW needs no training data and handles incremental inserts.

### Ingestion is a background thread

Upload returns immediately; a thread advances `Document.status` (`pending` → `processing` → `ready`/`error`) and the frontend polls `/status/`. Chosen over Celery because that means running Redis and a worker for a single-machine project.

The cost: a server restart mid-ingestion strands a document in `processing`. `requeue_stuck_documents` clears those. Don't "fix" this by making upload synchronous — a 20-second hanging request is worse.

## Conventions worth knowing

- **Port 5433, not 5432.** Another project's `techbee_db` container holds 5432 on this machine. Don't stop it.
- **Custom user model** (`users.User`, email as `USERNAME_FIELD`). It was introduced before the first migration, which is the only cheap moment. Changing it now means rebuilding the database.
- **`backend/.env` is gitignored** and holds `GEMINI_API_KEY`. `.env.example` is committed. Never commit the real one.
- **Frontend server state is TanStack Query**; auth is `AuthContext`. There is no global store — the previous `LMSContext` (all state in one context, mirrored to `localStorage`) is gone, along with the fake auth and canned chatbot replies.
- **Gemini models get retired.** `gemini-2.0-flash` and `gemini-2.5-flash` are already gone (404, or "no longer available to new users"). Current default is `gemini-3.7-flash`, set in `.env`. List what a key can actually use with `client.models.list()` — don't guess a name.
- **Free-tier Gemini rate-limits per minute.** Several questions in quick succession trips it; the provider retries twice with backoff then reports it plainly.
- **Claude model IDs**: `claude-opus-5`. Current Claude models reject `temperature`/`top_p`, and a refusal returns HTTP 200 with `stop_reason: "refusal"` — check it before reading `content`.

## Git

`backend` and `frontend` were previously recorded as **gitlinks** (mode 160000) with no `.gitmodules`, so `git status` showed clean regardless of changes, `git add` inside them silently did nothing, and no source was in history. Fixed with `git rm --cached backend frontend`; both are ordinary tracked directories now, and the build is committed.

Nothing has been pushed — there is no remote configured. `backend/.env` holds the real API key and is gitignored; verify with `git ls-files | grep .env` (should return only `.env.example` files) before any push.
