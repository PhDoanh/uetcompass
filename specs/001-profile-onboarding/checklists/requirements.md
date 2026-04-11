# Specification Quality Checklist: Student Profile Onboarding

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-03-07
**Feature**: [spec.md](../spec.md)

---

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **FR-016** references "client-side and server-side" validation. This remains an architectural integrity/UX requirement (quick feedback at point-of-entry, authoritative validation at API boundary), not a technology choice.
- **FR-006/006a/009a/009b/009c** are now explicitly data-contract aligned with feature 002: major display from `programs.nameEN`, curriculum link from `programs.source.url`, and completed-course options from `course_units` filtered by (`programId`, `type = "elective"`).
- **SC-002** includes a "within 5 seconds" trigger window — this is observable and measurable from the student's perspective (submission confirmed → background job starts) and does not prescribe internal implementation.
- All four user stories are independently testable and deliverable as slices of value.
- Zero [NEEDS CLARIFICATION] markers were needed — the feature description provided sufficient detail for all decisions; reasonable defaults covered the remaining gaps (documented in Assumptions).
- **Status**: ✅ All items pass. Specification is ready for `/speckit.plan`.

---

## Manual Acceptance Execution Log (T036)

**Executed on**: 2026-03-15  
**Executor**: GitHub Copilot  
**Scope**: US1, US2, US3, US4 end-to-end implementation conformance against `spec.md` + `contracts/rest-api.md`

### Environment & Method

- Method used: static/manual verification from implemented source code, API contract alignment, and editor diagnostics.
- Editor diagnostics: no active Problems for implemented files.
- Runtime automation note: root workspace currently has no `test` script in [package.json](../../../package.json), so `npm test` at workspace root is not available.

### Story-Level Outcomes

- [x] **US1 — Complete onboarding + async notification**
	- Evidence: [backend/src/modules/onboarding/onboarding.controller.js](../../../backend/src/modules/onboarding/onboarding.controller.js), [backend/src/modules/onboarding/onboarding.service.js](../../../backend/src/modules/onboarding/onboarding.service.js), [backend/src/modules/onboarding/onboarding.sse.js](../../../backend/src/modules/onboarding/onboarding.sse.js), [backend/src/modules/onboarding/onboarding.email.js](../../../backend/src/modules/onboarding/onboarding.email.js), [frontend/src/features/onboarding/OnboardingPanel.jsx](../../../frontend/src/features/onboarding/OnboardingPanel.jsx), [frontend/src/features/onboarding/useRoadmapStatus.js](../../../frontend/src/features/onboarding/useRoadmapStatus.js)
- [x] **US2 — Draft persistence + restore + session-expiry redirect**
	- Evidence: [backend/src/modules/onboarding/onboarding.controller.js](../../../backend/src/modules/onboarding/onboarding.controller.js), [backend/src/modules/onboarding/onboarding.service.js](../../../backend/src/modules/onboarding/onboarding.service.js), [frontend/src/features/onboarding/useOnboardingDraft.js](../../../frontend/src/features/onboarding/useOnboardingDraft.js), [frontend/src/features/onboarding/useRoadmapStatus.js](../../../frontend/src/features/onboarding/useRoadmapStatus.js)
- [x] **US3 — Major-only submit + low-personalisation + retry wiring**
	- Evidence: [backend/src/modules/onboarding/onboarding.service.js](../../../backend/src/modules/onboarding/onboarding.service.js), [frontend/src/features/onboarding/OnboardingPanel.jsx](../../../frontend/src/features/onboarding/OnboardingPanel.jsx), [frontend/src/services/roadmap.api.js](../../../frontend/src/services/roadmap.api.js)
- [x] **US4 — Dropdown-only career-goal selection + option validation**
	- Evidence: [backend/src/modules/onboarding/onboarding.validation.js](../../../backend/src/modules/onboarding/onboarding.validation.js), [frontend/src/features/onboarding/CareerGoalForm.jsx](../../../frontend/src/features/onboarding/CareerGoalForm.jsx)

### Contract/Data Consistency Outcomes

- [x] Nested `careerGoal` preserved in persistence + API path.
- [x] Canonical completed-course identity by (`major`, `courseCode`) with optional `courseUnitId`.
- [x] `privacySetting` not included in onboarding profile schema.
- [x] Major dropdown source aligned to `programs.nameEN`.
- [x] "Các môn học bắt buộc" link target aligned to `programs.source.url` of selected program.
- [x] Completed-course selector source aligned to `course_units` filtered by selected `programId` and `type = "elective"`.

### Final T036 Decision

- [x] Manual acceptance checklist executed and outcomes recorded.
- **Result**: ✅ T036 accepted.
