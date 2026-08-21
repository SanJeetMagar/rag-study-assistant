# RAG Study Assistant — Design

**Date:** 2026-08-15
**Status:** Approved, in implementation
**Context:** BICTE capstone project, runs locally only (no public deployment)

## Problem

Teachers upload a syllabus PDF. Students ask questions. The assistant answers using
*only* the uploaded syllabus, so answers are grounded in course material rather than
invented from a general model's training data.

## Runtime topology

Three local processes:

| Process | Port | Notes |
|---|---|---|
| Postgres + pgvector (Docker) | 5433 | `pgvector/pgvector:pg16`, pgvector 0.8.6 |
| Django dev server | 8000 | |
| Vite dev server | 3000 | Proxies `/api` → 8000 |

Host port **5433**, not 5432: the developer machine already runs an unrelated
`techbee_db` container on 5432. The local system Postgres 16 install stays stopped.

Because Vite proxies `/api`, the browser sees a single origin and CORS does not apply
in development. `django-cors-headers` is installed and configured anyway so the API
can be exercised directly from other tools.

## Two pipelines

The system is two independent pipelines. They share only the embedding model and the
database. Build and test each separately.

**Ingestion** (once per uploaded PDF):

```
PDF → extract text (+page numbers) → clean → chunk (300w, 50w overlap)
    → embed each chunk (384-dim) → store chunk + vector in Postgres
```

**Query** (once per student question):

```
question → embed (384-dim) → pgvector cosine search, top-4 within course
         → build prompt from retrieved chunks → LLM → answer + citations
```

## Data model

Five models plus a custom user.

### `users.User(AbstractUser)`

Adds `role` (`teacher` | `student`). A custom user model is introduced *before the
first migration* — the only point at which it is cheap. All `migrations/` directories
are empty at design time, and the database is being rebuilt on Postgres regardless.

### `courses.Course`

`title`, `description`, `teacher` (FK), `students` (M2M), `course_code` (unique,
students join with it), `created_at`, `is_active`.

### `documents.Document`

`course` (FK), `title`, `file`, `uploaded_by`, `uploaded_at`, `status`
(`pending` | `processing` | `ready` | `error`), `total_chunks`, `error_message`.

The status field exists because ingestion is asynchronous — see *Ingestion execution*.

### `documents.DocumentChunk`

`document` (FK), `content`, `embedding` (`VectorField(dims=384)`), `chunk_index`,
`page_number`.

The most important table. A 100-page syllabus produces roughly 130 rows here.

### `chat.ChatSession`, `chat.Message`

Session groups a conversation between one student and one course. Message has `role`
(`user` | `assistant`), `content`, `created_at`, and retrieval provenance (below).

## Corrections to the original specification

Three defects in the source spec, fixed in this design. A fourth, found later in code written for this project, is recorded after them.

**1. Chunking silently drops the end of every document.** The original
`split_into_chunks` ends each loop with `if len(chunk_words) < 50: break`. With
`chunk_size=300, overlap=50`, the final chunk of any document is short and is
discarded. Content disappears off the tail of every PDF. Fixed: the tail is retained
when it carries meaningful text.

**2. `page_number` is unpopulatable as specified.** `DocumentChunk` declares
`page_number`, but `split_into_chunks` receives a single concatenated string with all
page boundaries already flattened — the information needed to fill the field has been
destroyed before chunking runs. Fixed: page provenance is carried through extraction
into chunking, so each chunk knows which page(s) it came from. This matters because
telling a student *which unit to study* is a stated accuracy goal.

**3. Retrieval trusts a client-supplied `course_id`.** `find_relevant_chunks(question,
course_id)` performs no authorization, so any authenticated student could read chunks
from a course they never enrolled in. Fixed: every course-scoped endpoint verifies
enrollment (or teacher ownership) before querying.

## Addition: retrieval provenance on messages

The original `Message.chunks_used` is an integer, so which chunks were retrieved — and
how similar they were — is discarded after the response is returned. The project's own
defense checklist requires *showing similarity scores* to the committee.

`Message` therefore stores the retrieved chunk IDs and their cosine distances. The chat
UI renders citations ("Unit 3, page 34 — distance 0.21"), making retrieval quality
demonstrable live rather than merely described.

## Index: HNSW, not IVFFlat

The original spec calls for `USING ivfflat (embedding vector_cosine_ops)`. IVFFlat
builds its clusters from rows present at build time; created in a migration it trains
on an empty table and yields poor recall until rebuilt.

**HNSW** requires no training data, handles incremental inserts correctly, and has
better recall. Its costs — slower build, higher memory — are irrelevant at this scale.
pgvector 0.8.6 supports it.

## Module boundaries

Django apps own HTTP and the ORM. `services/` is a **plain Python package, not a Django
app** — it holds pure logic and stays out of `INSTALLED_APPS`.

| Module | Owns | Depends on |
|---|---|---|
| `users` | `User`, JWT + registration | — |
| `courses` | `Course`, enrollment, join-by-code | `users` |
| `documents` | `Document`, `DocumentChunk`, upload, status | `courses`, `services` |
| `chat` | `ChatSession`, `Message`, ask, history | `courses`, `services` |
| `services/` | pdf_processor, embedder, retriever, ingestion, generation | ORM only in `retriever` |

`pdf_processor` imports nothing from Django, so chunking and cleaning are testable as
pure functions without a database.

`embedder` loads `all-MiniLM-L6-v2` **once at module import**. Loading inside a
per-chunk function is the single largest performance trap in this system: the model
takes seconds to load, and a 130-chunk document would pay that cost 130 times.

## Ingestion execution

Upload returns immediately with `status: pending`. A background **thread** runs the
pipeline and advances the status; the frontend polls and renders the badge.

Chosen over Celery + Redis (two more services to run and deploy, marked optional in the
source spec) and over synchronous processing (a 10-20 second hanging request that makes
the status field decorative).

Known limitation, and an honest one to state at defense: a server restart mid-ingestion
strands a document in `processing`, and the approach does not scale beyond one server. A
management command requeues stranded documents.

## Generation providers

One protocol, three implementations, selected by environment variable:

- **Gemini** — default. Free tier; the project is a student demo and an Anthropic key
  is a cost the project does not need to carry.
- **Mock** — deterministic. The entire test suite uses it, so tests need neither
  network nor API spend.
- **Anthropic** — available unchanged if a key is ever added.

Swapping providers is a one-line `.env` change. `GEMINI_API_KEY` lives in
`backend/.env`, which is gitignored; `backend/.env.example` is committed.

## Frontend

`LMSContext` — a single context holding all state, persisted to `localStorage` — is
replaced by:

- **`AuthContext`** — JWT storage plus an axios response interceptor that catches 401,
  refreshes the access token, and retries the original request. This is the piece the
  source spec correctly identifies as the trickiest frontend work.
- **TanStack Query** — all server state. This removes the manual `localStorage` sync
  layer entirely.

Roles become teacher/student. Screens: Dashboard (course list, create/join),
CourseDetail (documents, status badges, upload), Chat (session sidebar, citations),
Login/Register, Settings.

Existing primitives (`Button`, `Card`, `Input`, `Modal`, `Tabs`) are kept. Their class
strings contain dead fragments such as `":bg-zinc-700"`, left behind when `dark:`
prefixes were stripped; these are cleaned up. `ChatbotPage`'s `generateAIResponse`
keyword matcher is deleted.

## Dependency versions

The source spec's pins are from an older stack and are not used:

- `django==4.2.7` — the project venv already has **6.0.5**.
- `torch==2.0.1` — no Python 3.12 wheels exist; the machine runs 3.12.3.
- `psycopg2-binary` — replaced by `psycopg[binary]` (psycopg 3), which Django 6 prefers.
- `google-generativeai` — replaced by the current `google-genai` SDK.

## Testing

Test-driven throughout.

| Layer | Approach |
|---|---|
| Chunking, cleaning, prompt building | Pure functions, no database |
| Retrieval | Real pgvector container |
| Generation | Mock provider — no network, no spend |
| API | DRF test client |

The embedding model is loaded once per test session via a fixture.

## Out of scope

**Deployment.** The project runs locally for a capstone defense; Railway and Vercel
deployment from the source roadmap is dropped.

**OCR for scanned PDFs.** Text-layer PDFs only. A scanned syllabus produces no
extractable text; ingestion detects this and fails the document with a clear
`error_message` rather than storing empty chunks. Stated as a known limitation.

## Prerequisite fixed before implementation

`backend` and `frontend` were recorded in git as **gitlinks** (mode 160000) with no
`.gitmodules` and no nested `.git` directories. `git status` reported clean regardless
of changes, `git add` inside those directories silently did nothing, and no source was
present in repository history. Resolved with `git rm --cached backend frontend` so both
are tracked as ordinary directories.

---

## Addendum — what changed after this was written

This document records the design as approved. The body above is left as
written; the list below is what the build actually diverged into, so the two
can be read together without either being misleading.

**Stale in the body above:** the Django port is now **8001**, not 8000 —
another project on the machine holds 8000, the same reason Postgres sits on
5433. The data model is now **seven models**, not five.

**Added since:**

- **`quizzes` app** — `Quiz`, `Question`, `QuizAttempt`, `AttemptAnswer`.
  Questions are generated from a document's stored passages and each records
  its `source_chunk`, on the same grounding argument as answers. Multiple
  choice is marked by comparing against the stored key rather than by the
  model; the model is used only for short answers, where there is no key.
  The payload sent while taking a quiz omits the answer key, because it
  reaches the browser.
- **Authorisation consolidated** into `apps/courses/permissions.py`. The
  design assumed one enrollment check would suffice; in practice the rule
  ended up hand-written in eight places, which is how correction 4 above
  happened. `role_in_course` is now the only place that decides.
- **Authenticated file serving** at `/documents/{id}/file/`. `MEDIA_ROOT` is
  served unauthenticated by Django, so a direct `/media/` link would have
  bypassed every enrollment check the design specifies.
- **Passage text stored on citations**, not just chunk ids and distances, so
  the evidence behind an answer survives the document being re-ingested or
  deleted — and so the UI can show it.
- **OpenAPI documentation** via drf-spectacular at `/api/docs/`, generated
  from the code so it cannot drift out of date.
- **A frontend type scale** in `index.css`, and shared `PageHeader` /
  `EmptyState` / `ErrorBanner` / `StatusBadge` components. Not a design
  decision so much as the correction of an omission: the design said nothing
  about visual consistency, and eight ad-hoc text sizes accumulated.

**Still not done, and still the highest-value work:** retrieval accuracy is
demonstrated but not measured. See `docs/IMPROVEMENTS.md`.
