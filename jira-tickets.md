# Speak90 Backend Jira Tickets

## Epic: Ticket 30 Backend Sync Endpoints Integration

### MVP-only endpoint subset (reduced scope)

- `POST /v1/auth/device-session`
- `GET /v1/config/flags`
- `POST /v1/consents/audio-cloud`
- `GET /v1/consents/audio-cloud`
- `PUT /v1/user/settings/backup`
- `GET /v1/user/settings/backup`
- `POST /v1/audio/uploads`
- `GET /v1/audio/uploads`
- `PUT /v1/progress`
- `GET /v1/progress`

### Deferred from MVP

- `DELETE /v1/audio/uploads/:uploadId`
- `POST /v1/audio/uploads/purge`
- `PUT /v1/srs/cards/bulk`
- `GET /v1/srs/cards`
- `POST /v1/srs/reviews`
- `POST /v1/sessions/complete`
- `POST /v1/analytics/events`

## Premium Gating Policy (Required)

### Goal

Keep the app free for core local learning. Cloud features are premium-only.
Premium cloud audio is stored for 90 days to match the 90-day program.

### Free Tier (allowed)

- Local-only session flow
- On-device recording/playback
- Local progress, local SRS, local reminders
- `POST /v1/auth/device-session`
- `GET /v1/config/flags`
- `PUT /v1/progress`
- `GET /v1/progress`

### Premium Tier (required entitlement)

- Cloud recording upload + restore list
- Cloud audio processing/STT endpoints
- Cross-device backup/restore features
- Cloud consent endpoints used for upload/processing workflows
- Premium cloud audio is stored for 90 days to match the 90-day program

### Backend Enforcement Rules

- Validate entitlement on premium endpoints before processing request.
- If user is not premium, return:
  - HTTP `403`
  - error code `PREMIUM_REQUIRED`
  - stable message for client UX fallback
- Never upload/process cloud audio for non-premium users.
- Keep local-only app mode fully functional when premium is absent.

### Premium-guarded endpoints

- `POST /v1/audio/uploads`
- `GET /v1/audio/uploads`
- `DELETE /v1/audio/uploads/:uploadId`
- `POST /v1/audio/uploads/purge`
- `POST /v1/consents/audio-cloud`
- `GET /v1/consents/audio-cloud`
- Any future cloud STT endpoint (`/v1/stt/*`)

### Acceptance Criteria (Premium policy)

- Non-premium users can complete sessions with no backend upload failure blocking UX.
- Premium users can upload/list cloud recordings successfully.
- API tests assert `403 PREMIUM_REQUIRED` for non-premium requests on gated endpoints.
- Client displays clear upgrade/local-only fallback on premium-required responses.
- Premium cloud audio is stored for 90 days to match the 90-day program.
