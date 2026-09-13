# Review rules

Adapted from hulymcp's review rules and Dalph's newer review/development rules.

- Review concrete behavior against the issue. Assert required counts, order,
  identity and absence in tests; a matching final state is insufficient.
- Keep validation at boundaries, pass parsed values inward, and represent
  expected failures as data. Keep time, scheduling and effects outside pure models.
- Use discriminated unions for mutually dependent fields. Reuse domain types
  instead of widening them to primitives. Avoid speculative abstractions.
- Keep rules that must change together local: defaults, numeric bounds,
  conversion rules and lifecycle ordering. Prefer one implementation to comments
  asking callers to remember a protocol.
- Remove redundant comments and unused internal code. Public library exports
  may serve external callers; document their purpose instead of deleting them.
- Eliminate casts and non-null assertions where narrowing can prove the fact.
  An unavoidable boundary cast needs a precise justification. `as const` is fine.
- Use deterministic clocks and schedulers for timing tests. Keep randomized
  properties in `*.property.spec.ts`; test behavior, not compiler guarantees.
- Prefer `const`; keep mutation confined to explicit state owners or local
  accumulators. Do not add import-time I/O or hidden mutable singletons.
- Preserve stronger compiler/lint gates. Do not hide new findings with broad
  exclusions or suppressions. Format authored code consistently.
- Keep documentation and PR descriptions concise. Omit work logs and repeated
  descriptions of what the code already says.
