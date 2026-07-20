# Callysto M0 proof package

This standard-library package is an executable local proof of selected Milestone 0 contracts. It
is not the production converter, renderer, worker, or queue implementation.

The package covers deterministic cell IDs, default-deny non-executing conversion behavior, and a
SQLite reference model for lease and draft-generation fencing. See
[`docs/evidence/M0.6.md`](../../docs/evidence/M0.6.md) for the verified evidence and the deployment
boundaries that remain open.
