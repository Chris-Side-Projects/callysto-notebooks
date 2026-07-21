# Callysto intent

## The problem

Computational claims are often published as prose while the analysis that produced them sits in a notebook somewhere else, if it is shared at all. When a notebook is available, the reader commonly gets one of four weak experiences:

- a static render with no contextual discussion;
- raw notebook JSON or a repository that assumes Git fluency;
- an execution environment with no durable review record;
- a paper-level comment that cannot point to the calculation in question.

This makes it unnecessarily hard to inspect a method, challenge an assumption, explain a correction, or see how the analysis changed after review.

## The wedge

Callysto is a public review layer for notebook-based computational claims.

An author publishes a specific, immutable notebook source version. A reader can inspect the cells and saved outputs in a safe derived view, attach a discussion to a stable cell, distinguish an owner response from reviewer resolution, and see how the author responds in a later version.

The product starts with inspectability and review. Execution comes later because executing arbitrary uploaded code is a different product and a much larger security and operations problem.

## Product promise

For every published notebook version, Callysto should make five things obvious:

1. **What artifact am I looking at?** The source notebook, owner, version, content digest, publication time, and license.
2. **What claim is it connected to?** The paper, report, dataset, or external source the author says it supports or examines.
3. **What did Callysto verify?** Format validity and successful safe rendering, never scientific correctness unless a distinct review process establishes it.
4. **What are reviewers saying?** Notebook-level and cell-level discussions with authorship, timestamps, and resolution state.
5. **What changed?** A durable lineage from one immutable version to the next without moving old comments onto new content.

## Primary users

- Researchers publishing analysis behind a paper or preprint.
- Data scientists and analysts publishing an audit or replication.
- Reviewers who need to question a particular method, cell, assumption, or output.

Secondary users are educators and learners consuming reviewed notebook explanations. Institutional workspaces are a later product, not a launch requirement.

## The first job to be done

> “I have a notebook behind a real claim. I want to publish a stable version so other people can inspect the actual analysis and give feedback in context, without requiring them to clone a repository or configure an environment.”

## Principles

1. **Claims are not verification.** “Uploaded,” “rendered,” “author-reported,” and “independently reproduced” are different states and must never be collapsed into a single badge.
2. **Immutable evidence, visible revision.** Published source bytes and version metadata never change. Corrections create a new version. A security-fixed derived render may supersede an unsafe projection only through a visible audited render revision.
3. **Contextual review is the wedge.** The product is differentiated by durable review attached to notebook structure, not by rendering alone.
4. **Open access, attributable participation.** Reading is public. Publishing and commenting require an authenticated identity.
5. **Untrusted by default.** Uploaded notebooks and their HTML, JavaScript, images, metadata, and links are hostile input until proven otherwise.
6. **No silent failure.** Rendering, publishing, comment anchoring, and external-source failures must have named states visible to users and operators.
7. **Portable artifacts.** Authors can download their original notebook, metadata, and review record. Callysto must not become the only copy.
8. **Standards before invention.** Preserve Jupyter format semantics, cell IDs, SPDX license identifiers, ORCID identity rules, and common environment files.
9. **Accessibility belongs in the contract.** Application chrome targets WCAG 2.2 AA. User-supplied notebook content may not comply, and the product must say so plainly.
10. **Prove demand before compute.** Do not add arbitrary code execution, complex repository sync, or institutional administration until the review loop shows repeated use.

## What Callysto is not

- Not a primary notebook editor or replacement for JupyterLab, VS Code, Colab, or Deepnote.
- Not a general Git forge.
- Not a promise that a rendered notebook is reproducible.
- Not a journal, editorial board, or scientific correctness oracle.
- Not an anonymous file host.
- Not a server-side code execution service in the initial release.
- Not a place to publish private, restricted, secret, personally identifying, or unlawfully shared data.

## Twelve-month direction

If the pilot works, Callysto becomes a durable public record for executable analysis:

```text
TODAY                         PILOT                         12-MONTH DIRECTION
green scaffold + M0 proofs -> immutable notebook review -> version lineage, forks,
                                                          reproducibility evidence,
                                                          portable review exports,
                                                          selective execution links
```

The twelve-month direction is a trajectory, not current scope. Each added capability must strengthen the publishing and review record rather than turn Callysto into a generic notebook host.

## Naming

Callysto is a spelling variant of Callisto, one of Jupiter’s Galilean moons. The Jupiter/Jupyter reference is a private layer of meaning, not the product explanation. The public brand should lead with the job it performs: open review for computational work.
