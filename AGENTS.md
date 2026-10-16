# AGENTS.md — Arcade of Alexandria

## Mission

The Arcade of Alexandria is a platform that turns textbooks into video games that teach the material.

A user uploads a PDF. A team of AI agents reads it, works out what it teaches, and builds a playable game that teaches those ideas. The player should come away understanding the material, not just having seen its vocabulary.

## Current focus: one book

Our test case is the algebraic topology textbook at `books/Algebraic Topology.pdf`.

The near-term goal is to work out a multi-agent flow that reliably turns **this one book** into a good teaching game. Once that flow works, we generalize it to any textbook.

When you make a design decision, ask whether it would still work for a different subject, like organic chemistry, contract law, or a history survey. Algebraic topology is the test case, not a special case to hard-code around.

## Long-term vision

- Apply the pipeline to every textbook in the world.
- **Compensate authors.** Revenue the platform earns is shared with the authors of the books their games are built from. This is a core commitment, not a nice-to-have. Every game must carry its source book's metadata (title, authors, edition, and the chapters and pages each piece of content comes from) so revenue can be attributed and paid out.

## The multi-agent flow (draft; expect it to change)

This is a starting sketch. Working out the right flow is the main open problem.

1. **Ingest:** extract text, figures, equations and structure (chapters, sections, definitions, theorems, exercises) from the PDF.
2. **Curriculum:** build a concept graph: what the book teaches, what each idea depends on, and which ideas are core and which are optional.
3. **Pedagogy:** for each concept, decide what the learner must be able to *do* (intuit, compute, prove, recognize) and how that could be tested through play.
4. **Game design:** choose game mechanics that make the concepts the actual gameplay rather than trivia bolted on. For example, homotopy as deforming paths, the fundamental group as loops you can and cannot shrink, or covering spaces as levels that unfold.
5. **Build:** implement the game: code, art and levels.
6. **Verify:** check mathematical and factual accuracy against the source, and check that the game actually teaches (playtesting and learning checks).
7. **Package:** attach source attribution and metadata for author compensation.

Each stage should leave its output as an inspectable artifact (files, JSON, docs) so a human can review it and later stages can be rerun on their own.

## Principles for agents working here

- **Teach, don't decorate.** The mechanics should embody the ideas. A quiz with a game skin is a failure mode.
- **Stay faithful to the source.** The game's content must trace back to the book. Don't invent math, and flag anything that goes beyond the text.
- **Keep attribution.** Never drop the link between game content and the book, chapters and pages it came from.
- **Generalize.** Build pipeline stages that are book-agnostic. Keep anything specific to algebraic topology in config or data, not in pipeline logic.
- **Respect the books.** Uploaded textbooks are copyrighted works. Keep them in `books/` and don't redistribute their raw text outside the platform.

## Repo layout

- `books/`: source textbook PDFs (currently `Algebraic Topology.pdf`)
- `AGENTS.md`: this file
