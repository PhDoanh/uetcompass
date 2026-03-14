# Feature Specification: Student Profile Onboarding

**Feature Branch**: `001-profile-onboarding`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "Generate a software requirements specification for the Student Profile Onboarding feature of UETCompass — a personalized learning roadmap system for UET-VNU students."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Onboarding and Receive Roadmap (Priority: P1)

A first-time student logs into UETCompass and is greeted by the onboarding panel. The student selects their major, optionally fills in completed courses and career goals, then submits. The system triggers roadmap generation in the background and notifies the student when the roadmap is ready. The student can continue exploring the system while generation is in progress.

**Why this priority**: This is the core end-to-end value path. Without the ability to submit a profile and receive a roadmap, the feature provides no utility.

**Independent Test**: Can be fully tested by a new student account completing all steps — major selection, at least one optional field, and submission — and confirming that a roadmap-ready notification is received and the onboarding panel no longer reappears.

**Acceptance Scenarios**:

1. **Given** a student logs in for the first time, **When** the homepage loads, **Then** the onboarding panel appears prominently on the page without blocking navigation.
2. **Given** the onboarding panel is open, **When** the student selects a major, **Then** the completed-courses multi-select list is filtered to show only courses belonging to that major.
3. **Given** the student has filled in at least the required major field, **When** the student clicks Submit, **Then** the system accepts the submission, closes the onboarding panel permanently, and triggers roadmap generation asynchronously.
4. **Given** roadmap generation has been triggered, **When** generation completes, **Then** the student receives an in-app notification indicating the roadmap is ready to view.
5. **Given** the student has submitted, **When** the student navigates to the onboarding URL directly, **Then** the system redirects to the homepage.

---

### User Story 2 - Resume an Interrupted Onboarding Session (Priority: P2)

A student begins filling out the onboarding panel but closes it (or their session expires) before submitting. On their next login, the panel reopens automatically with all previously entered data pre-filled, allowing them to continue without re-entering information.

**Why this priority**: Draft persistence is critical to maintaining user trust during a multi-session workflow. Without it, students who are interrupted must restart from scratch, which may cause abandonment.

**Independent Test**: Can be fully tested by partially filling the panel, closing the browser, logging in again, and verifying all previously entered values are restored in the panel.

**Acceptance Scenarios**:

1. **Given** a student has partially filled the onboarding panel, **When** the student closes the panel or navigates away, **Then** all entered data is saved server-side immediately.
2. **Given** a student's session expires mid-fill, **When** the session expires, **Then** the student is redirected to the login page.
3. **Given** the student re-logs in after session expiry, **When** the homepage loads, **Then** the onboarding panel reopens with the draft data fully restored.
4. **Given** a student dismisses the panel without submitting, **When** the student logs in again later, **Then** the panel reappears with the previously saved draft.

---

### User Story 3 - Submit with Minimal Information (Priority: P3)

A student submits the onboarding form with only the required major field filled in, leaving all optional fields empty. The system accepts the submission, generates a generic roadmap, and clearly communicates that personalisation quality is reduced due to missing profile data.

**Why this priority**: Supporting minimal submissions ensures no student is blocked from receiving a roadmap and validates the system's graceful degradation path.

**Independent Test**: Can be fully tested by a new account selecting only a major and submitting, then confirming a roadmap is generated and a low-personalisation notice is displayed.

**Acceptance Scenarios**:

1. **Given** the student has selected a major but left all optional fields empty, **When** the student clicks Submit, **Then** the system does not block submission and accepts the profile.
2. **Given** optional fields are empty at submission, **When** the system processes the submission, **Then** it triggers roadmap generation in generic mode.
3. **Given** a generic roadmap has been generated, **When** the student views the completion notification or their roadmap, **Then** the system clearly communicates that personalisation quality is low and points the student to Settings to enrich their profile.

---

### User Story 4 - Enter Free-Text Career Goals (Priority: P3)

A student whose desired job role or target company type is not in the predefined list enters a custom value using the free-text input. The system validates the input and includes it in the submitted profile.

**Why this priority**: Free-text entry future-proofs the feature for edge-case career goals without requiring constant maintenance of predefined lists.

**Independent Test**: Can be fully tested by entering a custom role and company type, submitting, and verifying the values are accepted and persisted to the profile.

**Acceptance Scenarios**:

1. **Given** the student selects the free-text option for job role or company type, **When** the student types a value, **Then** the input is accepted if it meets minimum length requirements and does not consist solely of special characters or whitespace.
2. **Given** the student enters a value that is too short or consists only of special characters, **When** the student attempts to submit or leaves the field, **Then** the system displays a clear inline validation message without blocking the rest of the form.
3. **Given** a valid free-text value is entered, **When** the student submits, **Then** the custom value is stored as part of the student profile.

---

### Edge Cases

- **Major changed mid-fill**: If a student selects a major, populates completed courses, then changes the major, the system prompts the student before clearing — informing them that their selected courses will be reset — then clears and reloads the course list for the new major.
- **Duplicate submission attempt**: If a student who has already submitted somehow triggers a second submission (e.g., two browser tabs open simultaneously), the system rejects the duplicate and redirects to the homepage.
- **Roadmap generation failure**: If asynchronous roadmap generation fails after submission, the system displays an error notification with a retry action. The submitted profile is preserved; only generation is retried — the student does not need to resubmit.
- **Empty course catalog for selected major**: If a major has no courses seeded yet (edge case during early deployment), the completed-courses field is hidden or shown as empty with an explanatory message; the form remains submittable.
- **Session expires immediately after submission**: The submission is confirmed server-side before expiry. On re-login, the student lands on the homepage (onboarding is permanently closed) and roadmap generation continues in the background.
- **Free-text input with only whitespace**: Whitespace-only inputs in free-text fields are treated as empty and handled the same as no input — they do not pass validation as meaningful content.

---

## Requirements *(mandatory)*

### Functional Requirements

**Onboarding Panel Display**

- **FR-001**: The system MUST display the onboarding panel prominently on the homepage on a student's first login if they have not yet submitted their profile.
- **FR-002**: The onboarding panel MUST be non-blocking — the student MUST be able to dismiss it and navigate the rest of the system freely.
- **FR-003**: The system MUST allow a dismissed panel to be reopened by the student at any time before submission.
- **FR-004**: Once a profile has been submitted, the system MUST permanently prevent the onboarding panel from reappearing.
- **FR-005**: Any direct access to the onboarding URL after submission MUST result in a redirect to the homepage.

**Major & Course Selection**

- **FR-006**: The student MUST select one major from a predefined list before the completed-courses field becomes available.
- **FR-007**: The completed-courses multi-select list MUST display only courses belonging to the student's currently selected major.
- **FR-008**: If the student changes their major selection, the system MUST prompt the student before clearing previously selected courses, then reset the course list to reflect the new major.
- **FR-009**: Only course completion status (completed / not completed) is recorded — no grade or score data is collected or prompted for.

**Career Goal Inputs**

- **FR-010**: The student MUST be able to select a target job role from a predefined list OR enter a custom free-text value if their desired role is not listed.
- **FR-011**: The student MUST be able to select a target company type from a predefined list (Startup, Outsource, Product company, Japanese company, Big Tech) OR enter a custom free-text value.
- **FR-012**: The student MUST be able to specify a graduation timeline as a number of semesters remaining or an expected graduation date.
- **FR-013**: The student MUST be able to enter personal aspirations, constraints, or preferences as free-text.
- **FR-014**: All optional fields MUST be clearly marked as optional, and the system MUST communicate that omitting them reduces personalisation quality.
- **FR-014a**: Career-goal payloads MUST preserve `careerGoal` as a nested object. Any downstream `careerGoalRole` projection MUST be derived from `careerGoal.role` (read-only alias, no separate source-of-truth field).

**Validation**

- **FR-015**: Major selection MUST be the only field required for submission; all other fields are optional.
- **FR-016**: Free-text fields (job role, company type, personal aspirations) MUST be validated client-side and server-side to ensure input meets a minimum character length and is not composed solely of special characters or whitespace. This validation MUST NOT use an LLM.
- **FR-017**: Submitting with all optional fields empty MUST be permitted without error.

**Draft Persistence**

- **FR-018**: All onboarding form inputs MUST be saved server-side in real time as the student fills them in, tied to the student's authenticated account.
- **FR-019**: If the student closes the panel, navigates away, or experiences a session expiry before submitting, the draft MUST be fully preserved server-side.
- **FR-020**: On the student's next login after any interruption, the onboarding panel MUST reopen with all draft data pre-filled.

**Submission & Roadmap Generation**

- **FR-021**: Roadmap generation MUST be triggered only on explicit student submission — not on auto-save or draft persistence events.
- **FR-022**: Roadmap generation MUST execute asynchronously and non-blocking; the student MUST be able to continue using the system while generation is in progress.
- **FR-023**: The system MUST deliver an in-app notification to the student when their roadmap generation completes successfully.
- **FR-024**: If roadmap generation fails, the system MUST display an error notification and provide a retry mechanism without requiring the student to resubmit their profile.
- **FR-025**: The system MUST enforce one profile per student account — duplicate submission attempts MUST be rejected.
- **FR-026**: If a student submits with all optional fields empty, the system MUST generate a generic roadmap and clearly communicate that personalisation quality is low.

**Canonical Data Contract Alignment**

- **FR-029**: Completed-course identity MUST be canonicalized by the pair (`major`, `courseCode`).
- **FR-030**: The system MAY persist `courseUnitId` as an optional optimization field for joins/indexed lookups, but identity semantics MUST remain (`major`, `courseCode`).
- **FR-031**: `privacySetting` MUST NOT be persisted in `StudentProfile`; privacy ownership belongs to `User` (feature 005 account management).

**Session Handling**

- **FR-027**: If a student's session expires while filling in the onboarding panel, the system MUST redirect to the login page.
- **FR-028**: Upon re-login following a session expiry, the system MUST restore the student's draft in the onboarding panel.

---

### Non-Functional Requirements

- **NFR-001 (Data Integrity)**: Draft profile data MUST be persisted atomically — partial saves MUST NOT result in corrupted or inconsistent draft state.
- **NFR-002 (Responsiveness)**: The onboarding panel MUST remain fully interactive during real-time draft saves; save operations MUST NOT block or delay user input.
- **NFR-003 (Security)**: Only the authenticated student may read or modify their own onboarding draft and submitted profile — no cross-account access is permitted.
- **NFR-004 (Privacy)**: No grade, GPA, or transcript data is collected during onboarding; the system MUST NOT prompt for such data.
- **NFR-005 (Validation Safety)**: Free-text input validation MUST be performed without invoking an LLM to avoid latency, cost, and unpredictability in the form validation path.
- **NFR-006 (UX Clarity)**: The system MUST communicate the consequence of leaving optional fields empty (reduced personalisation quality) in a way that is actionable and not anxiety-inducing.

---

### Key Entities

- **StudentProfile**: Represents the student's academic and career profile collected during onboarding. Contains: major selection, list of completed course identifiers, target job role (predefined or free-text), target company type (predefined or free-text), graduation timeline, personal aspirations, submission status (draft / submitted), and timestamps for creation and submission.
- **StudentProfile**: Represents the student's academic and career profile collected during onboarding. Contains: major selection, list of completed courses canonically identified by (`major`, `courseCode`) with optional `courseUnitId`, nested `careerGoal` object (where downstream `careerGoalRole` is derived from `careerGoal.role`), personal aspirations, submission status (draft / submitted), and timestamps for creation and submission. Does **not** contain `privacySetting`.
- **OnboardingDraft**: The intermediate state of the onboarding form before submission. Tied 1:1 to a StudentProfile. Overwritten on each real-time save; promoted to submitted status on explicit student confirmation.
- **Major**: A predefined academic program offered at UET-VNU. Has a unique identifier, a display name, and an associated list of Course entries. Catalog data is pre-seeded by a separate system process.
- **Course**: An academic course belonging to one or more Majors. Has a unique identifier and display name. Used for completed-course multi-select during onboarding. Catalog data is pre-seeded by a separate system process outside this feature's scope.
- **RoadmapGenerationJob**: Represents an asynchronous job to generate a learning roadmap from a submitted StudentProfile. Has a status (pending / in progress / completed / failed) and is linked to the originating StudentProfile.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student can complete onboarding across one or more sessions without losing any previously entered data — draft restoration is fully lossless after any form of session interruption.
- **SC-002**: After submission, roadmap generation is triggered within 5 seconds of submission confirmation, and the student receives an in-app notification upon completion.
- **SC-003**: A student who submits with only the major field filled still receives a roadmap — the system never returns an error or prevents submission due to empty optional fields.
- **SC-004**: Re-accessing the onboarding URL after submission results in a redirect to the homepage 100% of the time — the panel is never displayed post-submission.
- **SC-005**: Roadmap generation can be retried after failure without requiring the student to re-enter or resubmit their profile data.
- **SC-006**: The onboarding panel loads and becomes interactive on first login with no perceptible delay attributable to the panel itself.
- **SC-007**: Students who receive a low-personalisation notice can identify at least one specific optional field to complete in order to improve their roadmap — the notice is actionable, not merely informational.

---

## Assumptions

- The course catalog for all available majors is pre-seeded into the system before any student attempts onboarding (separate feature, out of scope here).
- The predefined lists for job roles and company types are maintained by a system administrator and are available at onboarding time; their content and management are outside the scope of this feature.
- Students are fully authenticated before reaching the onboarding panel — this feature does not handle login, registration, or account creation.
- "Real-time" draft saving is interpreted as save-on-change (debounced) or save-on-blur; exact debounce timing is a technical implementation detail.
- The asynchronous roadmap generation system exists as a separate component; this feature is only responsible for triggering it on submission and displaying its completion or failure notification.
- Pre-implementation policy: no runtime data migration is required for this feature-alignment update; migration/backfill (if needed) is handled as a separate operational activity.

---

## Out of Scope

- Course catalog seeding and CTDT (curriculum) data ingestion
- Playwright-based transcript scraping for automated course detection
- Profile editing after onboarding completion (handled in Settings / Profile page)
- Grade, GPA, or academic performance data collection
- Admin tooling for managing predefined lists (majors, job roles, company types)
