# REST API Contract: Account Management

**Feature**: `005-account-management`
**Date**: 2026-04-09
**Base path**: `/api/account`

## Access Preconditions

All endpoints in this contract require:
- Valid authenticated session/token.
- UET-verified account state from Feature 011-authentication.

If preconditions fail, API returns `401 UNAUTHORIZED` or `403 FORBIDDEN` per auth middleware policy.

## Common Conventions

Authenticated request headers:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Common error codes:
- `INVALID_INPUT` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_ERROR` (500)

## GET /api/account/profile

Returns Account Settings payload for current user.

### 200 OK

```json
{
  "identity": {
    "email": "student@vnu.edu.vn",
    "displayName": "anhdev",
    "fullName": "Nguyen Van A",
    "privacySetting": "identified",
    "avatarUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "effectiveDisplayName": "anhdev"
  }
}
```

### 401/403

Returned when missing auth context or user is not UET-verified by Feature 011-authentication.

## PATCH /api/account/profile

Updates account profile fields owned by current user.

### Request body

```json
{
  "displayName": "anhdev",
  "fullName": "Nguyen Van A",
  "privacySetting": "anonymous",
  "avatarUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

Rules:
- Identity fields are always editable by owner.
- `avatarUrl` accepts hosted URL or image Data URL generated from frontend `Import Image`; delete-image action sends empty/null avatar state.

### 200 OK

```json
{
  "message": "Profile updated",
  "profile": {
    "email": "student@vnu.edu.vn",
    "displayName": "anhdev",
    "fullName": "Nguyen Van A",
    "privacySetting": "anonymous",
    "avatarUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "effectiveDisplayName": "anhdev"
  }
}
```

## POST /api/account/password/change

Changes current user's password.

### Request body

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

Rules:
- `newPassword` must be at least 8 characters and include at least one letter, one number, and one special character.

### 200 OK

```json
{
  "message": "Password changed successfully"
}
```

### 400 INVALID_INPUT

Invalid new password format/policy.

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "New password must be at least 8 characters and include letters, numbers, and special characters",
    "details": {
      "field": "newPassword"
    }
  }
}
```

### 403 FORBIDDEN

Current password does not match.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Current password is incorrect"
  }
}
```

## Security and Privacy Contract Clauses

- Ownership: server uses authenticated subject id only; client-provided user id must be ignored.
- Identity rendering fallback order is canonical:
  1. valid `displayName`
  2. `fullName`
  3. sanitized email local-part
  4. `"Student"`
- With `privacySetting=anonymous`, public surfaces must not expose raw `fullName` unless viewer is owner.
