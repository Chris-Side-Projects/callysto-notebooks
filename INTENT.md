# INTENT.md - Callysto Notebooks

*What this is, why it exists, and what it is NOT.*

---

## The Problem

Jupyter notebooks are the dominant medium for data analysis, research, and computational communication — but they have no native publishing or review layer.

Today, sharing a notebook means:
- Pasting a GitHub link (no commenting, no review workflow)
- Uploading to nbviewer (read-only, no discussion)
- Publishing a blog post (loses interactivity, loses reproducibility)
- Submitting to arXiv (heavyweight, academic-only, no iteration)

There is no place that is simultaneously:
- Open and publicly browsable
- Commentable and improvable by the community
- Version-aware (the notebook can be updated, forks tracked)
- Low-friction to submit

---

## The Idea

Callysto is that place.

A notebook commons where:
1. Anyone can publish a notebook
2. Anyone can comment, suggest improvements, or fork
3. Notebooks are versioned and linked (like a living document)
4. Quality rises over time through community review
5. The best analyses become canonical references

---

## Core Analogies

| Platform | What Callysto borrows |
|----------|-----------------------|
| GitHub | Versioning, forking, public profiles |
| arXiv | Open publishing, citable, permanent |
| Wikipedia | Collaborative improvement, community ownership |
| Hacker News | Signal surfacing, community quality filter |
| Jupyter | Execution format, rendering |

---

## What It Is NOT

- Not a notebook execution environment (no running code in-browser, at least initially)
- Not a replacement for Jupyter/JupyterHub/Colab
- Not a private/enterprise product (public-first)
- Not an academic journal (no gatekeeping, low friction)
- Not a blogging platform (notebooks are first-class, not embedded)

---

## Who It's For

**Primary:** Data scientists, researchers, analysts who want to share work and get feedback

**Secondary:** Learners who want to find high-quality, reviewed, executable analyses

**Tertiary:** Organizations that want their analytical work to be public and citable

---

## The Name

Callysto — a variant of Callisto, one of Jupiter's Galilean moons. Jupiter's moons = Jupyter notebooks. Callisto is described as "the safest place in the Jovian system" and "geologically quiet" — fitting for a platform meant to be a stable, durable, reliable home for analyses.

The spelling variant (Callysto) keeps the sound, avoids direct trademark conflicts, and visually evokes words like catalyst, crystal, colab, and Jupyter.

---

## Open Questions (to resolve with Chris before building)

- [ ] Notebook rendering: iframe embed vs full re-render vs static HTML export?
- [ ] Execution: read-only only, or sandboxed execution later?
- [ ] Auth: GitHub OAuth only, or broader?
- [ ] Submission flow: paste URL, upload file, or GitHub-connected?
- [ ] Review model: open comments, structured review, or both?
- [ ] Monetization: none, optional donations, institutional plans?
- [ ] Scope: notebooks only, or expand to datasets / models / scripts later?
- [ ] Community model: fully open, or curated/moderated queue?
