"""Proposal-only local proof modules for Callysto M0.

Keep package initialization inert.  In particular, importing the converter's
``conversion`` module must not pull the SQLite state proof or any future
orchestrator-only dependency into the credential-free child process.
"""
