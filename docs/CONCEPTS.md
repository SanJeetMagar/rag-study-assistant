# Concepts Used in This Project

Every idea this project relies on, with where it actually appears in the code
and what to say if asked. Study alongside [STUDY-GUIDE.md](STUDY-GUIDE.md),
which tells you the order to learn them in.

Marked **★** = likely to be asked in your defense. Learn those properly first.

---

## 1. The AI / retrieval core

This is what makes the project a *capstone* rather than a CRUD app. Know this
section better than any other.

| Concept | Where in this project | What it means |
|---|---|---|
| **★ RAG** (Retrieval-Augmented Generation) | The whole architecture | Fetch relevant text first, then let a language model answer using *only* that text. Grounds answers in your documents instead of the model's training data. |
| **★ Embedding** | `services/embedder.py` | Text converted into a list of 384 numbers representing its meaning. Similar meanings produce similar numbers, even with no shared words. |
| **★ Vector** | `DocumentChunk.embedding` | The list of numbers itself. "384-dimensional" just means 384 numbers long. |
| **★ Semantic search** | `services/retriever.py` | Searching by *meaning* rather than exact words. "What are the layers?" finds text about "the OSI model divides communication" — zero words in common. |
| **★ Cosine similarity / distance** | `CosineDistance` in `retriever.py` | How close two vectors point in the same direction. Distance 0 = same meaning, 1 = unrelated. We sort ascending and keep the smallest. |
| **★ Chunking** | `pdf_processor.split_into_chunks` | Splitting a document into ~300-word passages. Whole documents are too big to embed meaningfully; single sentences lack context. |
| **★ Chunk overlap** | `CHUNK_OVERLAP_WORDS=50` | Consecutive chunks share 50 words, so a concept split across a boundary still lands whole in at least one chunk. |
| **★ Vector database** | PostgreSQL + `pgvector` | A database that can store vectors and search them by distance. pgvector adds this to ordinary Postgres. |
| **★ ANN index / HNSW** | Migration `documents/0001` | Approximate Nearest Neighbour. Comparing against every row is slow; HNSW builds a navigable graph making search near-instant. Chosen over IVFFlat because IVFFlat trains on rows present at build time — in a migration that means an empty table. |
| **★ Grounding** | `prompts.SYSTEM_PROMPT` | Constraining the model to answer only from supplied text. The defence against hallucination. |
| **★ Hallucination** | What the project prevents | A model producing confident, false information. Ungrounded LLMs invent syllabus content that does not exist. |
| **Similarity threshold** | `RETRIEVAL_MAX_DISTANCE=0.7` | Chunks further than this are discarded. Without it, an unrelated question still returns its four closest chunks and the model answers from junk. |
| **top-k retrieval** | `RETRIEVAL_TOP_K=4` | How many chunks to send to the model. Too few misses information; too many dilutes and costs more. |
| **Prompt engineering** | `services/prompts.py` | Writing instructions that produce the behaviour you want. Your refusal rule and the "say what *is* covered" rule are both prompt engineering. |
| **System prompt vs user message** | `Provider.generate(...)` | The system prompt sets standing rules; the user message carries this turn's question. Rules go in the system prompt so they apply to every turn. |
| **Context window** | Why we send only 4 chunks | The maximum text a model can read at once. Retrieval exists partly because you cannot fit a 100-page syllabus into it. |
| **Token** | Billing and limits | Roughly 3/4 of a word. Models are priced and limited per token. |
| **Multi-turn context** | `HISTORY_TURNS=6` in `chat/views.py` | Replaying recent messages so "explain that further" makes sense. |
| **Sentence transformer** | `all-MiniLM-L6-v2` | The specific model converting text to vectors. Runs locally on CPU, free, 384 dimensions. |

**Say this if asked what RAG is:** *"Retrieval-Augmented Generation. Instead of
asking a model from memory, I first retrieve the passages most relevant to the
question from the uploaded document, then give the model only those and instruct
it to answer from nothing else."*

---

## 2. Backend — Python and Django

| Concept | Where | What it means |
|---|---|---|
| **★ MVT pattern** | `models.py` / `views.py` / serializers | Django's Model-View-Template. In an API project the serializer replaces the template. |
| **★ ORM** | Every `.objects.filter(...)` | Object-Relational Mapper. Write Python, get SQL. `Course.objects.filter(teacher=user)` becomes a `SELECT`. |
| **★ Model** | `apps/*/models.py` | A Python class that maps to a database table. Each attribute is a column. |
| **★ Migration** | `apps/*/migrations/` | A versioned, replayable change to the database schema. Lets the database be rebuilt from scratch by code. |
| **★ Foreign key** | `Document.course` | A one-to-many link. Many documents belong to one course. |
| **Many-to-many** | `Course.students` | Many students in many courses. Django creates a join table. |
| **Cascade delete** | `on_delete=CASCADE` | Deleting a document deletes its chunks automatically. |
| **Custom user model** | `apps/users/models.py` | Replacing Django's built-in User to add a `role` field. Only cheap before the first migration — afterwards it means rebuilding the database. |
| **QuerySet laziness** | `retriever.find_relevant_chunks` | Queries do not execute until you iterate them, so filters can be chained and combined into one SQL statement. |
| **`select_related`** | `retriever.py` | Fetches related rows in one join instead of one query per row. Avoids the **N+1 query problem**. |
| **Django app vs plain package** | `apps/` vs `services/` | Apps are registered in `INSTALLED_APPS` and own models. `services/` is deliberately *not* an app — it holds pure logic with no HTTP or ORM. |
| **Settings / 12-factor config** | `config/settings.py` + `.env` | Configuration lives in environment variables, not code, so secrets stay out of git and values differ per machine. |
| **Management command** | `requeue_stuck_documents.py` | A custom `manage.py` subcommand for operational tasks. |
| **Atomic transaction** | `@transaction.atomic` in `chat/views.py` | All-or-nothing database writes. Stops a question being saved without its answer. |
| **`update_fields`** | `ingestion.py` | Saving only the changed columns instead of the whole row. |
| **Django admin** | `apps/*/admin.py` | Auto-generated CRUD interface at `/admin`. Useful for demos. |

---

## 3. REST API design (Django REST Framework)

| Concept | Where | What it means |
|---|---|---|
| **★ REST** | The whole API | Resources addressed by URL, manipulated with HTTP verbs. `/api/courses/` + `GET` lists, `POST` creates. |
| **★ Serializer** | `apps/*/serializers.py` | Converts model objects to JSON and validates incoming JSON. The API's boundary layer. |
| **★ Validation** | `DocumentSerializer.validate_file` | Rejecting bad input before it reaches the database — file type, file size, ownership. |
| **ViewSet** | `CourseViewSet`, `DocumentViewSet` | One class providing list/create/retrieve/update/destroy for a resource. |
| **Router** | `apps/*/urls.py` | Generates URL patterns from a ViewSet automatically. |
| **Custom action** | `@action` — `join`, `status`, `chunks` | Extra endpoints on a ViewSet beyond standard CRUD. |
| **Permission class** | `IsAuthenticated`, `IsCourseTeacher` | Reusable authorisation rules applied per view. |
| **Pagination** | `PAGE_SIZE=20` | Returning results in pages so a list endpoint never dumps 10,000 rows. |
| **★ HTTP status codes** | Throughout | 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthenticated, 403 Forbidden, 404 Not Found, 503 Service Unavailable. |
| **Content types** | Upload endpoint | `application/json` for data, `multipart/form-data` for file uploads. |
| **Idempotency** | `GET` vs `POST` | Repeating a `GET` changes nothing; repeating a `POST` creates another row. |

**Know the difference:** **401** means *I don't know who you are*; **403** means
*I know who you are and you're not allowed*. Your enrollment check returns 403.

---

## 4. Authentication and security

| Concept | Where | What it means |
|---|---|---|
| **★ Authentication vs authorisation** | JWT vs `get_accessible_course` | Authentication = who are you. Authorisation = what may you do. Two separate problems. |
| **★ JWT** | `rest_framework_simplejwt` | JSON Web Token — a signed token proving identity, so the server stores no session. |
| **★ Access vs refresh token** | `SIMPLE_JWT` settings | Access token is short-lived (30 min) to limit damage if stolen; refresh token (7 days) obtains new access tokens without re-login. |
| **★ IDOR** | Fixed by `get_accessible_course()` | Insecure Direct Object Reference — trusting an ID from the client. The original design let any student read any course by changing a number in the request. |
| **Password hashing** | Django's `create_user` | Passwords are stored as one-way hashes (PBKDF2), never as text. |
| **Secrets management** | `.env` + `.gitignore` | Keys live in an untracked file. `.env.example` documents the shape without the values. |
| **CORS** | `django-cors-headers`, Vite proxy | Browsers block cross-origin requests. We avoid the problem entirely by proxying `/api` through Vite so everything is same-origin. |
| **File upload validation** | `DocumentSerializer` | Checking extension and size. Never trust an uploaded file. |
| **Least privilege** | Teacher-only upload/delete | Each role gets only the permissions it needs. |

---

## 5. Databases

| Concept | Where | What it means |
|---|---|---|
| **★ Relational database** | PostgreSQL | Data in tables with typed columns and enforced relationships. |
| **★ Index** | HNSW + `Index(fields=[...])` | A structure making lookups fast without scanning every row. |
| **★ Database extension** | `CREATE EXTENSION vector` | Optional add-on modules. pgvector adds the `vector` column type and distance operators. |
| **Primary / foreign key** | `id`, `document_id` | Unique row identifier; a reference to another table's primary key. |
| **JSON column** | `Message.citations` | Storing structured data (list of chunk ids and distances) in one column without a separate table. |
| **`bulk_create`** | `ingestion.py` | Inserting 130 rows in one statement instead of 130 statements. |
| **Connection lifecycle in threads** | `close_old_connections()` | Each thread gets its own database connection; stale ones must be cleaned up or they leak. |
| **Docker volume** | `studyai-pgdata` | Storage that outlives the container, so your data survives a restart. |

---

## 6. Concurrency and background work

| Concept | Where | What it means |
|---|---|---|
| **★ Blocking vs non-blocking** | Upload endpoint | Ingestion takes 10–20 seconds. Doing it inside the request would hang the browser, so it returns immediately and works in the background. |
| **★ Thread** | `ingestion.process_document_async` | A separate line of execution inside the same process. |
| **★ Polling** | `refetchInterval` in `CourseDetailPage.tsx` | The client asks "done yet?" every 2 seconds, and stops asking once everything is ready. |
| **Race condition** | Why upload returns `pending` *or* `processing` | Two things happening at once with no guaranteed order. The thread can start before the response is serialised. |
| **Thread-safe lazy initialisation** | `embedder.get_model()` | The double-checked lock ensures the model loads exactly once even if several threads ask simultaneously. |
| **Task queue (not used)** | Why not Celery | The production answer, needing Redis plus a worker. Rejected for a single-machine project — you should be able to say why, and name the cost. |
| **Daemon thread** | `daemon=True` | A thread that does not stop the process from exiting. |

---

## 7. Frontend — React

| Concept | Where | What it means |
|---|---|---|
| **★ SPA** | The whole frontend | Single Page Application. One HTML page; JavaScript swaps the content instead of the server sending new pages. |
| **★ Component** | Everything in `src/pages`, `src/components` | A reusable function returning UI. |
| **★ Props** | `<Citations citations={...} declined={...} />` | Inputs passed from parent to child. |
| **★ State** | `useState` | Data that, when changed, re-renders the component. |
| **★ Hook** | `useState`, `useEffect`, `useRef`, `useMemo`, `useContext` | Functions letting a component use React features. Rules: only at the top level, only in components. |
| **`useEffect`** | Auto-scroll in `ChatPage`, token check in `AuthContext` | Running code after render — for side effects like network calls or DOM manipulation. |
| **`useRef`** | Scroll container, file input | A mutable value that persists across renders without causing one. |
| **★ Context API** | `AuthContext.tsx` | Sharing values down the tree without passing props through every level. Used for "who is logged in". |
| **Conditional rendering** | `{error && <p>...</p>}` | Showing UI only when a condition holds. |
| **Lists and keys** | `messages.map(...)` | Rendering arrays; `key` lets React track which item is which. |
| **Controlled input** | `value={input} onChange={...}` | React state is the single source of truth for the field's value. |
| **Lifting state up** | `sessionId` in `ChatPage` | Shared state lives in the closest common parent. |
| **★ Client vs server state** | `useState` vs TanStack Query | Client state is UI-local (is a modal open). Server state is a *cache* of data owned by the backend — it can go stale, needs refetching, and should not be hand-managed. Conflating the two is what made the old `LMSContext` unmanageable. |

---

## 8. Data fetching (TanStack Query + axios)

| Concept | Where | What it means |
|---|---|---|
| **★ Query** | `useQuery({queryKey, queryFn})` | A cached, deduplicated read. Multiple components asking for the same key share one request. |
| **★ Query key** | `["documents", courseId]` | The cache identity. Change the key, get different data. |
| **★ Mutation** | `useMutation` | A write (POST/PUT/DELETE), with `isPending` and `onError` handled for you. |
| **★ Cache invalidation** | `invalidateQueries` | After a write, mark related reads stale so they refetch. This is how the list updates after an upload. |
| **Polling interval** | `refetchInterval` | Refetch on a timer — returns `false` to stop, which is how status polling ends. |
| **★ HTTP interceptor** | `api.ts` | Code running on every request or response. Ours attaches the token on the way out and handles 401 on the way back. |
| **★ Token refresh flow** | `api.ts` | On 401: refresh once, retry the original request, and share that single refresh between concurrent failures so five parallel 401s do not fire five refreshes. |
| **Retry guard** | `original._retried` | Prevents an infinite loop when the retry also fails. |
| **Development proxy** | `vite.config.ts` | Vite forwards `/api` to Django, so the browser sees one origin and CORS never applies. |

---

## 9. TypeScript

| Concept | Where | What it means |
|---|---|---|
| **★ Static typing** | `src/types.ts` | Types checked before the code runs. `npm run lint` catches mistakes without opening a browser. |
| **Interface** | `interface Course {...}` | The shape an object must have. |
| **Union type** | `"pending" \| "processing" \| ...` | A value must be one of a fixed set. Typos become compile errors. |
| **Generic** | `Paginated<Course>` | A type parameterised by another type — one definition reused for every paginated response. |
| **Type narrowing** | `if (block.type === "text")` | Convincing the compiler which variant you have before using it. |
| **Optional / nullable** | `page_number: number \| null` | Explicitly modelling "might be absent" rather than discovering it at runtime. |

---

## 10. Styling

| Concept | Where | What it means |
|---|---|---|
| **Utility-first CSS** | Tailwind classes throughout | Compose styles from small classes (`px-4 py-2 rounded-lg`) instead of writing custom CSS. |
| **Design tokens** | `@theme` in `index.css` | Named values (fonts, colours) defined once and reused. |
| **Responsive design** | `sm:` `md:` `lg:` prefixes | Different layout at different screen widths. |
| **Accessibility** | `aria-label`, `role="alert"`, `aria-current` | Making the UI usable with a screen reader. Cheap to add, and markers notice. |

---

## 11. HTTP and the web

| Concept | Where | What it means |
|---|---|---|
| **★ Request/response cycle** | Everything | Client sends a request, server returns a response. Stateless — each is independent. |
| **HTTP methods** | GET, POST, DELETE | Read, create, remove. |
| **Headers** | `Authorization: Bearer ...` | Metadata attached to a request. |
| **JSON** | Every API payload | The text format used to exchange structured data. |
| **`multipart/form-data`** | PDF upload | The encoding used to send binary files. |
| **Same-origin policy** | Why the proxy exists | Browsers block scripts reading responses from a different origin unless allowed. |
| **Async / await, Promise** | All of `api.ts` | Handling operations that finish later without freezing the UI. |
| **Environment / port** | 3000, 8001, 5433 | Which process listens where. |

---

## 12. Tooling

| Concept | Where | What it means |
|---|---|---|
| **★ Containerisation** | Docker Postgres | Packaging software with its dependencies so it runs identically anywhere. |
| **Port mapping** | `-p 5433:5432` | Container port 5432 exposed as 5433 on your machine. |
| **Virtual environment** | `./venv` | Isolated Python packages per project. |
| **Package manager** | `pip`, `npm` | Installing and pinning dependencies. |
| **Bundler** | Vite | Turning many source files into what a browser can load; also runs the dev server. |
| **HMR** | Vite dev server | Hot Module Replacement — the page updates on save without a full reload. |
| **Transpilation** | TypeScript → JavaScript | Converting code browsers cannot run into code they can. |
| **★ Version control** | Git | Tracked history of every change. |
| **Gitlink** | The bug we fixed | A submodule reference. Yours pointed at nothing, so `git add` silently did nothing and no source was ever committed. |

---

## 13. Testing

| Concept | Where | What it means |
|---|---|---|
| **★ Unit test** | `test_pdf_processor.py` | Tests one function in isolation. No database, milliseconds. |
| **★ Integration test** | `test_api.py` | Tests several layers together — HTTP through to the database. |
| **★ Test double / mock** | `MockProvider` | A stand-in for a real dependency. Ours makes the whole suite run with no network and no cost. |
| **Fixture / `setUp`** | `ApiTestCase.setUp` | Shared starting state built fresh for each test. |
| **Test database** | Created and destroyed per run | Tests never touch your real data. |
| **Assertion** | `assertEqual`, `assertLess` | The check that decides pass or fail. |
| **Regression test** | The three defect tests | A test written so a fixed bug cannot come back. |
| **Test isolation** | `override_settings` | Each test controls its own configuration and cannot affect the next. |

---

## 14. Software design

| Concept | Where | What it means |
|---|---|---|
| **★ Separation of concerns** | `apps/` vs `services/` | Each part has one job. HTTP handling does not know about embeddings. |
| **★ Layered architecture** | views → services → models | Each layer talks only to its neighbour. |
| **★ Dependency inversion** | `generation/base.py` | Code depends on an interface, not a concrete class. Swapping Gemini for Claude touches nothing outside that package. |
| **Strategy pattern** | The three providers | Interchangeable implementations selected at runtime. |
| **Factory** | `get_provider()` | One function that builds the right implementation from configuration. |
| **★ Pure function** | `split_into_chunks`, `clean_text` | Same input, same output, no side effects. Trivial to test. |
| **Singleton** | The cached embedding model | One shared instance for the process lifetime. |
| **Fail fast** | Missing key raises at construction | Errors surface at startup with a clear message, not deep inside a request. |
| **Graceful degradation** | Provider errors → 503 with a message | A failure produces a useful message rather than a stack trace. |
| **Configuration over hardcoding** | Everything tunable in `.env` | Change behaviour without editing code. |
| **YAGNI** | No Celery, no OCR | Don't build what the project does not need. Be ready to defend what you left out. |

---

## 15. Document processing

| Concept | Where | What it means |
|---|---|---|
| **Text extraction** | `pdf_processor.extract_pages` | Pulling characters out of a PDF's internal structure. |
| **★ Text layer** | Why scans fail | A real PDF stores characters. A scan stores a picture of characters — there is nothing to extract. |
| **OCR** | Not implemented | Optical Character Recognition — reading text from images. Your stated limitation and obvious future work. |
| **Fallback strategy** | `pdfplumber` then `pypdf` | Try the better tool, fall back to the simpler one if it fails. |
| **Regex** | `clean_text` | Pattern matching used to strip page numbers and repeated headers. |
| **Why cleaning matters** | Embedding quality | If "Page 23" appears in every chunk, unrelated chunks look artificially similar. |
| **Provenance** | `page_number` | Tracking where content came from so answers can cite it. |

---

## How to prioritise

You cannot learn all of this deeply before your defense. Rank it:

1. **Section 1 in full.** This is your project's contribution. Anything you
   cannot explain here is a real gap.
2. **The ★ items in sections 2, 3, 4, 7, 8.** The professional-practice
   questions: how does auth work, how does the frontend stay in sync, why is
   the code split this way.
3. **Sections 13 and 14.** These separate a student who assembled a project from
   one who engineered it. "Why did you *not* use Celery" is a design question,
   and having an answer is worth more than the feature.
4. **The rest** — recognise the terms and know where they appear. You do not
   need to lecture on Docker networking.

If you can explain **RAG, embeddings, cosine distance, chunking with overlap,
why HNSW over IVFFlat, and the IDOR you fixed**, you can hold a defense on this
project.
