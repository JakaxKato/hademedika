# Workflow

- Wants the agent to analyze the existing codebase/context first and only then execute changes; explicitly opens the task with "analisa terlebih dahulu lalu eksekusi" (analyze first, then execute). Confidence: 0.8
- Prefers iterative refinement of an existing codebase over a from-scratch rebuild; frames work as a "refinement pass, not a complete redesign" that preserves the strongest existing parts. Confidence: 0.75
- Favors scoped, reviewable improvements (small focused changes) rather than wholesale rewrites. Confidence: 0.6
