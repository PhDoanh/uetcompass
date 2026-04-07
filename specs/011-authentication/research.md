# Research: UET Authentication and Access Control Update

**Feature**: `011-authentication`
**Date**: 2026-04-07
**Status**: Complete

## Decision 1: Guest Access Model

- Decision: Guest is strictly anonymous and has no authenticated session/token.
- Rationale: Simplifies authorization boundary and reduces accidental privilege leakage.
- Alternatives considered:
  - Guest token/session model (rejected: unnecessary complexity and larger attack surface).
  - Hybrid guest token model (rejected: inconsistent semantics for public-only use cases).

## Decision 2: Public/Private Boundary Enforcement

- Decision: Exactly three capabilities are public (sample roadmap, public shared roadmap, feedback submit); all others are private.
- Rationale: Keeps product exposure explicit and testable; aligns with AC1-AC3.
- Alternatives considered:
  - Pattern-based public route matching only (rejected: brittle and less auditable than explicit allow-list).

## Decision 3: UET Domain Enforcement Strategy

- Decision: Enforce `@vnu.edu.vn` server-side for both email-password and Google login.
- Rationale: Client-side validation alone is bypassable; server-side checks are authoritative.
- Alternatives considered:
  - Client-only domain checks (rejected: insecure).

## Decision 4: Google Login Branching

- Decision: Valid `@vnu.edu.vn` Google identity follows deterministic branching: existing account -> login; non-existing account -> create+login; non-`@vnu.edu.vn` -> deny and do not create account.
- Rationale: Meets explicit FR-007/008/009 with clear no-side-effect deny path.
- Alternatives considered:
  - Always create account on first Google login attempt (rejected: breaks existing-account contract).

## Decision 5: OTP Resend Limits

- Decision: OTP resend uses dual limits: max 10/hour per account and max 10/hour per IP, deny when either exceeded; cooldown is 2 minutes.
- Rationale: Combines account abuse control with network-level abuse mitigation.
- Alternatives considered:
  - Account-only throttling (rejected: weak against distributed account probes from shared networks).
  - IP-only throttling (rejected: can penalize legitimate users behind shared IP).

## Decision 6: OTP Wrong Attempt Policy

- Decision: Wrong OTP verification attempts are uncapped during OTP TTL; only expiry ends verification window.
- Rationale: Matches clarified product decision and keeps behavior simple and predictable.
- Alternatives considered:
  - Fixed wrong-attempt cap per OTP (rejected by clarification).

## Decision 7: Password Reset Session Behavior

- Decision: Successful password reset invalidates only the current session/device.
- Rationale: Matches clarification and avoids forced logout across all devices.
- Alternatives considered:
  - Invalidate all sessions (rejected by clarification).

## Decision 8: Audit Event Baseline

- Decision: Mandatory events are persisted for `signup`, `login_success`, `login_fail`, `otp_send`, `otp_resend`, `otp_verify_fail`, `password_reset_success`, `google_login_denied_domain`.
- Rationale: Provides minimum traceability set requested by spec while avoiding excessive logging.
- Alternatives considered:
  - Free-form logs without typed event catalog (rejected: poor queryability and weak acceptance-testability).
