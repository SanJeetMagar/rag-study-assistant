# Quick Note

One page. Fuller detail lives in
[docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md) (how to study, config, troubleshooting),
[docs/CONCEPTS.md](docs/CONCEPTS.md) (every concept used) and
[docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) (what to do next).

---

## Run it

```bash
./start.sh          # database + backend + frontend
./start.sh stop     # shut it all down
```

Open **http://localhost:3000**

| Service | Port | Notes |
|---|---|---|
| Postgres (Docker) | **5433** | not 5432 — another project holds that |
| Django API | **8001** | not 8000 — another project holds that |
| Vite frontend | 3000 | proxies `/api` to 8001 |

| Page | Address |
|---|---|
| App | http://localhost:3000 |
| Swagger UI (live API docs) | http://localhost:8001/api/docs/ |
| ReDoc (read-only docs) | http://localhost:8001/api/redoc/ |
| Django admin | http://localhost:8001/admin |

---

## In one sentence

> Teachers upload a syllabus PDF. It is split into ~300-word passages, each
> turned into a 384-number vector and stored in PostgreSQL with pgvector. A
> student's question is turned into a vector the same way, the four closest
> passages are found by cosine distance, and only those are given to Gemini —
> so answers come from the syllabus and cite the page. The same passages also
> generate quizzes.

## The two pipelines

```
INGESTION (once per upload, background thread)
PDF → extract + page numbers → clean → chunk (300 words, 50 overlap)
    → embed (384 dims) → store in pgvector

QUERY (every question)
question → embed → cosine search top-4 in this course
         → build prompt → Gemini → answer + citations
```

Quiz generation is a third path that reuses the stored passages: sample across
the document → prompt Gemini for questions → validate the JSON → store each
question against the passage it came from.

**Debugging rule:** decide which pipeline first. Right passage found but bad
answer = generation problem (prompt). Right passage never found = retrieval
problem (chunking, threshold, top-k).

---

## What it does

| Feature | Who | Where |
|---|---|---|
| Create / edit / delete a course | Teacher | Dashboard, course settings |
| Join by code / leave | Student | Dashboard, course page |
| Upload / rename / delete a PDF | Teacher | Course page |
| Read the PDF in-app | Both | Eye icon, or a citation's page link |
| Ask questions, get cited answers | Both | Course → Ask a question |
| See the passages behind an answer | Both | "Answered from N passages" |
| Generate a quiz from a document | Teacher | Course page → New quiz |
| Take a quiz, get marked | Student | Course page → quiz name |

---

## Numbers to remember

| Value | What | Why |
|---|---|---|
| **384** | Embedding dimensions | Size of `all-MiniLM-L6-v2` output |
| **300 / 50** | Chunk size / overlap words | Overlap keeps concepts whole across boundaries |
| **4** | Passages retrieved per question | Enough context without dilution |
| **0.7** | Max cosine distance | Beyond this = irrelevant, discarded |
| **8 / 4** | Questions per quiz / options per MCQ | |
| **57** | Tests passing | |
| **24** | Documented API endpoints | |
| **30 min / 7 days** | Access / refresh token life | |

**Distance scale**, measured on this project:

```
0.30  same question, reworded
0.43  related topic          ← 0.7 threshold sits here, deliberately
0.91  different CS topic
0.98  unrelated
```

---

## Config (`backend/.env`)

| Change | Effect | Needs re-upload? |
|---|---|---|
| `GEMINI_API_KEY` | New key | no |
| `GEMINI_MODEL` | Different model (currently `gemini-3.7-flash`) | no |
| `RETRIEVAL_TOP_K` | More / fewer passages per answer | no |
| `RETRIEVAL_MAX_DISTANCE` | Stricter / looser relevance | no |
| `CHUNK_SIZE_WORDS` / `CHUNK_OVERLAP_WORDS` | How documents are split | **yes** |
| `LLM_PROVIDER` | `gemini` / `anthropic` / `mock` | no |

**Key and model are separate.** The key is a library card; the model is which
book you ask for. Google never names a model when issuing a key.

---

## Commands

```bash
# tests
cd backend && ../venv/bin/python manage.py test services.tests      # all 57
cd frontend && npm run lint                                         # tsc --noEmit

# admin login
cd backend && ../venv/bin/python manage.py createsuperuser

# document stuck on "Reading it" after a restart
cd backend && ../venv/bin/python manage.py requeue_stuck_documents

# look inside the database
docker exec -it studyai-pg psql -U studyai -d studyai_db
SELECT id, page_number, left(content,60) FROM documents_documentchunk LIMIT 5;

# after adding a Python dependency
cd backend && ../venv/bin/pip freeze > requirements.txt
```

---

## The three defense answers

**"How does it know which part of the syllabus to look at?"**
> The question is embedded by the same model that embedded every passage of the
> PDF. pgvector compares them by cosine distance and returns the four closest.
> Only those go to the language model. *(Expand "Answered from N passages" and
> show the distances.)*

**"How is this different from just asking ChatGPT?"**
> ChatGPT answers from training data and will invent syllabus content that does
> not exist. This answers only from the uploaded PDF, cites the page, and says
> so when the topic is absent. *(Ask something off-syllabus, live.)*

**"What are the limitations?"**
> Scanned PDFs have no text layer, so they cannot be processed — it detects that
> and reports it. Ingestion runs in a background thread, so a restart mid-upload
> strands a document; a management command requeues those. Citations are
> passage-level, so on short documents the cited page can be adjacent to the
> exact sentence. Single machine only. Nepali content retrieves less reliably —
> the embedding model is mostly English-trained.

---

## Design decisions to justify

| Decision | One-line reason |
|---|---|
| **HNSW not IVFFlat** | IVFFlat trains on rows present at build time; in a migration that is an empty table |
| **Background thread not Celery** | Celery needs Redis + a worker; too much for one machine. Cost: restarts strand documents |
| **`services/` not a Django app** | Chunking and cleaning need no HTTP or database, so they are testable without either |
| **Custom User from the start** | Only cheap before the first migration |
| **Provider abstraction** | Gemini / Claude / mock behind one interface — the mock is why tests need no network |
| **0.7 distance threshold** | Without it, an off-topic question still returns its four closest passages and gets answered from junk |
| **MCQ marked deterministically, not by AI** | Comparing two integers is instant, free and exact. The model is used only where there is no key — short answers |
| **Answer key withheld while taking** | That JSON reaches the browser; shipping the key to the person being tested makes the quiz decorative |
| **Authorisation in one module** | The teacher check was written eight times; one stale copy guarding material it should not is how the original hole happened |

---

## Four defects fixed, three from the original brief

Raise these yourself — they show you understood the design rather than typed it in.

1. **Chunking discarded every document's tail.** `if len(chunk_words) < 50: break`
   dropped the final short chunk of every file.
2. **`page_number` could never be filled.** Pages were joined into one string
   before chunking, destroying the information needed.
3. **Retrieval trusted a client-supplied `course_id`.** Any student could read
   any course by changing a number — an IDOR vulnerability.
4. **Leaving a course was refused as if it were editing one.** Every POST was
   treated as a course edit, so students were told the teacher decides. Leaving
   changes your own membership, not the course.

Each has a regression test.

---

## Before the defense

- [ ] Upload your real syllabus **the night before**, not during the demo
- [ ] `./start.sh` and confirm all three services come up
- [ ] `manage.py test services.tests` → 57 pass
- [ ] Ask two warm-up questions (the first is slow — the model loads into memory)
- [ ] Generate one quiz in advance; generation takes a few seconds
- [ ] Screen-record a working run as a backup
- [ ] Have `psql` open on `documents_documentchunk`
- [ ] Prepare one on-syllabus and one off-syllabus question to show the contrast

---

## Highest-value thing to add next

Write 50 questions from your syllabus with expected answers, run them all, and
report the percentage correct with an analysis of the failures. **A measured
accuracy number is worth more than any new feature** — it turns "it works" into
evidence. See [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md).
