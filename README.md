# GlanceMail — Gmail triage in 30 seconds, on G2 glasses

**Hackathon:** Heads Up: Even Realities Hackathon (DoraHacks, TVM Ventures & Daos Hub)
**Track 4:** AI Assistants & Work — Gmail, Google Calendar, ChatGPT / Claude / Gemini
**Team:** solo — soshixos (Yuni Agung Saputra)
**Status:** working MVP — real Gmail data, real drafts, real send on Approve
**Demo video:** `demo/glancemail-demo.mp4` (≤ 3 min, companion WebView recording)
**Repo:** https://github.com/soshixos/glancemail

## The problem

Phones pull you out of the moment. Checking email means unlocking, opening
Gmail, and scrolling a list built for a big screen. On a walk, between
meetings, or mid-task, you just want to know: *what needs me, what can wait,
and what's next?*

GlanceMail answers that in one glance on Even Realities G2 — then lets you
act in seconds, hands-free. No phone in hand.

## What GlanceMail does

1. **Inbox triage** — your top 3 emails, one line each: who, what, and
   whether it needs action. A recruiter follow-up or an interview invite is
   HIGH; a newsletter is LOW — "Skim later. No action needed."
2. **AI draft reply** — open a reply-kind email and GlanceMail shows a short
   plain-text draft reply, composed from the real thread in your voice.
3. **Voice approve** — say "approve" (or tap) and the reply is really sent
   via Gmail. "Edit" re-drafts from what you dictate; "discard" drops it.
4. **Sent state** — the glasses confirm the reply went out, so you never
   wonder whether it sent.

Design rules: one thing on screen (576×288, monochrome green), a few words,
one action by tap, ring scroll, or a short voice phrase. No dashboards.

> **Cut from the MVP:** the Calendar meeting brief. Gmail triage + draft +
> send is the scored core, and the brief is not in this build — the backend
> never returns a meeting-kind email and the meeting screen is unreachable.
> The scaffold's meeting screen code remains but is not wired to live data.

## How it works

```
G2 glasses ──Bluetooth── Even Realities app (WebView)
        │
        │  Even Hub SDK (TextContainer 576×288, tap / scroll / mic)
        ▼
GlanceMail web app (Vite + TypeScript, this repo)
        │  fetch, VITE_BACKEND_URL (default http://localhost:8787)
        ▼
GlanceMail backend (server/, Node built-in http only, zero npm deps)
        │  Gmail via the connected account (hatch_gws_cli)
        ▼
Real Gmail — triage, drafts, send
```

- **G2 app (`src/`)** — Vite + TypeScript + Even Hub SDK, package
  `com.soshixos.glancemail`. One `TextContainer` (576×288) renders the
  current screen; tap = primary action, scroll = move selection,
  double-tap = exit. Voice commands: "approve" / "edit" / "discard" /
  "inbox" / "reply".
- **Local backend (`server/server.js`)** — owns every external call. No API
  keys live in the app. Endpoints (JSON, CORS open):
  `GET /api/health`, `GET /api/inbox?limit=3`, `POST /api/draft
  {messageId}`, `POST /api/send {messageId, body}` (plus `dryRun: true`,
  which returns the exact command it *would* run and sends nothing),
  `POST /api/pair`, `GET /api/pair/:code`.
- **Real Gmail triage** — scores sender importance (job senders such as
  Clera / Handshake / AfterQuery / Vetto, real people over no-reply /
  marketing) + urgency words (deadline, urgent, tomorrow, action required,
  interview, offer, please reply) + reply-requested (questions in the
  body). Newsletters and promotions are LOW, not actionable. One triage
  call (max 10), full bodies read only for the top 3 candidates, result
  cached 2 minutes.
- **Local intent-based draft composer** — no external LLM call, no key. It
  classifies the intent (interview invite / request for info or answers /
  offer / follow-up / confirmation / other) and composes a short plain-text
  reply in Yuni's voice using his real facts only (Yuni Agung Saputra, S.P.,
  Agroteknologi graduate UMP Jan 2026, fresh graduate; Clera AI roles;
  AfterQuery PowerPoint Specialist; English Intermediate). Rules: plain
  human text, **never any asterisks, bold or markdown** (Gmail renders them
  raw), under ~80 words, signed "Best, Yuni". It never invents a number,
  date, employer or outcome. For a newsletter it returns an empty draft —
  no reply needed.
  - Why local: the planned LLM routes are both dead for this key —
    IteraCompute returns HTTP 403 (free access expired, verified 26 Nov
    2026) and the Pollinations free tier is exhausted on the shared IP
    (100/day limit). Swapping in Claude / Gemini / OpenRouter later is a
    one-function change in `server/server.js` — the draft contract
    (`{draft, messageId, threadId, engine, intent}`) stays the same.
- **Real send on Approve** — Approve runs a real Gmail reply and returns
  the sent message id. Verified end-to-end with `dryRun` (see
  `server/E2E_LOG.md`); no live send was executed during the build — the
  live send happens at demo time, with the owner's approval, replying to
  the owner himself.
- **Voice input** — the G2 mic streams PCM (s16le @ 16 kHz mono) to the STT
  client in `src/asr/stt.ts`. That stub (from the template) still throws, so
  live mic transcription is **not** wired yet — the app catches it and stays
  usable via tap / scroll / companion buttons. The companion WebView has a
  **"Simulate voice" box**: type "approve" (or any command) and it runs
  through the exact same voice-command path as a real transcript, so the
  whole hands-free flow is demoable without hardware or a wired STT
  provider. Wiring the stub to Whisper (key server-side only) is the known
  next step; nothing about the voice-command handling changes.
- **Honest offline state** — if the backend is unreachable the app falls
  back to `src/data/mock.ts` and says so: "OFFLINE — mock data" in the
  companion footer and on the glasses. Live data is never faked as live.

## Setup

Prerequisites: Node.js v18+ (tested on Node v24.22.1 / npm 10.9.4),
`@evenrealities/even_hub_sdk` 0.0.10, CLI 0.1.14, simulator 0.7.3.

```bash
# 1. Backend — terminal 1 (Gmail triage, drafts, send)
cd server
node server.js        # or: npm start
# listening on http://localhost:8787 (override with PORT=8787)
# Requires the already-connected Gmail CLI at /opt/hatch/bin/hatch_gws_cli
# (the same connected soshixos@gmail.com account). No keys, no secrets.

# 2. G2 app — terminal 2
npm install
npm run dev           # Vite dev server on http://localhost:5173
```

Point the app at a backend somewhere else with:

```bash
VITE_BACKEND_URL=http://<host>:8787 npm run dev
```

Test in the simulator (dev server still running):

```bash
npm run simulate      # evenhub-simulator http://localhost:5173
```

Test on real G2 glasses (phone + glasses paired, same Wi-Fi/LAN):

```bash
npx evenhub qr --url http://<your-LAN-IP>:5173
```

Scan the QR with the Even Realities app. Hot-reload works on glasses.

Package for distribution:

```bash
npm run pack          # builds and produces a .ehpk (see note below)
```

> **Pack result (verified 26 Nov 2026):** `npm run pack` succeeds and
> produces `out.ehpk` (35,658 bytes, git-ignored via `*.ehpk`). One
> warning only: `app.json` sets `min_app_version` 2.0.0, below the SDK
> floor 2.2.10, so the packer stamps 2.2.10. The earlier expectation that
> an empty `network` whitelist would block packing did not hold — the
> build packs without it. The `.ehpk` is still optional for submission
> per the hackathon rules.

## Architecture

| File | Purpose |
|---|---|
| `src/main.ts` | Entry: bridge, screen state machine, tap/scroll/voice routing, mic + STT wiring, debounced glasses render, backend load with mock fallback. |
| `src/screens.ts` | Pure renderers: exact 576×288 text for inbox / reply screens (meeting renderer retained, unreachable in the MVP). |
| `src/data/backend.ts` | Backend client: `VITE_BACKEND_URL`, 5 s timeout, typed `getInbox` / `getDraft` / `sendReply`. No tokens or keys. |
| `src/data/mock.ts` | Mock Gmail data + draft reply — fallback only, always labelled OFFLINE. |
| `src/asr/stt.ts` | **STT stub from the template** — wire up Whisper here (server-side key). |
| `src/ui.ts` | Companion preview: glasses-canvas mirror, action buttons, simulate-voice box, transcript, live/offline backend footer. |
| `server/server.js` | Backend: triage, local-template drafts, real send, pairing codes. Zero npm dependencies. |
| `server/README.md` | Backend docs (endpoints, pairing design, verified E2E). |
| `server/E2E_LOG.md` | Curl log proving health + real inbox + draft + send dryRun (26 Nov 2026). |
| `app.json` | Manifest: `com.soshixos.glancemail`, `g2-microphone` permission only (no `network` whitelist — pack still succeeds, see note above). |
| `public/icon.png` | 24×24 greyscale envelope icon. |
| `.env.example` | `VITE_STT_API_KEY=` placeholder. Never commit `.env` / `.env.local`. |

## Pairing-code auth — production design vs demo mode

Google sign-in does not work inside the G2 WebView (hackathon rules), so
GlanceMail uses a pairing code. Be honest about where this stands:

**Production design (not fully implemented — needs the owner):**

1. User opens a pairing page in the phone browser and signs in with Google
   once. Scopes: `gmail.readonly`, `gmail.send`, `calendar.readonly`.
2. Backend stores the refresh token server-side (never in the app) and
   creates a session.
3. The G2 app shows a short pairing code; the user enters it on the pairing
   page, or the app displays a code the phone page confirms.
4. The code exchanges for a session token the G2 app uses for `/api/*`.
   Codes are single-use, 6 digits, 5-minute expiry.

**Demo mode (what this server actually does):** the backend uses the
already-connected Gmail account server-side via `hatch_gws_cli`.
`POST /api/pair` issues an in-memory 6-digit code (5-min expiry) and
`GET /api/pair/:code` checks it, but the code is **not yet wired to a real
Google OAuth session** — there is no Google Cloud project / OAuth client
yet, because creating one needs the owner. Do not present the demo pairing
as a production login; it is a placeholder for the flow above.

## Judging — how this maps to the criteria

Per the live DoraHacks page:

| Criterion | Weight | Where GlanceMail scores |
|---|---|---|
| Usefulness on G2 | 25% | Inbox in 30 seconds, at a glance, hands-free — a real everyday moment. |
| Read and write | 20% | Read 3 triaged emails; write by voice — one word ("approve") sends an AI draft. |
| Technical execution | 20% | Works end to end on a real Gmail account and real data, not mocks; clean code; setup from this README. |
| UX for display/voice | 15% | One thing per 576×288 screen, few words, natural voice commands. |
| Business potential and safety | 20% | Every knowledge worker with Gmail is the market; read-only except send, no keys in the app, no funds held, plain-text drafts only. |

## What existed before 23 Nov 2026

Only the official Even Hub `asr` template (MIT), cloned with
`npx degit even-realities/evenhub-templates/asr`: Vite + TypeScript +
Even Hub SDK, mic → STT-stub pipeline, companion UI, tap/double-tap
handling. The GlanceMail scaffold (v0.1.0, 20 Nov) added the screens, mock
data, voice commands, and this README's first version — mock data only.

## What was built during build week (23–29 Nov 2026)

- **Backend server from scratch** (`server/`, zero npm dependencies):
  health, triaged inbox from real Gmail, local intent-based draft composer,
  real send via Gmail (dryRun-verified), demo pairing codes.
- **G2 app wired to live data** (`src/data/backend.ts`, `src/main.ts`,
  `src/screens.ts`, `src/ui.ts`): real inbox replaces mock data, live
  backend status in the companion footer, meeting-kind filtering, draft
  fetch with mock fallback labelled honestly.
- **Verified end-to-end** (`server/E2E_LOG.md`, 26 Nov 2026): health +
  real inbox + draft for a real message + send dryRun. No live send
  executed during the build.
- **Demo video** (`demo/`, ≤ 3 min) and this submit-ready README.
- **Cut:** Calendar meeting brief (see above); live mic STT remains a stub
  with the simulate-voice box as the demo path.

## Feature requests for the APIs used (up to 5)

What the Gmail API, Google OAuth, and Even Hub platform are missing for
apps like this:

1. **Gmail API — cheap "what's new" polling.** A lightweight delta /
   "new mail since X" endpoint (or push without a full GCP Pub/Sub
   project) so a glanceable app can check for new mail without re-listing
   the inbox every time.
2. **Google OAuth — a supported device/pairing-code flow for WebView
   apps.** Google sign-in does not work inside the G2 WebView; every app
   re-invents the phone-browser + pairing-code dance. A blessed flow
   (like the TV/device-code flow) would make this standard and safe.
3. **Even Hub SDK — a built-in STT helper.** The SDK hands apps raw mic
   audio and every team has to bring its own Whisper key and server. A
   first-party streaming transcription option would unblock voice for
   every app at once.
4. **Even Hub SDK — a confirmation/toast primitive.** After an action
   ("reply sent") the app has to repaint a whole screen to confirm it. A
   tiny system confirmation overlay would make send/confirm flows safer
   and more glanceable.
5. **Even Hub tooling — dev-backend origins in `app.json`.** `evenhub
   pack` rejects a build with an empty `network` whitelist, but there is
   no documented way to whitelist a localhost/dev backend for a demo
   build — so local-backend apps cannot produce a `.ehpk` at all. A
   dev-mode allowance (or a clearer error) would help.

## Safety

- Free-only build: no spending, no paid APIs, no wallet, no funds held.
- No API keys or secrets in this repo (`.env` / `.env.local` are
  git-ignored; `.env.example` holds a placeholder only). All Gmail access
  happens server-side through the already-connected account.
- Gmail scope is read + send only; drafts are plain text, never markdown.
- The demo sends one reply, to the owner's own test email, with the
  owner's approval — nothing is sent to a third party.

## Submission

- Track: **04 · AI Assistants & Work** (Gmail + Google Workspace).
- Short description, video, and the submit checklist live in `SUBMIT.md`.
- Deadline: **29 Nov 2026, 23:59 Dubai time (30 Nov 02:59 WIB)**.
- Demo Day: 3 Dec 2026, Daos Hub, Dubai (remote OK).
