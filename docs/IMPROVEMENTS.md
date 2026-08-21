# What to Improve, Ranked

Ordered by marks gained per hour spent. Do them top-down and stop when you run
out of time — the ordering is the useful part, not the length of the list.

**I don't know your marking rubric.** This is judgement from what distinguishes
strong engineering projects generally. If your department publishes criteria,
that beats anything here.

---

## The uncomfortable truth first

**More features will not win you this.** Almost every capstone reaches for one
more feature; almost none bring measurements. A project with five features and
evidence beats one with fifteen and "it works."

Right now your project's honest status is *"I built a RAG system and it appears
to work."* Every item in Tier 1 turns that into *"I built a RAG system and here
is what it measurably does."* That is the whole difference.

An examiner cannot tell whether your retrieval is good by watching three
questions in a demo. They can read a number.

---

## Tier 0 — Fix before anything else (under an hour)

### 0.1 There is no `requirements.txt` ⚠️

**113 packages installed, none recorded in git.** Anyone who clones your repo
cannot run it. For a submitted project this is a real failure, and it is the
first thing a technical marker will hit.

```bash
cd backend
../venv/bin/pip freeze > requirements.txt
git add requirements.txt && git commit -m "Pin Python dependencies"
```

Then check it honestly: delete the venv on a spare copy, reinstall from the
file, run the tests. If that fails, your submission is not reproducible.

**Cost:** 10 minutes. **Risk of skipping:** high — this is a marks-losing gap,
not a nice-to-have.

### 0.2 A README that starts from zero

Yours is good but assumes the Docker container and venv already exist. Write
the sequence a stranger runs on a fresh machine, then follow it yourself
literally. Every capstone author believes their setup instructions work.

---

## Tier 1 — Evidence (this is what actually wins)

### 1.1 Build an evaluation set and report a number ★★★

The single highest-value thing left.

Write **50 questions** from your real syllabus with the answers you expect.
Include roughly:
- 30 clearly answerable from the PDF
- 10 with answers spread across two sections
- 10 genuinely absent, where refusing is the correct behaviour

Run all 50. Score each **correct / partly correct / wrong / wrongly refused**.
Report the percentage.

Then — the part almost nobody does — **look at the failures and say what caused
each one.** Retrieval missed it? Chunk boundary split the answer? Threshold too
strict? That analysis is worth more than the score itself.

> "The system answers 84% of syllabus questions correctly. Of the 8 failures,
> 5 were retrieval misses where the answer spanned a chunk boundary, which
> suggests a larger overlap would help."

That sentence sounds like an engineer. "It works well" sounds like a student.

**Cost:** a day, mostly writing questions. **Value:** transforms the defense.

### 1.2 Compare against a no-RAG baseline ★★★

Ask the *same 50 questions* directly to Gemini with no retrieval and no
syllabus. Count how many answers are confidently wrong or invent content that
is not in your syllabus.

This directly answers *"why not just use ChatGPT?"* — the question you will
definitely be asked — with data instead of an assertion. It is also cheap: you
already have the provider abstraction, so it is a loop over the same questions
with the retrieval step skipped.

**Cost:** 2 hours once 1.1 exists. **Value:** very high. This is your headline
result.

### 1.3 Automate the grounding check ★★

We did this by hand for one answer: extract every factual claim, check each
against the retrieved chunk text, report the fraction traceable to source.
Eleven of eleven passed.

Make it repeatable across your evaluation set and you can state a
**hallucination rate**. For a project whose entire premise is grounding, this
is the most on-topic measurement you can produce.

**Cost:** half a day. **Value:** high, and unusual.

### 1.4 Ablation: does 300 words beat 150 or 450? ★★

Re-ingest the same PDF at three chunk sizes, run your evaluation set against
each, report which retrieved best.

This is genuine experimental method — hypothesis, controlled variable,
measurement, conclusion. It also justifies your parameter choice with evidence
rather than "the tutorial said 300."

**Cost:** 3 hours once 1.1 exists. **Value:** high, and it reads as research.

---

## Tier 2 — Demo impact (visible in the five minutes that count)

### 2.1 Show the retrieved chunks in the UI ★★★

The data is **already stored** in `Message.citations` — you only need to render
it. Add a collapsible "show retrieved passages" under each answer with the
chunk text and distance.

Why this matters: your best argument is invisible right now. Examiners see an
answer and a page number. Let them see the actual passages the answer came
from, and the abstract claim becomes concrete on screen.

**Cost:** 2 hours. **Value:** the best demo-value-per-hour on this list.

### 2.2 A retrieval visualisation

A simple horizontal bar per retrieved chunk showing its distance, with the 0.7
threshold marked. One glance communicates what a paragraph of explanation
cannot, and it makes your threshold choice self-evident.

**Cost:** 2 hours. **Value:** high for a live demo, low otherwise.

### 2.3 Stream the answer

Answers currently appear all at once after ~2 seconds. Streaming them token by
token feels dramatically faster even though the total time is identical.

**Cost:** half a day (server-sent events through Django and the proxy).
**Value:** moderate — pure polish, but it is the polish people notice.

---

## Tier 3 — Features that genuinely matter here

### 3.1 OCR for scanned PDFs ★★★

**Check this before deciding anything else on this list.** Many TU syllabus
PDFs are scans of printed pages. If yours are, this is not a nice-to-have — it
is the difference between a project that works on real course material and one
that works only on the files you happened to pick.

Use `pytesseract` in `pdf_processor.py`: when text extraction returns nothing,
render each page to an image and OCR it. Your code already detects the
no-text-layer case and fails cleanly, so there is a clear place to add it.

**Cost:** a day. **Value:** removes your largest stated limitation — but only
matters if your real documents need it. Test one first.

### 3.2 Nepali language support ★★

Your embedding model (`all-MiniLM-L6-v2`) is English-trained, so Nepali
passages retrieve poorly. A multilingual model such as
`paraphrase-multilingual-MiniLM-L12-v2` is a drop-in replacement — same
sentence-transformers interface, though a different dimension count, so
`EMBEDDING_DIMENSIONS` and the migration change with it.

For a Tribhuvan University project, "it works with Nepali-language material" is
a contextually strong claim. Measure it with a small Nepali question set rather
than asserting it.

**Cost:** half a day plus re-ingestion. **Value:** high *if* your material is
bilingual, near zero if not.

### 3.3 Re-ranking

Retrieve 8 chunks, re-rank with a cross-encoder
(`cross-encoder/ms-marco-MiniLM-L-6-v2`), keep the best 4. Cross-encoders read
the question and passage together, so they judge relevance better than vector
distance alone.

Only worth doing **after** 1.1, so you can prove it helped. Otherwise it is
complexity you cannot justify.

**Cost:** half a day. **Value:** moderate, and it demonstrates reading beyond
the basic tutorial.

---

## Tier 4 — Skip these

Named explicitly so you do not spend time on them:

| Idea | Why not |
|---|---|
| Dark mode, avatars, notifications | Zero marks. Pure time sink. |
| Deploying to a server | You stated local-only. Deployment adds failure modes on demo day and no marks. |
| A mobile app | Enormous effort, unrelated to your contribution. |
| Switching to a paid model | You would be defending a cost you did not need. |
| More LLM providers | The abstraction already proves the point. A fourth adds nothing. |
| Rewriting the frontend in another framework | Reviewers grade what it does, not which framework. |

---

## The report and the presentation

Most departments weight the written report heavily, and it is where technical
students lose the most marks.

**Include these, because they are your differentiators:**

1. **The architecture diagram** — the two-pipeline drawing. Put it early.
2. **Your evaluation results** with the failure analysis (Tier 1).
3. **The three defects you found and fixed** in the original design. Write these
   up properly. They demonstrate engineering judgement, not typing.
4. **Design decisions with alternatives rejected** — HNSW over IVFFlat,
   background thread over Celery, and *why*. Show the trade-off, not just the
   choice.
5. **Limitations, stated plainly.** Every one you name yourself is one an
   examiner cannot catch you out with.

**For the presentation:** lead with the live contrast — one syllabus question
answered with citations, one off-syllabus question refused. That thirty seconds
communicates your entire contribution better than any slide.

---

## If you only do three things

1. **`requirements.txt`** — 10 minutes, closes a real gap.
2. **The 50-question evaluation with failure analysis** — one day, and it is
   what separates the top project from the rest.
3. **Show retrieved chunks in the UI** — two hours, and it makes your strongest
   argument visible on screen.

Everything above Tier 3 is optional. Those three are not.
