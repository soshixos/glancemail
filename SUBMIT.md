# GlanceMail — DoraHacks submission checklist

**Hackathon:** Heads Up: Even Realities Hackathon (DoraHacks, TVM Ventures & Daos Hub)
**Track:** 04 · AI Assistants & Work (Gmail + Google Workspace)
**Team:** solo — soshixos
**Deadline:** 29 Nov 2026, 23:59 Dubai time = **30 Nov 2026, 02:59 WIB**
**Submit page:** https://dorahacks.io/hackathon/even-realities/detail
**Demo Day:** 3 Dec 2026, Daos Hub, Dubai (remote OK)

## Status — 26 Nov 2026, 15:15 WIB

| Item | Status | Location / link |
|---|---|---|
| Public GitHub repo | DONE | https://github.com/soshixos/glancemail (PUBLIC, branch `main`) |
| Submit-ready README | DONE | `README.md` in the repo (setup, architecture, pairing design, before/after 23 Nov, feature requests) |
| Backend verified E2E | DONE | `server/E2E_LOG.md` — health + real inbox + draft + send dryRun, 26 Nov 2026 |
| Pack (`.ehpk`) | DONE | `npm run pack` succeeds; `out.ehpk` 35,658 bytes (git-ignored). One warning only: `min_app_version` stamped 2.2.10 instead of 2.0.0 |
| Demo video (≤ 3 min) | **BLOCKED — needs test email** | Target: `demo/glancemail-demo.mp4` — not recorded yet, see below |
| DoraHacks submit click | NOT DONE — needs Yuni | Nothing submitted to DoraHacks from here; no DoraHacks clicks made |

## Short description (for the submission form)

**Problem:** Phones pull you out of the moment. Checking email means
unlocking, opening Gmail, and scrolling a list built for a big screen.

**Who it's for:** anyone who lives in Gmail and wants to stay present —
on a walk, between meetings, mid-task.

**How it works:** GlanceMail is a G2 glasses app (Track 4, AI Assistants &
Work). A local backend triages your real Gmail inbox to the top 3 emails,
one line each; open a reply-kind email and a local intent-based composer
shows a short plain-text draft in your voice; say "approve" (or tap) and
the reply is really sent via Gmail. One glance, one word, done — no phone
in hand. Calendar meeting brief cut from the MVP; Gmail triage + draft +
send is the scored core.

**Track:** 04 · AI Assistants & Work.

## Feature requests (up to 5, for the submission form)

1. Gmail API — cheap "what's new" polling (delta / "new mail since X")
   without re-listing the inbox or setting up a full GCP Pub/Sub project.
2. Google OAuth — a supported device/pairing-code flow for WebView apps
   (Google sign-in does not work inside the G2 WebView).
3. Even Hub SDK — a built-in STT helper (raw mic audio today; every team
   brings its own Whisper key and server).
4. Even Hub SDK — a confirmation/toast primitive for post-action feedback
   ("reply sent") without repainting a whole screen.
5. Even Hub tooling — a documented way to whitelist localhost/dev backend
   origins in `app.json` for demo builds.

## BLOCKER — demo video needs a reply-kind test email

The live inbox top 10 (checked 26 Nov 2026, 15:15 WIB) is **all
newsletters** (Atlassian, Handshake, Perplexity, Lovable, Phoenix Trader
Funding, Instagram, Vercel, ChatGPT, Google) — LOW priority, not
actionable, no reply-kind email to demo the draft/send flow end-to-end.
The draft/send flow itself is proven (E2E log: draft for a real message +
send dryRun), but the video needs a live reply-kind email at the top of
the inbox. **No email was sent by the agent.**

**Exact test email needed — Yuni, please send this:**

- **From:** yuniagungsaputra@gmail.com
- **To:** soshixos@gmail.com
- **Subject:** Follow-up: AI Evaluator intro call
- **Body:** asks 2 short questions, e.g. "Are you free for a 20-minute
  intro call this week? And could you share one writing sample before
  the call?"
- Then tell the agent it is sent. The agent will re-check
  `GET /api/inbox`, record the video (companion WebView, Playwright,
  1280×800), and finish the package.

**Video script (planned, ≤ 3 min):** title card (GlanceMail — Gmail triage
in 30 seconds, Track 4 AI Assistants & Work, soshixos) → problem card
(phone pulls you out of the moment) → companion UI: inbox triage with 3
real emails → open the reply-kind email → AI draft shown → type
"approve" in the Simulate voice box → Sent state → closing card
(read+write, glanceable, hands-free + repo link). Plain cuts and title
cards, no voiceover; on-screen text carries the narration.

## What still needs Yuni

1. **Send the test email above** (from yuniagungsaputra@gmail.com to
   soshixos@gmail.com) so the video can be recorded end-to-end.
2. **Gmail send approval:** the demo send replies to the test email
   (recipient is Yuni himself). No live send will be clicked until Yuni
   approves on the Gmail send card. If approval is in place when the video
   is recorded, the send step is filmed live; otherwise the video is
   recorded up to the Approve step and the send step is marked
   "ready to record — needs Yuni's approval".
3. **Demo approval:** review the finished video before submit.
4. **Submit click on DoraHacks** (registration was blocked 20 Nov on
   Google phone verification — Redmi Note 13, tap Ya + number; resume the
   browser task when ready). Agent does not submit.
5. **Optional, not blocking:** Google Cloud project / OAuth client for the
   production pairing flow; Whisper key (server-side) for live mic STT.
   Neither blocks this submission — demo mode + simulate-voice box are
   documented honestly in the README.

## Judging weights (live DoraHacks page, verified 26 Nov 2026)

Usefulness on G2 25% · Read and write 20% · Technical execution 20% ·
UX for display/voice 15% · Business potential and safety 20%.
