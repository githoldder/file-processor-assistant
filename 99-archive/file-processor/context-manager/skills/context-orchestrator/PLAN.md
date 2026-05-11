Context Orchestrator Plan
=======================

Objective
- Systematically tidy the repository structure and ensure README presence across folders, reusing existing READMEs where present.

Current state snapshot (high level)
- ROOT contains updated READMEs and AGENTS.md guidance.
- context-manager/README.md and context-manager/agents/README.md exist and are reused.
- k8s/README.md added to document Kubernetes artifacts.

Execution outline
- Step 1: Inventory folders and README presence
- Step 2: For each folder without a README, generate a templated README.md (ASCII only)
- Step 3: Consolidate references and ensure consistency in terminology and structure
- Step 4: Produce a summary handoff document (handoff-out.json)
- Step 5: Prepare for next phase (handoff to Handoff Specialist)

Output format considerations
- All outputs should use relative paths when referencing files
- JSON outputs must be parseable; Markdown should have clear headings and structure
- Maintain a change log in README or a dedicated CHANGELOG if needed

Next phase
- Hand off to: handoff-specialist for creating a formal handoff document and updating context history
- Prepare: phase-output json for the Initiate/Execute steps

End of PLAN
