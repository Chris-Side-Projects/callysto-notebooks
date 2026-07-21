# Callysto M0 proof package

This standard-library package is an executable local proof of selected Milestone 0 contracts. It
is not the production converter, renderer, worker, or queue implementation.

The package covers deterministic cell IDs, default-deny non-executing conversion behavior, a
minimized launcher/child process and hostile sentinel proof, and a SQLite reference model for lease
and draft-generation fencing. The launcher accepts only the exact success/error child-result
schemas. A direct-child test independently demonstrates the child's own secret/descriptor cleanup,
and the complete transitive project-local converter module set is statically audited. These local
process checks do not claim OS- or container-enforced network denial. See
[`docs/evidence/M0.6.md`](../../docs/evidence/M0.6.md) for the verified evidence and the deployment
boundaries that remain open.
