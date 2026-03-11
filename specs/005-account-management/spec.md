# Feature Specification: Student Account Management

**Feature Branch**: `005-account-management`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Xây dựng tính năng Quản lý Tài khoản cho UETCompass, hỗ trợ đăng ký, đăng nhập, quên mật khẩu và quản lý tài khoản dành riêng cho sinh viên UET."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Register as a New UET Student (Priority: P1)

A UET student visits UETCompass for the first time and creates an account by providing their full name, `@vnu.edu.vn` email, and a password. The system sends a 4-digit OTP to their email. The student enters the OTP within 2 minutes to activate their account. If the student fails to verify in time, the account is locked (not deleted) and the student must request a new OTP to unlock it and complete verification.

**Why this priority**: Without an account, no student can access any feature of UETCompass. Registration is the mandatory entry point for all downstream value — onboarding, roadmap, skill tree.

**Independent Test**: Can be fully tested by registering with a valid `@vnu.edu.vn` email, receiving the OTP, entering it within 2 minutes, and confirming the account is active and accessible for login.

**Acceptance Scenarios**:

1. **Given** the registration form, **When** a student enters their full name, a `@vnu.edu.vn` email, and a valid password and submits, **Then** the system creates a pending account and sends a 4-digit OTP to the provided email.
2. **Given** an OTP has been sent, **When** the student enters the correct OTP within 2 minutes, **Then** the account is activated and the student can proceed to log in.
3. **Given** an OTP has been sent, **When** 2 minutes elapse without the student entering any OTP, **Then** the account is moved to a locked state — not deleted — and the student is notified they must request a new OTP.
4. **Given** an account is locked due to OTP timeout, **When** the student requests a new OTP, **Then** a fresh code is sent and entering it correctly unlocks and activates the account.
5. **Given** the registration form, **When** a student enters an email that does not end in `@vnu.edu.vn`, **Then** the system immediately rejects the input and displays an inline validation error — the form cannot be submitted.
6. **Given** a student submits with an email already associated with an existing account, **When** the system detects the duplicate, **Then** registration is rejected and the student is directed to log in with the existing account instead.

---

### User Story 2 – Log In with Email and Password (Priority: P1)

An existing UET student enters their registered email and password to log in. After a successful login, the system applies the correct post-login flow based on whether the student is a first-time visitor, has a saved onboarding draft, or has already completed onboarding.

**Why this priority**: This is the primary access mechanism for all students. Without it, no authenticated experience is possible.

**Independent Test**: Can be fully tested by logging in with valid credentials and confirming the correct post-login flow triggers based on each of the three onboarding states.

**Acceptance Scenarios**:

1. **Given** a student with a valid, verified account, **When** they enter correct credentials, **Then** the system grants access and applies the appropriate post-login flow.
2. **Given** a student enters incorrect credentials, **When** it is the 1st through 4th consecutive failure, **Then** the system displays a login error without revealing which specific field is wrong.
3. **Given** a student enters incorrect credentials, **When** it is exactly the 5th consecutive failure, **Then** the account is locked for exactly 15 minutes and the student is informed of the lockout duration.
4. **Given** an account is locked, **When** the student attempts to log in before the 15-minute window expires, **Then** the system rejects the attempt and displays the remaining lockout time.
5. **Given** an account is locked, **When** 15 minutes have elapsed, **Then** the lockout is lifted and the student can attempt login again normally.

---

### User Story 3 – Log In with Google (Priority: P1)

A UET student chooses to log in using Google. The system presents a panel listing Google accounts already signed in on the device, with an option to add a new one. The student selects their `@vnu.edu.vn` Google account and the system grants access after validating the email domain.

**Why this priority**: Google Sign-In removes password friction for students who actively use their university Google account, improving accessibility and adoption.

**Independent Test**: Can be fully tested by initiating Google Sign-In, selecting a `@vnu.edu.vn` account, and confirming access is granted with the correct post-login flow.

**Acceptance Scenarios**:

1. **Given** a student initiates Google Sign-In, **When** the panel opens, **Then** all Google accounts currently signed in on the device are listed, plus an option to add a different Google account.
2. **Given** the student selects a Google account with a `@vnu.edu.vn` email, **When** the selection is confirmed, **Then** the system validates the domain and grants access.
3. **Given** the student selects a Google account whose email does not end in `@vnu.edu.vn`, **When** the selection is confirmed, **Then** the system rejects the login attempt and displays a clear error message explaining the domain restriction.
4. **Given** a student uses Google Sign-In with a `@vnu.edu.vn` email that already exists in the system, **When** they sign in, **Then** the system logs them into the existing account — no new account is created.
5. **Given** a student uses Google Sign-In with a `@vnu.edu.vn` email that has no existing account, **When** they sign in, **Then** the system creates a new account and applies the first-login post-login flow.

---

### User Story 4 – Recover Account via Forgot Password (Priority: P2)

A student who has forgotten their password requests a reset. The system sends a 4-digit OTP to their registered email. The student enters the OTP within 2 minutes and sets a new password. For unrecognized emails, the system returns a generic response to prevent account enumeration.

**Why this priority**: Password recovery is an essential accessibility path. Without it, students who forget their credentials are permanently locked out.

**Independent Test**: Can be fully tested by requesting a reset for a known registered email, receiving the OTP, entering it within 2 minutes, setting a new password, and confirming login with the new password succeeds.

**Acceptance Scenarios**:

1. **Given** a student enters a registered email on the forgot-password screen and submits, **When** the request is processed, **Then** the system sends a 4-digit OTP to that email.
2. **Given** a student enters an unrecognized email and submits, **When** the request is processed, **Then** the system displays a generic message (e.g., "If an account exists for this email, a reset code has been sent") — it does not reveal whether an account exists.
3. **Given** a valid OTP has been sent, **When** the student enters it correctly within 2 minutes, **Then** the system allows the student to set a new password immediately.
4. **Given** a valid OTP has been sent, **When** the student enters an incorrect code, **Then** the system records the failure and allows up to 10 wrong attempts before invalidating the current OTP.
5. **Given** a student has made 10 consecutive wrong OTP entries, **When** they attempt an 11th entry, **Then** the OTP is invalidated and the student must request a new one.
6. **Given** a student does not enter the OTP within 2 minutes, **When** they attempt to submit after the expiry, **Then** the OTP is rejected and the student is prompted to request a new code.

---

### User Story 5 – Post-Login Routing by Onboarding State (Priority: P2)

After every successful login — regardless of login method — the system routes the student to the appropriate experience based on their onboarding state: first-time visitor, draft in progress, or onboarding completed.

**Why this priority**: This connects Feature 004 (Account Management) with Feature 001 (Profile Onboarding), ensuring a coherent, uninterrupted end-to-end experience for every student.

**Independent Test**: Can be fully tested using three distinct accounts — one that has never touched onboarding, one with a saved draft, and one that has submitted — and verifying each triggers the correct post-login behavior.

**Acceptance Scenarios**:

1. **Given** a student logs in for the first time and has never interacted with onboarding, **When** the homepage loads, **Then** the Onboarding Panel opens automatically and the student can dismiss it to explore other features.
2. **Given** a student has a saved onboarding draft but has never submitted, **When** they log in again, **Then** the Onboarding Panel reopens with all previously saved draft data fully restored.
3. **Given** a student has completed and submitted onboarding, **When** they log in, **Then** the homepage loads directly with no Onboarding Panel — it does not appear anywhere in the application.
4. **Given** the Onboarding Panel is open and the student dismisses it, **When** they navigate to Account Settings, **Then** they can reopen the panel from that page at any time before submission.
5. **Given** a student has submitted onboarding, **When** they visit Account Settings, **Then** all onboarding fields (major, completed courses, career goal, company type, graduation timeline, personal aspirations) are displayed as editable profile fields — the Onboarding Panel itself is no longer accessible.

---

### User Story 6 – Update Profile and Trigger Roadmap Re-personalization (Priority: P2)

A student who has completed onboarding opens Account Settings and updates their personal information, including fields originally entered during onboarding. The system detects changed onboarding fields, places a "Re-personalize" button in the roadmap view (Feature 003), and delivers an in-app notification with a direct link to navigate to the roadmap.

**Why this priority**: Profile updates enable the skill tree and roadmap to reflect the student's current situation, not just their initial snapshot. Without this feedback loop, the learning path becomes stale.

**Independent Test**: Can be fully tested by updating a career-goal field for an onboarded student, then confirming the "Re-personalize" button appears in the roadmap view and an in-app notification is delivered with a link to the roadmap.

**Acceptance Scenarios**:

1. **Given** a student has completed onboarding, **When** they open Account Settings, **Then** they can edit their full name, profile picture, and all onboarding profile fields.
2. **Given** the student changes one or more onboarding fields and saves, **When** the save is confirmed, **Then** the system detects the change and places a "Re-personalize" button in the roadmap view.
3. **Given** the change is saved, **When** the in-app notification is delivered, **Then** it contains a direct link that navigates the student to the roadmap view.
4. **Given** the student updates only non-onboarding fields (name, avatar), **When** the save is confirmed, **Then** no "Re-personalize" button appears and no re-personalization notification is sent.
5. **Given** a student has not yet completed onboarding, **When** they open Account Settings, **Then** the onboarding profile fields are not shown as editable — only name and profile picture are available.

---

### User Story 7 – Change Password, Manage Google Links, and Delete Account (Priority: P3)

A logged-in student can change their password, link or unlink Google accounts as additional sign-in options, or permanently delete their account following email confirmation.

**Why this priority**: These are secondary self-service capabilities — important for long-term account hygiene and safety, but not essential to the core learning experience.

**Independent Test**: Each sub-action is independently testable: (a) change password and confirm the new one works for login; (b) link a Google account and verify it enables login; (c) request deletion, click the confirmation link, and verify the account and all data are fully removed.

**Acceptance Scenarios**:

1. **Given** a logged-in student selects "Change Password," **When** they enter their current password and a new password, **Then** the system verifies the current password and updates to the new one.
2. **Given** a logged-in student selects "Link Google Account" and completes the flow with a `@vnu.edu.vn` Google account, **When** linking succeeds, **Then** that Google account is saved as an additional sign-in option.
3. **Given** a student has at least one linked Google account, **When** they select "Unlink" for that account, **Then** the account is removed as a sign-in method while all other credentials remain unaffected.
4. **Given** a student requests account deletion, **When** they submit the request, **Then** the system sends a confirmation email with a deletion link — no data is removed yet.
5. **Given** the student clicks the valid deletion confirmation link in the email, **When** the link is processed, **Then** all personal data is permanently removed, the email is marked as deleted, and the student is logged out immediately.
6. **Given** the email was marked as deleted after account deletion, **When** the same email is used to register a new account, **Then** the system allows registration as though the email were new.

---

### User Story 8 – Log Out (Priority: P3)

A logged-in student chooses to log out. The session is terminated immediately with no confirmation dialog.

**Why this priority**: Logout is a fundamental session-security mechanism. It is simple in behavior but must be functionally correct.

**Independent Test**: Can be fully tested by clicking the logout action and confirming the session is immediately ended — the student cannot access any authenticated page without logging in again.

**Acceptance Scenarios**:

1. **Given** a student is logged in, **When** they click the logout action, **Then** the session is terminated immediately with no confirmation prompt.
2. **Given** the session has been terminated, **When** the student attempts to access an authenticated page, **Then** the system redirects them to the login page.

---

### Edge Cases

- **Email domain rejected at registration**: If a student enters an email not ending in `@vnu.edu.vn`, the form rejects it inline before submission — no OTP is sent and no account is created.
- **Google login with non-`@vnu.edu.vn` domain**: The system rejects the selection post-click and displays a domain restriction error — no account is created or accessed.
- **Account locked due to OTP timeout at registration**: The account remains locked indefinitely until the student requests a new OTP. The account is never automatically deleted.
- **Duplicate email across login methods**: A `@vnu.edu.vn` email can belong to at most one account, regardless of how it was registered. Attempting to create a second account with the same email is always rejected.
- **Forgot-password request for unregistered email**: The system always shows a generic response regardless of email existence — account enumeration is never possible.
- **Account locked by 5 failed logins while also needing a password reset**: The student must wait for the 15-minute lockout to expire before the forgot-password flow becomes usable.
- **Deletion confirmation link expired or already used**: The student sees a clear error message; no deletion is performed.
- **"Re-personalize" button ignored by student after profile update**: The button persists in the roadmap view until acted upon — it does not auto-dismiss or reset.

---

## Requirements *(mandatory)*

### Functional Requirements

**Registration**

- **FR-001**: The system MUST only accept email addresses ending in `@vnu.edu.vn` for account registration; all other domains MUST be rejected immediately at the form level without allowing submission.
- **FR-002**: Full name, email, and password MUST all be required fields for registration; the form MUST NOT submit if any of these fields are empty.
- **FR-003**: Upon successful form submission, the system MUST send a 4-digit OTP to the provided email and create the account in a pending (unverified) state.
- **FR-004**: The OTP MUST expire exactly 2 minutes after it is issued; submitting an expired OTP MUST be rejected.
- **FR-005**: If the OTP is not entered within 2 minutes, the account MUST be moved to a locked state and MUST NOT be deleted.
- **FR-006**: A student with a locked (unverified) account MUST be able to request a new OTP; entering it correctly MUST unlock and activate the account.
- **FR-007**: Attempting to register with an email already associated with an existing account MUST be rejected; the student MUST be directed to log in with the existing account.

**Login — Email and Password**

- **FR-008**: The system MUST allow login with a registered `@vnu.edu.vn` email and the corresponding password.
- **FR-009**: The system MUST track consecutive failed login attempts per account and MUST lock the account for exactly 15 minutes after 5 consecutive failures.
- **FR-010**: During a lockout period, all login attempts MUST be rejected and the student MUST be shown the remaining lockout duration.
- **FR-011**: The consecutive failure counter MUST reset to zero after any successful login.

**Login — Google Sign-In**

- **FR-012**: The system MUST present a panel listing all Google accounts currently signed in on the student's device, with an option to add a different Google account.
- **FR-013**: Only Google accounts with a `@vnu.edu.vn` email domain MUST be accepted; all other domain accounts MUST be rejected with a clear error message.
- **FR-014**: If a selected `@vnu.edu.vn` Google account email already exists in the system, the system MUST log the student into the existing account — no duplicate account is created.
- **FR-015**: If a selected `@vnu.edu.vn` Google account email does not exist in the system, the system MUST create a new account and apply the first-login post-login flow.

**Forgot Password**

- **FR-016**: A student MUST be able to initiate a password reset by entering their email address on the forgot-password screen.
- **FR-017**: For any forgot-password submission — whether the email exists or not — the system MUST display a generic response that does not reveal the account's existence.
- **FR-018**: If the email corresponds to an existing account, the system MUST send a 4-digit OTP to that address; the OTP MUST expire after exactly 2 minutes.
- **FR-019**: The system MUST allow up to 10 consecutive wrong OTP attempts before invalidating the OTP and requiring a new one.
- **FR-020**: A student who enters a correct, unexpired OTP MUST be immediately permitted to set a new password.

**Post-Login Flow**

- **FR-021**: On a student's first-ever login, the system MUST automatically open the Onboarding Panel on the homepage; the student MUST be able to dismiss it and continue using the application freely.
- **FR-022**: If a student has a saved onboarding draft but has not submitted, re-login MUST automatically reopen the Onboarding Panel with all draft data fully pre-filled.
- **FR-023**: If a student has completed and submitted onboarding, every login MUST load the homepage directly with no Onboarding Panel appearing anywhere.
- **FR-024**: A student who has not yet submitted onboarding MUST be able to reopen the Onboarding Panel from Account Settings at any time.
- **FR-025**: Once onboarding has been submitted, the Onboarding Panel MUST NOT appear anywhere in the application; all onboarding fields MUST be accessible and editable exclusively through the user profile section of Account Settings.

**Account Settings**

- **FR-026**: A student MUST be able to update their full name and profile picture at any time after account creation.
- **FR-027**: After a student has submitted onboarding, all onboarding profile fields (major, completed courses, target job role, target company type, graduation timeline, personal aspirations) MUST be displayed and editable within Account Settings.
- **FR-028**: When a student saves changes to one or more onboarding profile fields, the system MUST detect the change and place a "Re-personalize" button in the roadmap view (Feature 003).
- **FR-029**: Simultaneously with placing the "Re-personalize" button, the system MUST deliver an in-app notification containing a direct link that navigates the student to the roadmap view.
- **FR-030**: Saving changes to non-onboarding fields (name, avatar) MUST NOT trigger the "Re-personalize" button or any re-personalization notification.
- **FR-031**: A student MUST be able to change their password by entering their current password and a new password; the current password MUST be verified before the change takes effect.
- **FR-032**: A student MUST be able to link one or more Google accounts (with a `@vnu.edu.vn` email) as additional sign-in methods.
- **FR-033**: A student MUST be able to unlink a previously linked Google account; the student's remaining sign-in credentials MUST remain valid after unlinking.
- **FR-034**: A student MUST be able to request account deletion; the system MUST send an email with a confirmation link before any data is removed.
- **FR-035**: Account deletion MUST only execute after the student clicks the valid confirmation link; clicking the link MUST permanently delete all personal data and mark the email as deleted.
- **FR-036**: Once an email is marked as deleted, it MUST be eligible for use in a new account registration.

**Logout**

- **FR-037**: The system MUST terminate the student's session immediately upon logout with no confirmation step required.
- **FR-038**: After logout, every attempt to access an authenticated route MUST redirect the student to the login page.

---

### Non-Functional Requirements

- **NFR-001 (Security)**: Student passwords MUST be protected such that they cannot be recovered or read back in plaintext by anyone, including system administrators.
- **NFR-002 (Security)**: The forgot-password response MUST be indistinguishable regardless of whether the email exists, to prevent account enumeration attacks.
- **NFR-003 (Privacy)**: No history of previous passwords is surfaced to the user; only internal audit records are maintained.
- **NFR-004 (Isolation)**: Only the authenticated student may read or modify their own account data — cross-account access by other students MUST NOT be possible.
- **NFR-005 (Consistency)**: A single `@vnu.edu.vn` email address MUST be associated with at most one student account at any time, regardless of which login method was used to create it.

---

### Key Entities

- **StudentAccount**: Represents a UET student's account. Key attributes: full name, `@vnu.edu.vn` email, password credential, account status (pending-verification / active / locked / deleted), list of linked Google accounts, creation timestamp, last login timestamp.
- **EmailVerificationToken**: A one-time 4-digit OTP issued at registration. Attributes: code, expiry (2 minutes from issue), owning account reference, status (pending / used / expired).
- **PasswordResetToken**: A one-time 4-digit OTP issued for password recovery. Attributes: code, expiry (2 minutes from issue), email it was requested for, consecutive wrong-attempt count (resets at 10), status (pending / used / expired).
- **LoginAttemptRecord**: Tracks consecutive failed login attempts per account, used to enforce the 5-failure lockout and the 15-minute lockout timer.
- **LinkedGoogleAccount**: A `@vnu.edu.vn` Google account linked to a StudentAccount as an additional sign-in method. Multiple can exist per StudentAccount.
- **AccountDeletionToken**: A time-limited, single-use link sent by email to confirm account deletion. Deletion MUST NOT proceed without this token being validated.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Email addresses not ending in `@vnu.edu.vn` are rejected immediately at the registration form and the Google Sign-In domain check — no OTP is ever sent and no account is ever created for a non-`@vnu.edu.vn` address.
- **SC-002**: OTP codes expire exactly 2 minutes after issue; accounts that fail to verify within this window are locked (not deleted) and remain locked until a new OTP is successfully used.
- **SC-003**: After exactly 5 consecutive failed login attempts, the account is locked for exactly 15 minutes; no login succeeds during this window regardless of credential correctness.
- **SC-004**: On every first-ever login, the Onboarding Panel opens automatically on the homepage; the student can dismiss it without losing any progress and can reopen it from Account Settings at any time before submission.
- **SC-005**: Account deletion is only executed after the student clicks the email confirmation link; 100% of personal data is permanently removed and the email is immediately eligible for re-registration.
- **SC-006**: When onboarding profile fields are updated in Account Settings, the "Re-personalize" button appears in the roadmap view and an in-app notification with a direct roadmap link is delivered within 5 seconds of the save being confirmed.
- **SC-007**: A student with an incomplete onboarding draft always sees their complete draft restored in the Onboarding Panel on every subsequent login — zero data is lost across sessions or interruptions.

---

## Assumptions

- All students accessing UETCompass are affiliated with UET-VNU and hold a `@vnu.edu.vn` email address; no other account types (admin, advisor, guest) are in scope for this feature.
- The Onboarding Panel described in FR-021 through FR-025 is implemented by Feature 001 (Profile Onboarding); this feature is only responsible for triggering its display, pre-fill, dismissal, and permanent closure based on login state.
- The "Re-personalize" button described in FR-028 is rendered by Feature 003 (Skill Tree); this feature is responsible for signaling the need for it when onboarding fields change.
- Email delivery for OTP codes and account deletion confirmation depends on an external email delivery mechanism; delivery reliability and timing are outside the scope of this feature.
- Google Sign-In relies on the Google account selection panel to surface accounts already signed in on the student's device; the list of accounts shown is determined by the student's browser or device state, not by this system.
- No two-factor authentication (2FA) beyond OTP-based email verification is required at this time.
- A "session" ends when the student explicitly logs out or when the system detects expiry; the exact session lifetime is a deployment configuration detail outside this spec's scope.

---

## Out of Scope

- Admin, advisor, or any non-student account types.
- Transcript or GPA import at account creation time — handled by a separate feature.
- Management of predefined onboarding lists (job roles, company types, majors) — maintained outside this feature.
- The Onboarding Panel form fields, validation, and submission logic — defined in Feature 001 (Profile Onboarding).
- The roadmap "Re-personalize" button rendering and re-personalization execution logic — defined in Feature 003 (Skill Tree).
- Rate limiting on OTP resend requests beyond the lock/unlock mechanism described in FR-006.
- Social sign-in methods other than Google.
