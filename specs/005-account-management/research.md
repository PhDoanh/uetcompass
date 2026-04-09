# Research: Student Account Management

**Feature**: `005-account-management`
**Date**: 2026-04-09
**Status**: Complete

## Decision 1: Entry Guard Delegates to Feature 011-authentication

- Decision: All Feature 005 pages and APIs require authenticated + UET-verified user context supplied by Feature 011-authentication. Feature 005 does not duplicate auth/domain-verification logic.
- Rationale: Avoids duplicated security logic and keeps module boundaries clear. Also aligns with spec scope that excludes login/registration/forgot-password flows.
- Alternatives considered:
  - Re-check UET verification in every Feature 005 handler (rejected: duplication and drift risk).
  - Add separate session mechanism for account management (rejected: violates simplicity and existing architecture).

## Decision 2: Soft Delete for Account Deletion

- Decision: Deletion flow is email-confirmed soft delete, not hard delete. Confirmation token is single-use and time-limited.
- Rationale: Meets product requirement for recoverability while still revoking access immediately after confirmation.
- Alternatives considered:
  - Immediate delete without email confirmation (rejected: high-risk accidental deletion).
  - Hard delete on confirmation (rejected: conflicts with requested soft-delete policy).

## Decision 3: Password Change Security Baseline

- Decision: Password change requires current password verification and records audit event `PASSWORD_CHANGED`.
- Rationale: Prevents session hijack abuse where an active session could change password silently without proof of current secret.
- Alternatives considered:
  - Change password from session alone (rejected: weaker security posture).
  - OTP-required password change every time (rejected: out of current feature scope and UX friction).

## Decision 4: Unified Identity Rendering and Privacy Enforcement

- Decision: All identity rendering uses fallback order: `displayName -> fullName -> sanitized email local-part -> "Student"`. Public surfaces must respect `privacySetting`.
- Rationale: Guarantees consistent display and prevents accidental exposure when `privacySetting = anonymous`.
- Alternatives considered:
  - Let each screen decide fallback independently (rejected: inconsistent behavior and privacy leakage risk).
  - Remove fullName from fallback entirely (rejected: reduces usability for identified users).

## Decision 5: Audit Events for Sensitive Changes

- Decision: Emit immutable account audit events for `PROFILE_UPDATED`, `PASSWORD_CHANGED`, `ACCOUNT_DELETION_REQUESTED`, `ACCOUNT_SOFT_DELETED`.
- Rationale: Supports operational incident analysis and aligns with NFR auditability requirement.
- Alternatives considered:
  - Store only latest state without event trail (rejected: no forensic history).
  - Log everything as free-text application logs (rejected: poor queryability and inconsistent schema).
