# INTENT.md - Callysto Notebooks

*What this is, why it exists, and what it is NOT.*

---

## The Core Idea

Science publishes results. Nobody checks the math.

Published studies contain data analyses, statistical models, and computational claims — but the notebooks behind them are either not shared, shared as static PDFs, or dumped in a GitHub repo nobody ever opens. There is no standard place to:

- Run the actual calculations yourself
- See if the methodology holds up
- Comment on a specific step
- Propose a better approach
- Fork and test a variation

Callysto is that place.

---

## What Callysto Is

An open platform for publishing Jupyter notebooks — where every notebook is a living, executable, reviewable document.

The starting point is **reproducibility**: take a published study, rebuild its analysis as a notebook, publish it on Callysto, and let the community run it, comment on it, fork it, and improve it. Over time, the best notebooks become canonical references — the kind of thing you cite alongside the original paper.

---

## Core User Flow

1. **Publish** — Submit a notebook (upload .ipynb, paste GitHub URL, or connect a GitHub repo). Add title, description, tags, and link to the original study if applicable.

2. **Read** — Anyone can browse and read notebooks, rendered clearly with outputs shown.

3. **Comment** — Leave inline comments on specific cells, calculations, or outputs. Like a code review, but for analysis.

4. **Fork** — Copy any notebook to your own profile and modify it. Run your version of the calculations. Publish your fork as a linked derivative.

5. **Run** — Execute notebooks directly in your browser — no server required. Powered by Pyodide (Python compiled to WebAssembly), the full scientific Python stack runs on your machine. Modify inputs, rerun cells, explore variations. Nothing leaves your browser.

6. **Vote** — Upvote notebooks and comments for visibility. The best rises, the noise sinks.

---

## The Reproducibility Angle

The primary use case at launch: **replicate the data science behind published studies**.

This is valuable because:
- Reproducibility failures in science are rampant and mostly invisible
- Most researchers lack the time or tooling to audit others' analyses
- Making replication easy and social changes the incentives
- A "verified replication" badge on a notebook is genuinely meaningful signal

Callysto doesn't need to solve all of science. It just needs to make one thing easy: *here is the analysis, run it yourself, tell me what you think.*

---

## Core Analogies

| Platform | What Callysto borrows |
|----------|-----------------------|
| GitHub | Public profiles, forking, version history |
| arXiv | Open publishing, citable, permanent links |
| Wikipedia | Collaborative improvement, community ownership |
| Hacker News | Voting, signal surfacing, quality filter |
| Jupyter | Notebook format, execution |
| Code Review | Inline cell-level comments, structured feedback |

---

## What It Is NOT

- Not a Jupyter hosting service (you don't do your primary work here)
- Not a replacement for JupyterHub, Colab, or Binder
- Not a private tool (public-first; institutional private spaces come later)
- Not a blogging platform (notebooks are first-class objects, not embedded content)
- Not a journal (no gatekeeping, no editorial board, no paywalls)

---

## Who It's For

**Primary users:**
- Data scientists who want to share work and get real feedback
- Researchers who want to publish reproducible analyses alongside their papers
- Analysts who want to replicate or challenge published findings

**Secondary users:**
- Learners who want high-quality, reviewed, executable tutorials
- Educators who want to assign or distribute interactive analyses

**Later:**
- Research labs and universities who want institutional presence and private workspaces

---

## The Name

Callysto — variant spelling of Callisto, one of Jupiter's Galilean moons. Jupiter = Jupyter. Callisto is described as "the safest and most stable location in the Jovian system" and "the ideal site for a future human outpost." That's the vibe: a stable, permanent, trusted home for analytical work.

The spelling variant (Callysto) is more brandable — avoids trademark conflicts, visually evokes *catalyst*, *crystal*, *colab*, *Jupyter*. Easier to own as a brand long-term.

---

## Principles

1. **Executable first.** A notebook you can run is worth more than one you can only read.
2. **Open by default.** Everything public unless explicitly private. The open web > walled gardens.
3. **Reproducibility as a value.** Replicating someone's analysis is a contribution, not a critique.
4. **Community signal over editorial gatekeeping.** Quality rises through votes and forks, not approval queues.
5. **Long-term stability.** Notebooks should be citable forever. No link rot. No disappearing repos.
