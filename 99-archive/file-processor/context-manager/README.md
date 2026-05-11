Context Manager
===============

Overview
- This folder hosts agents and tooling responsible for maintaining and coordinating the lifecycle, structure, and health of the context-managed project.
- It includes lightweight automation agents designed to keep the repository tidy and to prepare handoffs between stages.

Folder Structure (high level)
- agents/
  - entropy-guardian.md  - Entropy Guardian Agent description (file system hygiene, cleanup, dedup, health reports)
  - handoff-specialist.md - Handoff Specialist Agent description (generate/parse handoff docs)
- (other metadata files such as QUICKSTART.md, TROUBLESHOOTING.md may exist)

How to Use
- Read the agent documents under agents/ to understand their responsibilities and interfaces.
- Use the provided trigger instructions in each agent doc to run or simulate actions.
- If you introduce new agents, keep a similar README in the new folder to describe purpose, usage patterns, and interfaces.

Notes on Readme reuse
- If a folder already contains a README, reuse it as the canonical reference.
- For new folders, this README should summarize purpose, structure, and how to extend.

References
- entropy-guardian.md  (Entropy Guardian Agent)
- handoff-specialist.md (Handoff Specialist Agent)

End of file
