# speak90-backend

## Setup

1. Create `.env` with:

```env
DATABASE_URL=postgresql://<user>@127.0.0.1:5432/speak90
JWT_SECRET=dev-secret
DEPLOYMENT_ENV=dev
```

2. Run migrations:

```bash
npm run migrate
```

3. Start server:

```bash
npm run dev
```

## Database Schema

Initial schema is in `migrations/001_init_schema.sql` and includes:

- Auth/session: `device_sessions`
- Flags: `feature_flags`
- Consent/settings: `user_consents`, `user_settings`
- Cloud uploads: `recording_uploads`, `retention_jobs`
- Progress/SRS: `user_progress`, `srs_cards`, `srs_reviews`, `session_completions`
- Analytics: `analytics_events`
- Premium purchases: `purchases`, `receipt_verifications`, `entitlements`
- Migration tracking: `schema_migrations`
