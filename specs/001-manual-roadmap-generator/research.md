# Research Findings: Manual Roadmap Generator

## Tech Stack Decision
**Decision**: Node.js 20 LTS + Express.js backend, React 18 frontend, MongoDB + Mongoose 8 storage, js-yaml for parsing, Monaco Editor for YAML editing, Cytoscape.js for graph visualization, Jest for testing.

**Rationale**: Consistent with existing UETCompass architecture (Features 003, 009). Node.js cold-start acceptable for manual creation. Monaco provides VS Code-like YAML editing. Cytoscape purpose-built for DAG visualization. Free-tier compatible.

**Alternatives Considered**: TypeScript (adds complexity), Vue/Svelte (violates consistency), D3.js (higher learning curve), PostgreSQL (fragments data architecture), Next.js SSR (unnecessary for manual creation).

## YAML Input & Validation Best Practices
**Decision**: Multi-layer validation with js-yaml (safe parsing) + ajv (JSON Schema) + domain-specific checks (cycles, prerequisites).

**Rationale**: Satisfies FR-002 validation requirement. Provides clear error messages with suggestions. Prevents injection attacks. Handles size limits (1MB cap).

**Alternatives Considered**: YAML schema (limited errors), Zod/Yup (verbose), validation in renderer (late feedback), Monaco-only (no server-side).

## Graph Visualization Patterns
**Decision**: @xyflow/react (React Flow) v12 with Dagre layout algorithm.

**Rationale**: Consistent with Feature 004 (Skill Tree). Purpose-built for DAGs. React-native integration. Proven for prerequisite visualization.

**Alternatives Considered**: D3.js (low-level, verbose), Cytoscape.js (rejected for consistency), Mermaid (read-only, no editing), ELK (overkill).

## Testing Strategies
**Decision**: Unit tests for YAML parsing, graph generation, sharing logic. Integration tests for API endpoints. E2E tests for critical user flows (create, share, edit).

**Rationale**: Constitution requires unit tests for complex logic. Free-tier deployment needs reliable validation. Focus on business logic over UI.

**Alternatives Considered**: Full coverage (unnecessary), no E2E (misses integration bugs), TDD only (overkill for MVP).

## Concurrent Actions & Versioning Best Practices
**Decision**: Copy-on-write (fork) pattern with snapshots at publish time. Debounced auto-save (1s). No real-time collaboration.

**Rationale**: Avoids WebSocket complexity on free tier. Prevents DB contention. Simple UX with user-owned versions. Snapshots ensure immutable shares.

**Alternatives Considered**: Optimistic locking (races on cold starts), pessimistic locking (needs Redis), operational transformation (overkill), CRDTs (complexity), full version history (storage limits).

## UX Patterns for Code Editors with Visual Preview
**Decision**: Split-pane layout (resizable horizontal), real-time validation (500ms debounce), asynchronous graph rendering (Web Worker), hierarchical error feedback, responsive design (tabs on mobile), accept/reject save flow.

**Rationale**: Proven by Monaco, CodePen, VS Code. Instant feedback accelerates 5-minute success criteria. Handles cold starts gracefully. Prevents UI freezing.

**Alternatives Considered**: Tabbed layout (context switching), modal preview (blocks editing), synchronous rendering (freezes UI), single modal errors (overwhelming), force split on mobile (unusable).