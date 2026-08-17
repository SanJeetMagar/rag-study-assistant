# Study Guide

Everything you need to run this project, understand it well enough to defend
it, and change it later. Written for you, not for a marker.

---

## Part 1 — What you will need to change

### 1.1 The Gemini API key (most likely thing to break)

**Where:** `backend/.env`, the line `GEMINI_API_KEY=`

**When you'll need to:** the key is deleted, leaked, or stops working.

```bash
# 1. Get a new key (free): https://aistudio.google.com/apikey
# 2. Open the file
nano backend/.env
# 3. Replace the value after GEMINI_API_KEY=
# 4. Restart the backend (Ctrl+C then ./start.sh)
```

Nothing else changes. No code edit, no migration.

**Test it worked** without touching the browser:

```bash
cd backend
../venv/bin/python -c "
import os, sys, django
sys.path.insert(0, 'src')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from services.generation import get_provider
print(get_provider().generate('Reply with just OK.', 'Say OK'))
"
```

Prints `OK` → the key works. Anything else → read the error, it names the problem.

> **Security:** `.env` is gitignored, so the key never enters git. Never paste a
> real key into a file that *is* tracked, into a screenshot, or into a chat.
> If you do, delete that key in AI Studio and make a new one — it costs nothing.

### 1.2 The Gemini model name (will happen again)

Google retires models. `gemini-2.0-flash` and `gemini-2.5-flash` were already
retired during this build. When that happens you get a **404 mentioning the
model**, and the app now tells you exactly what to do.

**Where:** `backend/.env`, the line `GEMINI_MODEL=`

**Find what your key can actually use:**

```bash
cd backend
../venv/bin/python -c "
from google import genai
key = [l.split('=',1)[1].strip() for l in open('.env') if l.startswith('GEMINI_API_KEY=')][0]
for m in genai.Client(api_key=key).models.list():
    n = m.name.replace('models/','')
    if 'flash' in n and not any(x in n for x in ('image','tts','live')):
        print(' ', n)
"
```

Pick a `flash` model (fast and free-tier friendly), put it in `.env`, restart.

### 1.3 Retrieval tuning — the knobs that change answer quality

All in `backend/.env`. Change one at a time and re-test, or you won't know
which one helped.

| Setting | Default | Raise it when | Lower it when |
|---|---|---|---|
| `CHUNK_SIZE_WORDS` | 300 | Answers lack context, feel fragmentary | Answers are vague, mixing unrelated topics |
| `CHUNK_OVERLAP_WORDS` | 50 | Concepts get cut across chunk boundaries | Too many near-duplicate results |
| `RETRIEVAL_TOP_K` | 4 | Answers miss information that is in the PDF | Answers drift off-topic |
| `RETRIEVAL_MAX_DISTANCE` | 0.7 | It wrongly says "not covered" too often | It answers from loosely related text |

**Changing chunk settings requires re-processing**, because existing chunks were
built with the old values. In the app: delete the document and upload again, or
press **Retry** on it.

`RETRIEVAL_TOP_K` and `RETRIEVAL_MAX_DISTANCE` take effect on the next question
— no re-processing needed.

### 1.4 Ports

| What | Port | Change in |
|---|---|---|
| Postgres | 5433 | `start.sh` and `backend/.env` (`POSTGRES_PORT`) |
| Django | **8001** | `BACKEND_PORT` in `start.sh`; `vite.config.ts` follows it |
| Vite | 3000 | `frontend/package.json` (`--port=3000`) |

Postgres is on **5433 not 5432** because your `techbee_db` container already
uses 5432. If you ever remove that container you could move to 5432, but
there's no reason to.

### 1.5 Switching to Claude instead of Gemini

Two lines in `backend/.env`:

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Costs money. Only worth it if you have credit and want to compare quality in
your report. The code already supports it — that's what the provider
abstraction is for.

---

## Part 2 — How to study this

You did not write this code, so learn it in the order it *runs*, not the order
it sits in folders. Six sessions of about two hours. Do them in order.

### Session 1 — Use it before you read it (2h)

Do not open a single code file.

1. `./start.sh`, open http://localhost:3000
2. Register as a **teacher**. Create a course. Note the 6-character code.
3. Upload a real TU syllabus PDF. Watch the badge: Queued → Processing → Ready.
4. Open an incognito window. Register as a **student**. Join with the code.
5. Ask ten questions. Five you know are in the PDF, five you know are not.
6. Write down, on paper: which answers were good, which were wrong, and what
   the citations said.

**You should be able to answer:** What does a teacher do? What does a student
do? What happens between clicking Upload and the badge saying Ready?

That paper list of failures becomes your "future work" section. Keep it.

### Session 2 — The two ideas everything rests on (2h)

No code yet. Just these two concepts, properly.

**Embeddings.** A sentence becomes a list of 384 numbers. Sentences with
similar *meaning* get similar numbers — even with no shared words. That is why
"What are the network layers?" finds text saying "the OSI model divides
communication into seven layers".

See it for yourself:

```bash
cd backend
../venv/bin/python -c "
import sys; sys.path.insert(0,'src')
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); django.setup()
from services.embedder import embed_text
v = embed_text('The OSI model has seven layers')
print('length:', len(v))
print('first 8:', [round(x,4) for x in v[:8]])
"
```

**Cosine distance.** How far apart two of those lists are. `0` = same meaning,
`1` = unrelated. Retrieval returns the *smallest* distances. In your app,
anything above `0.7` is thrown away rather than shown.

Watch it discriminate:

```bash
cd backend
../venv/bin/python -c "
import sys; sys.path.insert(0,'src')
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); django.setup()
from services.embedder import embed_text
import numpy as np
def d(a,b):
    x,y = np.array(embed_text(a)), np.array(embed_text(b))
    return round(1 - x.dot(y), 4)
base = 'The OSI model divides networking into seven layers'
for other in ['What are the layers of the OSI model?',
              'Explain network protocol layering',
              'Normalization removes redundancy in databases',
              'How do I cook chicken momo?']:
    print(f'{d(base, other)}  <- {other}')
"
```

Real output from this project:

```
0.2974  <- What are the layers of the OSI model?          same question, reworded
0.4278  <- Explain network protocol layering              related topic
0.9089  <- Normalization removes redundancy in databases  different CS topic
0.9765  <- How do I cook chicken momo?                    unrelated
```

**Look at where 0.7 falls.** It sits between "related topic" (0.43) and
"different topic" (0.91). That is why the threshold is 0.7 — it admits genuinely
relevant passages and rejects everything else. If a marker asks why that number,
this is the answer, and you can regenerate it live.

**That output is a defense demo on its own.**

**You should be able to answer:** What is an embedding? Why does semantic search
beat keyword search? What does a distance of 0.3 versus 0.8 mean?

### Session 3 — The ingestion pipeline (2h)

Read these three files, in this order. They run in this order.

1. `backend/src/services/pdf_processor.py` — extract, clean, chunk
2. `backend/src/services/embedder.py` — text → 384 numbers
3. `backend/src/services/ingestion.py` — ties them together, saves to database

Then read the tests, which are documentation that cannot go stale:

```bash
cd backend
../venv/bin/python manage.py test services.tests.test_pdf_processor -v 2
```

**Understand specifically:**

- Why chunks **overlap** by 50 words (a concept split across a boundary still
  lands whole in at least one chunk)
- Why the model is loaded **once at module level** in `embedder.py` — loading it
  per chunk would make a 130-chunk document take minutes instead of seconds
- Why `page_number` is the page contributing the **most** words, not the page
  the chunk started on

**You should be able to answer:** Walk me through what happens between a
teacher clicking Upload and the status turning Ready.

### Session 4 — The query pipeline (2h)

Two files:

1. `backend/src/services/retriever.py` — the search and the answer
2. `backend/src/services/prompts.py` — the instructions given to the model

Then see the whole path with your own eyes in the database:

```bash
docker exec -it studyai-pg psql -U studyai -d studyai_db

-- what is actually stored
\d documents_documentchunk

-- how many chunks, and a sample
SELECT id, page_number, left(content, 70) FROM documents_documentchunk LIMIT 5;

-- the retrieval evidence saved with every answer
SELECT role, left(content,50), chunks_used, citations
FROM chat_message ORDER BY created_at DESC LIMIT 4;

\q
```

**Understand specifically:**

- The `SYSTEM_PROMPT` in `prompts.py` is what forces "answer only from this".
  Read it line by line — a marker may ask how you stop hallucination, and the
  honest answer is *this prompt plus the distance threshold*.
- `find_relevant_chunks` filters on `document__status=READY`, so a
  half-processed document never produces partial answers.

**You should be able to answer:** How does it know which part of the syllabus to
look at? What stops it inventing answers?

### Session 5 — API and frontend (2h)

Backend, per app: `models.py` → `serializers.py` → `views.py`.

Start with `backend/src/apps/chat/views.py`, function `ask` — it is the whole
system in forty lines.

Frontend:

1. `frontend/src/services/api.ts` — every network call, plus the 401 refresh
2. `frontend/src/context/AuthContext.tsx` — who is logged in
3. `frontend/src/pages/ChatPage.tsx` — the chat screen and citation rendering

**Understand specifically:** the **401 refresh interceptor** in `api.ts`. Access
tokens expire after 30 minutes. Without that code a student mid-conversation
would start getting errors for no visible reason. It refreshes once and replays
the failed request. Examiners like this question because most student projects
get it wrong.

**You should be able to answer:** What happens when a token expires? How does
the frontend know a document finished processing?

### Session 6 — Defense rehearsal (2h)

Out loud. Standing. Timed.

Run the demo end to end three times until it is smooth. Then answer these from
memory — the three you will almost certainly be asked:

**"How does it know which part of the syllabus to look at?"**
> The question is converted into 384 numbers by the same model that converted
> each chunk of the PDF. pgvector compares them by cosine distance and returns
> the four closest. Only those four are sent to the language model.
> *(Then show the citations, with distances, on screen.)*

**"How is this different from just asking ChatGPT?"**
> ChatGPT answers from general training data and will confidently invent
> syllabus content. This answers only from the uploaded PDF, cites the page, and
> refuses when the topic is absent. *(Then ask it the momo question live.)*

**"What are the limitations?"**
> Scanned PDFs have no text layer so they cannot be processed — it detects that
> and reports it rather than storing nothing. Ingestion runs in a background
> thread, so a server restart mid-upload strands a document; there is a
> management command to requeue those. Citations are chunk-level, so on short
> documents the cited page can be adjacent to the exact sentence. It runs on one
> machine. Nepali-language content retrieves less reliably because the embedding
> model is trained mainly on English.

Knowing your limitations is what separates a strong defense from a nervous one.

### The night before

```bash
./start.sh                                                   # everything comes up
cd backend && ../venv/bin/python manage.py test services.tests   # 31 pass
```

- Upload your real syllabus **the night before**, not during the demo
- Screen-record a working run as a backup in case the network fails
- Have the `psql` window already open on the `documents_documentchunk` table
- Ask two or three questions to warm the model — the very first question of a
  session is slower because the embedding model loads into memory

---

## Part 3 — Things to remember

### The one-sentence description

> Teachers upload a syllabus PDF; it is split into passages, each converted into
> a 384-number vector and stored in PostgreSQL with pgvector; a student's
> question is converted the same way, the closest passages are retrieved by
> cosine distance, and only those are given to a language model — so answers
> come from the syllabus and cite the page.

### The two pipelines

Everything is one of these. When something breaks, decide which one first —
they fail in completely different ways.

```
INGESTION  (once per upload, background thread)
PDF -> extract + page numbers -> clean -> chunk (300 words, 50 overlap)
    -> embed (384 dims) -> store in pgvector

QUERY  (every question)
question -> embed -> cosine search top-4 within the course
         -> build prompt -> LLM -> answer + citations
```

Bad answer? If the chunk was retrieved but the answer is wrong, it is a
*generation* problem (prompt). If the right chunk was never retrieved, it is a
*retrieval* problem (chunking, threshold, top_k).

### Design decisions you should be able to justify

| Decision | Why |
|---|---|
| **HNSW index, not IVFFlat** | IVFFlat builds clusters from rows present at build time. Created in a migration it trains on an empty table, so recall stays poor. HNSW needs no training data. |
| **Background thread, not Celery** | Celery needs Redis plus a worker process. For one machine that is a lot of infrastructure. The cost is that a restart strands a document — hence `requeue_stuck_documents`. |
| **`services/` is not a Django app** | Chunking and cleaning have no reason to know about HTTP or the database, so they are testable with neither. Only `retriever.py` touches the ORM. |
| **Custom User model from the start** | Swapping the user model is cheap only before the first migration. Doing it later means rebuilding the database. |
| **Provider abstraction** | Gemini, Anthropic and a mock behind one interface. The mock is why the tests need no network and cost nothing. |
| **Distance threshold of 0.7** | Without it, an unrelated question still returns its four closest chunks and the model answers from irrelevant text. The threshold is what makes "not covered" possible. |

### Three defects in the original plan, and their fixes

Bring these up yourself. They show you understood the design rather than typing
it in.

1. **Chunking discarded the end of every document.** The original loop ended
   with `if len(chunk_words) < 50: break`, dropping the final short chunk of
   every file. Content silently disappeared off the tail.
2. **`page_number` could never be filled in.** Pages were joined into one string
   before chunking, so the information needed was already destroyed. Page
   provenance is now carried through.
3. **Retrieval trusted a `course_id` sent by the browser.** Any logged-in student
   could read any course by changing a number. Every course-scoped endpoint now
   checks enrollment.

Each has a test. Run `manage.py test services.tests` and point at them.

### Vocabulary

| Term | Say this |
|---|---|
| RAG | Retrieval-Augmented Generation: fetch relevant text first, then let the model answer using only that |
| Embedding | A list of 384 numbers representing meaning |
| Cosine distance | How far apart two meanings are; 0 identical, 1 unrelated |
| Chunk | One ~300-word passage of a document, stored with its vector |
| pgvector | The PostgreSQL extension that stores vectors and searches them |
| HNSW | The index that makes that search fast without needing training data |
| Hallucination | A model inventing confident, false information — what grounding prevents |
| JWT | The signed token proving who is logged in |

---

## Part 4 — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `connection refused ... port 5433` | Database not running | `docker start studyai-pg` |
| Document stuck on **Processing** | Server restarted mid-ingestion | `cd backend && ../venv/bin/python manage.py requeue_stuck_documents` |
| Document goes to **Failed** | Scanned PDF with no text layer | Use a text-based PDF; the error message says so |
| "not covered in your syllabus" for something that *is* covered | Distance threshold too strict, or chunk never matched | Raise `RETRIEVAL_MAX_DISTANCE` to 0.8, or raise `RETRIEVAL_TOP_K` |
| 404 naming the model | Google retired it | New name in `GEMINI_MODEL` — see §1.2 |
| "Gemini is rate limiting this key" | Free-tier per-minute limit | Wait a minute. Pace demo questions. |
| Logged out unexpectedly | Refresh token expired (7 days) | Log in again |
| First question is slow | Embedding model loading into memory | Normal. Ask a warm-up question before demoing. |
| `npm run dev` port in use | Vite already running | `./start.sh stop` then start again |

**Reset everything and start clean** (destroys all data):

```bash
./start.sh stop
docker rm -f studyai-pg && docker volume rm studyai-pgdata
./start.sh                     # recreates the container
cd backend && ../venv/bin/python manage.py migrate
```

---

## Part 5 — Command reference

```bash
# Everything
./start.sh                    # start database + backend + frontend
./start.sh stop               # stop them all

# Tests
cd backend
../venv/bin/python manage.py test services.tests               # all 31
../venv/bin/python manage.py test services.tests.test_pdf_processor   # fast, no database
cd frontend && npm run lint                                    # TypeScript check

# Admin
cd backend
../venv/bin/python manage.py createsuperuser    # then http://localhost:8001/admin
../venv/bin/python manage.py requeue_stuck_documents

# Database
docker exec -it studyai-pg psql -U studyai -d studyai_db

# Git
git status
git add -A && git commit -m "message"
git log --oneline
```

---

## Part 6 — If you extend this

In rough order of value for marks per hour spent:

1. **Evaluate it properly.** Write 50 questions from your syllabus with the
   answers you expect. Run them all. Report the percentage correct. A measured
   accuracy number is worth more than any new feature.
2. **Show the retrieved chunks in the UI.** The data is already stored in
   `Message.citations` — it only needs displaying. Strong demo value, small change.
3. **OCR for scanned PDFs.** Removes your biggest limitation. Use `pytesseract`
   in `pdf_processor.py` when extraction returns nothing.
4. **Tune chunk size against your evaluation set.** Try 150, 300, 450 and report
   which retrieved best. This is real experimental work and reads well.
5. **Re-ranking.** Retrieve 8 chunks, re-rank with a cross-encoder, keep 4.
   Better accuracy, and shows reading beyond the basics.

Do 1 first. Everything else is easier to justify once you can measure whether it
helped.
