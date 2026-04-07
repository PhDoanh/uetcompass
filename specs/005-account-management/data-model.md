# Data Model: Student Account Management

**Feature**: `005-account-management`
**Date**: 2026-04-07
**Dependencies**: Feature 011-authentication (auth + UET verification), Feature 001 (onboarding state)

## Entity: StudentAccount (`users`)

Purpose: Primary account aggregate for authenticated UET students using Account Management.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | yes | PK | |
| `email` | String | yes | Unique, lowercase | Managed by auth feature, used for identity fallback and deletion email confirmation |
| `displayName` | String\|null | no | Trimmed, length 1-120 when present | Primary public identity |
| `fullName` | String | yes | Trimmed, non-empty | Owner-visible personal name |
| `privacySetting` | Enum | yes | `identified` \| `anonymous` | Default `identified` |
| `avatarUrl` | String\|null | no | Valid URL when present | |
| `passwordHash` | String | yes | Non-reversible hash | Updated via password change flow |
| `status` | Enum | yes | `active` \| `soft-deleted` | Soft delete blocks access |
| `softDeletedAt` | Date\|null | no | Null unless deleted | |
| `createdAt` | Date | yes | Immutable | |
| `updatedAt` | Date | yes | Updated on mutation | |

Validation rules:
- `displayName` empty after trim is treated as absent.
- `privacySetting = anonymous` affects data exposure on public surfaces, not owner view.
- Ownership scope is enforced by authenticated user id from Feature 011-authentication context.

## Entity: OnboardingProfileView (`student_profiles`, owned by Feature 001)

Purpose: Provide onboarding completion status and onboarding-derived fields to Account Settings behavior.

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId | yes | FK to users |
| `isDraft` | Boolean | yes | `true` means onboarding not completed |
| `major` | String\|null | no | Editable only when onboarding completed |
| `completedCourseIds` | ObjectId[] | no | Editable only when onboarding completed |
| `careerGoal.role` | String\|null | no | Editable only when onboarding completed |
| `careerGoal.companyType` | String\|null | no | Editable only when onboarding completed |
| `graduationTimeline` | String\|null | no | Editable only when onboarding completed |
| `personalAspirations` | String\|null | no | Editable only when onboarding completed |

Behavioral mapping in Account Settings:
- If no profile or `isDraft=true`: onboarding section returns `mode=cta` and includes action metadata to open Onboarding Panel.
- If `isDraft=false`: onboarding section returns `mode=editable` and exposes onboarding-derived fields.

## Entity: AccountDeletionToken (`account_deletion_tokens` or embedded on `users`)

Purpose: Email confirmation token for soft delete execution.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `userId` | ObjectId | yes | Indexed | |
| `tokenHash` | String | yes | Single-use | Hash of raw token delivered via email link |
| `expiresAt` | Date | yes | Time-limited | Expired tokens cannot execute deletion |
| `usedAt` | Date\|null | no | Null until consumed | Replay-safe |
| `createdAt` | Date | yes | Immutable | |

State transitions:
- `issued` -> `consumed`: valid confirmation click.
- `issued` -> `expired`: current time passes `expiresAt`.
- `consumed` cannot transition again.

## Entity: AccountAuditEvent (`account_audit_events`)

Purpose: Immutable security/event trail for sensitive account actions.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `eventType` | Enum | yes | `PROFILE_UPDATED`, `PASSWORD_CHANGED`, `ACCOUNT_DELETION_REQUESTED`, `ACCOUNT_SOFT_DELETED` |
| `metadata` | Object | no | Changed fields, request id, actor context |
| `createdAt` | Date | yes | |

## API View Model: AccountSettingsPayload

Returned by account profile read endpoint.

| Field | Type | Description |
|---|---|---|
| `identity` | object | `displayName`, `fullName`, `privacySetting`, `avatarUrl`, `effectiveDisplayName` |
| `onboardingSection.mode` | enum | `cta` or `editable` |
| `onboardingSection.fields` | object\|null | Populated only when `mode=editable` |
| `onboardingSection.action` | object\|null | Populated only when `mode=cta`, includes `type=openOnboardingPanel` |

## Key Invariants

- Only authenticated + UET-verified users from Feature 011-authentication can access these models via Feature 005 APIs.
- Soft-deleted accounts are authorization-denied for all authenticated product routes.
- Public identity rendering must apply fallback order consistently:
  1. valid `displayName`
  2. `fullName`
  3. sanitized email local-part
  4. `"Student"`
