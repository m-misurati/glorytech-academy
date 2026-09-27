# GloryTech Academy — platform and codebase brief

A self-contained description of what exists today, written so someone with no access to
the repository can reason about it. Current as of 27 September 2026.

---

## 1. What it is

A bilingual (Arabic RTL / English LTR) learning platform, live at
**https://academy.glorytech.ly**, run by a single instructor — a CCIE-certified network
engineer in Libya — teaching networking, security, cloud and DevOps.

Today it carries two free courses (CCNA 1 with 18 lessons, CCNA 4 with 11), about 29
hours of 1080p video, and roughly 30 registered students in its first days. Everything
runs on free tiers.

The owner wants to grow it into a full product: paid courses, online payment through a
Libyan gateway, and a proper instructor platform where several instructors upload their
own material and see their earnings over chosen periods.

---

## 2. Architecture

Four independent pieces. There is no application server of our own in the request path
for the website itself.

```
Browser
  │
  ├─ static site ──────────► LibyanSpider cPanel (shared hosting, Apache)
  │                          React SPA built by Vite; .htaccess does the SPA fallback
  │
  ├─ auth + data ──────────► Supabase (hosted Postgres + GoTrue auth + PostgREST)
  │                          email OTP sign-in, all tables, RLS, SECURITY DEFINER RPCs
  │
  └─ video ────────────────► Cloudflare Worker (glorytech-academy.*.workers.dev)
                             mints signed stream tokens, proxies byte ranges
                                    │
                                    └──► Google Drive (the actual mp4 files)
```

**Why this shape.** The owner already pays for cPanel hosting, which cannot run Node.
Supabase gives auth and Postgres with row-level security for free. Video could not sit
on cPanel (bandwidth) and could not be linked from Drive directly (anyone could copy the
link and redistribute the course), so a Worker sits in front of Drive and hands out
short-lived signed URLs.

**Deployment is manual.** `npm run package:cpanel` builds the site and produces
`glorytech-site.zip`; the owner uploads it in cPanel File Manager and extracts it. The
Worker deploys with `npx wrangler deploy`. Database changes are SQL files pasted into
the Supabase SQL editor. There is no CI, no staging environment, and no automated tests
beyond a Postgres migration harness.

---

## 3. Stack

- React 18, React Router 7, Vite 8 (rolldown), Tailwind CSS (class-based dark mode,
  CSS-variable colour tokens), lucide-react icons.
- `@supabase/supabase-js` is the only runtime dependency beyond React. No state library,
  no form library, no UI kit, no data-fetching library.
- Translations live in one file, `src/i18n/messages.js`, as a nested object per language,
  read through a custom `useI18n()` hook. No i18n library.
- Cloudflare Worker written in plain JS, no framework.
- `server/index.js` is a small Node static server used only by the Docker image
  (`Dockerfile`, `render.yaml`); the live site does not use it.
- Dev-only: `@electric-sql/pglite` runs the migrations in an in-process Postgres for
  tests (`npm run test:db`), `wrangler` for the Worker, `k6` for load tests.

---

## 4. Data model

All in Postgres on Supabase. Two schemas matter: `public` (readable through PostgREST
under RLS) and `private` (never exposed; reachable only from SECURITY DEFINER functions).

**Catalogue**
- `courses` — slug, code, titles (ar/en), description, level, image, `is_published`,
  `availability_status` (`available` / `coming_soon`), `is_free`, `price`,
  `instructor_share_percent`, `instructor_id`, `duration_minutes`, `position`.
- `modules` — a course's sections, ordered.
- `lessons` — belongs to a course and a module, titles (ar/en), `duration_seconds`,
  `is_preview`, `position`.
- `lesson_resources` — slides and files shown under the player: title, https url, kind
  (`slides` / `pdf` / `doc` / `sheet` / `file` / `link`), position.
- `instructors` — slug, names, titles, bios (ar/en), photo, `linkedin_url`, `expertise`
  arrays, `certifications` as jsonb, `user_id` linking to the login account, `is_active`.

**People and learning**
- `profiles` — one row per auth user: display name, phone, affiliation (school or
  employer). Created by a trigger on `auth.users`.
- `enrollments` — user ↔ course, with `enrolled_at`.
- `lesson_progress` — user ↔ lesson, `progress_seconds`, `completed_at`, `updated_at`.
  `completed_at` is now vestigial: the "mark complete" button was removed because the
  courses are free and open, and progress is computed from watch time instead.
- `private.admins` — the allow-list of admin accounts. Membership is the only thing that
  grants admin.

**Money (built, not yet used)**
- `payments` — course_id, user_id, `instructor_id` and `instructor_share_percent`
  **snapshotted at the time of payment**, `amount`, `status`
  (`pending` / `paid` / `refunded`), `method`
  (`bank_transfer` / `cash` / `card` / `mobile_wallet` / `other`), `reference`, `note`,
  `paid_at`, `created_by`.
- `payouts` — what has been paid out to an instructor: instructor_id, amount, method,
  reference, note, paid_at.
- Triggers: `snapshot_payment_split` copies the course's instructor and split onto the
  payment row so later changes to the course cannot rewrite history;
  `enroll_on_payment` enrols the learner automatically when a payment becomes `paid`.

**Video (private)**
- `private.lesson_media` — lesson_id, provider (`google_drive`), `drive_file_id`,
  `mime_type`. Deliberately outside `public` so no browser can ever read a Drive id.

---

## 5. The database function surface

The client never writes to sensitive tables directly. It calls RPCs, all
`security definer` with `set search_path = ''`:

- `get_my_roles()` → `{ is_admin, instructor }`. Drives what the account menu shows.
- `get_published_catalog` equivalent is done with plain selects under RLS; everything
  else goes through functions.
- `get_dashboard(p_instructor_id)` → one large jsonb document: totals, per-course rows,
  per-instructor rows, the learner list, six months of history, payments, payouts. An
  admin sees the platform; an instructor sees only their own scope, enforced inside the
  function. This is the single query behind both dashboards.
- `admin_search_learners(query)`.
- `get_course_content(course_id)` — the editor's view of a course.
- `create_course`, `set_lesson_video`, plus table-level policies for lesson CRUD.
- `get_lesson_video(lesson_id)` — used by the Worker with the learner's JWT to check
  enrolment and return the Drive id. This is the only path to a Drive id.
- Helpers in `private`: `is_admin()`, `current_instructor_id()`, `owns_course()`,
  `guard_course_update()` (stops an instructor editing price or share).

**RLS shape.** Published courses, modules, lessons and active instructors are readable
by anyone. A learner reads and writes only their own `enrollments` and `lesson_progress`.
An instructor reads and writes the rows of courses they own. Admins are checked through
`private.is_admin()`, never through a column a user could set.

---

## 6. Video delivery

1. The player asks the Worker `POST /api/lessons/:id/playback` with the learner's
   Supabase JWT.
2. The Worker calls `get_lesson_video` with that JWT, so Postgres decides whether the
   learner is enrolled. If yes it returns the Drive file id.
3. The Worker returns a relative URL `/api/stream/<token>`, where the token is
   `base64url({lesson, user, expiry})` plus an HMAC signature, valid for about three
   hours.
4. `GET /api/stream/:token` verifies the signature, snaps the requested byte range to a
   4 MB chunk, and proxies the bytes from Drive, answering `206 Partial Content`.
5. Chunks are meant to be kept in Cloudflare's cache so the second learner is served
   from the edge.

**A known, measured problem.** Step 5 does not work. The Cache API is unavailable on
`*.workers.dev` subdomains, and `glorytech.ly` is not on Cloudflare (its nameservers are
at the hosting provider). Repeating the same byte range four times gave 1.7 s, 3.1 s,
2.1 s, 2.1 s — no caching at all. So every learner pulls every byte from Google Drive,
at Drive's throttled speed, and Drive's daily quota is fully exposed. The fix is either
moving the zone to Cloudflare so the Worker can have a custom domain, or moving the
files to Cloudflare R2 (about 4.8 GB, inside the 10 GB free tier).

**Video encoding history, because it shaped the player.** The lectures were originally
H.265, which Chrome on Windows will not decode; then re-encoded to H.264 but at Main
profile, level 5.1 with 14 reference frames, which an iPhone's hardware decoder refuses —
the picture stayed black while the sound played. They were re-encoded again to High
profile, level 4.0, 4 reference frames, with `+faststart`. Audio levels also varied by
up to 20 dB between lectures and were normalised to −16 LUFS. `scripts/convert-lessons.mjs`
and `scripts/normalize-audio.mjs` do both jobs and verify every output.

---

## 7. Front end

**Pages** (`src/pages/`): `LandingPage`, `CoursePage`, `LearnPage` (the player),
`DashboardPage` (student), `InstructorPage` (public profile), `LoginPage`,
`TeachingDashboardPage` (instructor), `AdminDashboardPage`, `CourseEditorPage`,
`B2BPage`, `TeachPage`, `LegalPage`, `NotFoundPage`. Everything except the landing page
is lazily loaded.

**Contexts**: `AuthContext` (session, roles, OTP sign-in), `CatalogContext` (courses and
instructors, loaded once from Supabase with a bundled seed as fallback), `ThemeContext`,
`I18nProvider`.

**Auth**: passwordless email OTP through Supabase, with custom SMTP on the owner's own
mail server and hand-written Arabic email templates. There are no passwords anywhere.

**Player** (`VideoPlayer.jsx`): a custom player, not a library. Speed control, seek
preview thumbnails on desktop only (an iPhone decodes one video at a time, so a second
`<video>` blanks the lesson), automatic retry with backoff on a dropped stream, resume
from the saved position, `navigator.audioSession` set to `playback` so the iPhone ringer
switch does not silence the lecture.

**Analytics**: Google Analytics 4, loaded only when a measurement id is configured, with
route changes reported by hand since a SPA never reloads.

---

## 8. What already exists towards the paid-courses goal

This matters, because the groundwork is heavier than it looks:

- Courses already carry `is_free`, `price` and `instructor_share_percent`.
- `payments` and `payouts` tables exist with their triggers, and the split is snapshotted
  per payment.
- Paying enrols the learner automatically.
- The admin dashboard can already **record a payment by hand**, change its status, and
  record a payout to an instructor.
- The dashboards already compute gross revenue, instructor earnings, platform earnings,
  amount paid out, and six months of history, scoped correctly for admin vs instructor.
- An instructor portal exists: create a course, edit its details, add and reorder
  modules and lessons, attach a video, attach slides and files. An instructor cannot
  change price or revenue share — a trigger blocks it.

## 9. What is missing for the stated goals

**Online payment (Edfali / ezone or similar Libyan gateway)**
- No checkout flow of any kind. Nothing in the UI takes money.
- No server endpoint that can receive a gateway callback. The Cloudflare Worker is the
  only server-side code, and it currently only serves video.
- No webhook verification, no idempotency on payment creation, no reconciliation.
- `payments.method` has no gateway value; the enum would need extending.
- No receipts or invoices, no refund flow beyond a status field.
- Access control question: enrolment is currently granted on `status = 'paid'`, so a
  gateway integration must drive that transition rather than the UI.

**Paid courses**
- No paywall on the course page or in the player — `get_lesson_video` checks enrolment,
  which is the right hook, but nothing prevents free enrolment in a paid course today.
- No pricing UI, no currency handling beyond a numeric column, no discount or coupon
  concept, no free-preview-lesson mechanism (it existed and was deliberately removed).

**Instructor platform**
- Video is attached by pasting a Google Drive link. There is no upload from the browser,
  no transcoding, no progress bar, no validation that the file is iPhone-safe — which,
  given the encoding history above, is a real operational risk.
- Earnings are shown as six fixed months. There is no date-range picker, no filter by
  course, no export.
- No instructor onboarding, no contract or share negotiation flow, no per-instructor
  payout schedule.
- No notifications of any kind, no email to instructors or learners besides the OTP.

**General gaps**
- No automated tests of the front end, no CI, manual zip deployment.
- No audit log of admin actions.
- No rate limiting of our own; Supabase's defaults are the only protection.
- Arabic and English are complete, but there is no per-user language preference stored.

---

## 10. Constraints worth knowing before proposing anything

- **Libya.** Card payment is not generally available; local gateways and bank transfer
  dominate, and many learners are on mobile data behind CGNAT. Latency to Europe is
  significant. Any gateway proposal has to work with what a Libyan merchant can actually
  get.
- **Budget is effectively zero.** Everything runs on free tiers today. A 5 $/month
  Cloudflare plan is acceptable; a 50 $/month service is not, yet.
- **One person operates it**, and he is a network engineer, not a full-time developer.
  Solutions that need constant babysitting are worse than slower ones that do not.
- **No Node on the hosting.** Anything server-side must live in the Cloudflare Worker,
  in Supabase (Postgres functions or Edge Functions), or in a new service.
- **The owner deploys by hand**, so any change that needs a coordinated release of site,
  Worker and database must be sequenced carefully in the instructions.

---

## 11. Good questions to take to a longer conversation

1. Where should payment logic live — Supabase Edge Functions, the existing Cloudflare
   Worker, or a separate small service? What does each cost in complexity given there is
   no CI and one operator?
2. How should a gateway callback be verified and made idempotent, so a retried webhook
   cannot enrol twice or double-count revenue?
3. Should enrolment stay the single gate for access, with the paywall enforced only in
   `get_lesson_video`? What are the failure modes?
4. What is the least-effort browser upload path for instructor video that also enforces
   the encoding constraints — direct to R2 with a presigned URL, plus a queue that
   re-encodes and verifies?
5. Is moving the DNS zone to Cloudflare worth it? It fixes video caching for free, but
   the mail records (SPF, DKIM, DMARC on the owner's own server) were hard-won and would
   have to be migrated exactly.
6. For instructor earnings with arbitrary date ranges: extend `get_dashboard` with
   parameters, or split reporting into its own function so one screen does not carry the
   cost of a document that already returns everything?
7. What is the minimum audit trail a two-sided marketplace needs before real money moves
   through it?
