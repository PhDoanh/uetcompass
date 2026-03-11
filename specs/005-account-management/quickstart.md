# Developer Quickstart: Student Account Management

**Feature**: `005-account-management`
**Date**: 2026-03-11
**Branch**: `005-account-management`

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | Bundled with Node 20 |
| MongoDB | Local instance **or** [MongoDB Atlas](https://cloud.mongodb.com) free cluster | |
| Gmail account | Any | Enable 2FA + generate an [App Password](https://myaccount.google.com/apppasswords) |
| Google OAuth Client ID | — | See "Google OAuth setup" section below |
| Git | Any | Branch: `005-account-management` |

---

## 1. Clone and branch

```bash
git clone https://github.com/PhDoanh/uetcompass.git
cd uetcompass
git checkout 005-account-management
```

---

## 2. Google OAuth Client setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add to **Authorized JavaScript origins**: `http://localhost:5173`
4. Add to **Authorized redirect URIs**: `http://localhost:5173` (for popup flow, no redirect needed — but GIS requires origin registration)
5. Copy the **Client ID** — you will need it for both `.env` files below

---

## 3. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/uetcompass
# or: mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret_min_32_chars
REFRESH_TOKEN_SECRET=your_refresh_token_secret_min_32_chars

# Gmail SMTP (Nodemailer) — for OTP and deletion confirmation emails
GMAIL_USER=your.address@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx   # 16-char App Password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
# → Express listening on http://localhost:3001
```

---

## 4. Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local` (never commit this file):

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Wrap the app root with `GoogleOAuthProvider` (already done if Feature 001 structure is in place):

```jsx
// frontend/src/main.jsx
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <AuthProvider>
    <App />
  </AuthProvider>
</GoogleOAuthProvider>
```

Start the frontend dev server:

```bash
npm run dev
# → Vite serving React app at http://localhost:5173
```

---

## 5. Verify the setup end-to-end

### 5a. Register a new account

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Student","email":"test@vnu.edu.vn","password":"TestPass123!"}'
# Expected: 201 Created with "OTP sent" message
# Check Gmail inbox for the 4-digit OTP
```

### 5b. Verify OTP

```bash
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vnu.edu.vn","otp":"XXXX"}'
# Expected: 200 OK "Email verified successfully"
```

### 5c. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@vnu.edu.vn","password":"TestPass123!"}'
# Expected: 200 OK with accessToken + onboardingState: "NEVER_STARTED"
# cookies.txt now holds the httpOnly refresh token cookie
```

### 5d. Silent refresh

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt -c cookies.txt
# Expected: 200 OK with new accessToken
```

### 5e. Logout

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt -c cookies.txt
# Expected: 204 No Content; rt cookie cleared
```

---

## 6. Manual test: OTP expiry lockout

1. Register a new account
2. Do NOT verify — wait 2 minutes
3. Attempt to verify with the original OTP → expect `423 ACCOUNT_LOCKED_UNVERIFIED`
4. Call `POST /api/auth/resend-otp` with the email → new OTP sent
5. Verify with new OTP → account activates normally

---

## 7. Manual test: Login lockout

```bash
# Use a verified account; send wrong password 5 times consecutively
for i in 1 2 3 4 5; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@vnu.edu.vn","password":"WrongPassword!"}'
done
# 5th attempt: expect 423 ACCOUNT_LOCKED with remainingSeconds
```

---

## 8. Manual test: Re-personalization signal

Requires Feature 001 to have been completed (onboarding submitted) for the test account.

```bash
# 1. Login and get access token
ACCESS_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" -c cookies.txt \
  -d '{"email":"test@vnu.edu.vn","password":"TestPass123!"}' | jq -r .accessToken)

# 2. Update a profile field (onboarding field)
curl -X PATCH http://localhost:3001/api/account/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile":{"major":"Software Engineering"}}'
# Expected: 200 OK; StudentProfile.repersonalizationPending should now be true

# 3. Check unread notifications
curl http://localhost:3001/api/notifications?read=false \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# Expected: notification of type REPERSONALIZE
```

---

## 9. Run unit tests

```bash
cd backend
npm test -- --testPathPattern=tests/unit/auth
```

Expected test files and coverage:

| Test file | What it covers |
|---|---|
| `auth.service.test.js` | OTP generation, expiry check, account lock/unlock, duplicate email |
| `token.service.test.js` | RT rotation, reuse detection, family revocation, AT issue |
| `password.service.test.js` | bcrypt hash + verify, login failure counter, 5-attempt lockout |
| `profileSettings.service.test.js` | Onboarding field diff detection, `repersonalizationPending` flag set/skip |

---

## 10. Feature dependency note

This feature depends on the `student_profiles` collection having the `repersonalizationPending` field. If Feature 001 has not yet been deployed, add it to the schema manually or run the migration:

```bash
# One-off migration (add repersonalizationPending: false to all existing documents)
cd backend
node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    await db.collection('student_profiles').updateMany(
      { repersonalizationPending: { \$exists: false } },
      { \$set: { repersonalizationPending: false } }
    );
    console.log('Migration complete');
    process.exit(0);
  });
"
```
