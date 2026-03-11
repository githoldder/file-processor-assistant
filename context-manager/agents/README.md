Agents in Context Manager
========================

- This directory houses autonomous agents that help keep the project structure clean, organized, and ready for handoffs across stages.
- Current documented agents:
  - entropy-guardian.md: Entropy Guardian Agent responsible for automated housekeeping (temp file cleanup, deduplication, structure optimization, health reporting).
  - handoff-specialist.md: Handoff Specialist Agent focused on generating and parsing structured handoff documents to ensure clear stage-to-stage information transfer.

Usage patterns
- Read the agent doc (entropy-guardian.md or handoff-specialist.md) to understand purpose and interfaces.
- Trigger actions via the described commands or API endpoints in those docs (where applicable).
- When adding new agents, mirror this README to describe purpose, capabilities, and interfaces.

Extending this folder
- Add a new agent file (e.g., new-agent.md) and update this README with a brief description and usage notes.
- Maintain a consistent structure across agent docs for ease of discovery and handoffs.

Reference
- entropy-guardian.md
- handoff-specialist.md
