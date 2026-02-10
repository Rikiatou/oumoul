# Oumoul's App Monorepo

Companion app for Muslim women offering worldwide prayer guidance, Ramadan make-up planning, dhikr, tafsir, and family support. The workspace is a pnpm-powered monorepo housing mobile (Expo), web (Next.js), and backend (NestJS) projects with shared UI/config packages.

## Stack
- **Package manager:** pnpm 8
- **Tooling:** Turborepo, TypeScript, ESLint/Prettier, Husky + lint-staged
- **Frontend:**
  - Mobile – Expo (React Native) + NativeWind
  - Web – Next.js 16 + Tailwind
- **Backend:** NestJS 11, JWT auth, Swagger docs
- **Shared packages:** UI design tokens, configuration metadata

## Workspace layout
```
apps/
  mobile/   # Expo app
  web/      # Next.js web client
  backend/  # NestJS API service
packages/
  ui/       # Shared design tokens
  config/   # App metadata & feature flags
```

## Prerequisites
- Node.js 20+
- pnpm `8.15.x`
- Expo CLI (optional for device testing)

## Installation
```bash
pnpm install
```

## Environment variables
Copy `.env.example` to `.env` and adjust for your environment:
```bash
cp .env.example .env
```
Key backend values:
- `OUMOUL_API_URL` – base URL consumed by clients
- `PORT` – API server port (default 3333)
- `JWT_ACCESS_TOKEN_SECRET` / `JWT_ACCESS_TOKEN_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS` – hashing cost (defaults to 10)

## Running the apps
```bash
# Web client
pnpm dev:web

# Mobile (Expo)
pnpm dev:mobile

# Backend API
pnpm dev:backend
```
Backend Swagger UI is available at `http://localhost:3333/api/docs` by default.

## Backend auth endpoints
Auth is backed by Prisma (PostgreSQL). Requests require Bearer tokens returned from the register/login endpoints.

### Register
**POST** `/api/auth/register`
```http
Content-Type: application/json

{
  "firstName": "Amina",
  "lastName": "Diallo",
  "email": "amina@example.com",
  "password": "securePass123",
  "locale": "fr"
}
```
Response
```json
{
  "user": {
    "email": "amina@example.com",
    "firstName": "Amina",
    "lastName": "Diallo",
    "locale": "fr"
  },
  "accessToken": "<JWT>"
}
```

### Login
**POST** `/api/auth/login`
```http
Content-Type: application/json

{
  "email": "amina@example.com",
  "password": "securePass123"
}
```
Successful responses mirror the register endpoint with a fresh `accessToken`.

### Swagger doc session
- Navigate to `http://localhost:3333/api/docs`
- Authorize with the issued bearer token to exercise protected endpoints (prayer & fasting routes).

## Fasting tracker endpoints
All endpoints require the `Authorization: Bearer <accessToken>` header. Replace `:id`, `:planId`, `:entryId` with resource identifiers provided by the API responses.

### Upsert fasting log
**POST** `/api/fasting/logs`
```http
Content-Type: application/json

{
  "date": "2025-03-12",
  "status": "EXEMPTION",
  "notes": "Exemption religieuse"
}
```

### List fasting logs
**GET** `/api/fasting/logs?startDate=2025-03-01&endDate=2025-03-31`

### Update fasting log
**PATCH** `/api/fasting/logs/<logId>`
```http
Content-Type: application/json

{
  "status": "MADE_UP",
  "notes": "Rattrapé" }
```

### Delete fasting log
**DELETE** `/api/fasting/logs/<logId>`

### Get active make-up plan
**GET** `/api/fasting/plans/active`

### Create make-up plan
**POST** `/api/fasting/plans`
```http
Content-Type: application/json

{
  "strategy": "MondaysThursdays",
  "targetDays": 6,
  "title": "Plan de rattrapage" }
```

- Optional `scheduledDates` array can be supplied for custom/white-day plans.

### Update make-up plan entry
**PATCH** `/api/fasting/plans/<planId>/entries/<entryId>`
```http
Content-Type: application/json

{
  "status": "Completed",
  "notes": "Jeûne terminé" }
```

### Deactivate make-up plan
**PATCH** `/api/fasting/plans/<planId>/deactivate`

### Summary overview
**GET** `/api/fasting/summary`

Returns aggregate counts for each fasting status and the outstanding make-up days remaining.

## Reminder preferences
Reminders run through a BullMQ queue backed by Redis (`REDIS_URL`). Start a Redis instance (e.g., Docker `redis:7-alpine`) before launching the backend:

```bash
docker run --name oumoul-redis -p 6379:6379 redis:7-alpine
```

### List preferences
**GET** `/api/reminders/preferences`

```http
Authorization: Bearer <JWT>
```

### Update preference
**PUT** `/api/reminders/preferences/<type>`

Valid types: `AfterEid`, `WeeklyMonday`, `WeeklyThursday`, `Monthly`, `Custom`.

```http
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "isEnabled": true,
  "sendTime": "06:30"
}
```

`sendTime` is optional `HH:MM` (24h). Disabling a preference removes the scheduled queue job.

## Scripts
- `pnpm lint` – run workspace lint tasks
- `pnpm test` – run all configured tests (backend only for now)
- `pnpm build` – build all apps/services

## Next steps
1. Apply Prisma migrations to your target database (`pnpm --filter backend exec prisma migrate deploy`).
2. Build Ramadan tracker UI (mobile & web) consuming fasting endpoints.
3. Add reminder notifications (weekly/after Eid) using background workers.
4. Implement remaining modules: dhikr streaks, tafsir downloads, family profiles, ads & monetization flows.
