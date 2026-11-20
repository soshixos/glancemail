# GlanceMail — Gmail triage in 30 seconds, on G2 glasses

**Hackathon:** Heads Up: Even Realities Hackathon (DoraHacks, TVM Ventures & Daos Hub)
**Track 4:** AI Assistants & Work — Gmail, Google Calendar, ChatGPT / Claude / Gemini
**Team:** solo — soshixos (Yuni Agung Saputra)
**Status:** scaffold, mock data only — v0.1.0

## The problem

Phones pull you out of the moment. Checking email means unlocking, opening
Gmail, and scrolling a list built for a big screen. On a walk, between
meetings, or mid-task, you just want to know: *what needs me, what can wait,
and what's next?*

## What GlanceMail does

A G2 glasses app that answers that in one glance, then lets you act in
seconds — no phone in hand:

1. **Inbox triage** — top 3 emails, one line each: who, what, and whether it
   needs action. A recruiter follow-up is HIGH; a newsletter is LOW and gets
   archived with one tap.
2. **Voice reply** — an AI-drafted reply to the top email. Say "approve" (or
   tap) to send, "edit" to dictate a new version, "discard" to drop it.
3. **Next-meeting brief** — when, who, where, and 3 prep bullets before your
   next call.

Design rules: one thing on screen (576×288, monochrome green), a few words,
one action by tap, ring scroll, or a short voice phrase. No dashboards.

## How it works

- Web app (Vite + TypeScript) running in a WebView inside the Even Realities
  app, talking to G2 over Bluetooth through the Even Hub SDK.
- One `TextContainer` (576×288) renders the current screen; tap = primary
  action for that screen, scroll = move selection, double-tap = exit
  (system confirmation dialog, as required on the root page).
- The G2 mic streams PCM (s16le @ 16 kHz mono) to the STT client; final
  transcripts are parsed as voice commands ("approve" / "edit" / "discard" /
  "meeting" / "inbox"). Edit-by-voice replaces the draft with what you said.
- The companion WebView (browser preview) mirrors the glasses canvas and
  exposes every action as a button plus a "simulate voice" box, so the app
  is fully demoable without hardware or a wired STT provider.

## Screens & controls

| Screen | Shows | Tap | Scroll | Voice |
|---|---|---|---|---|
| Inbox | Top 3 emails, 1-line summaries | Open selected (reply / meeting brief / archive newsletter) | Pick email | "meeting", "reply", "inbox" |
| Reply | AI draft + Approve / Edit / Discard | Run highlighted action | Pick action | "approve", "edit", "discard" |
| Meeting | Time, who, 3 prep bullets | Back to inbox | — | "inbox" |

## Setup

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

Test in the simulator (separate terminal, dev server still running):

```bash
npm run simulate   # evenhub-simulator http://localhost:5173
```

Test on real G2 glasses (phone + glasses paired, same Wi-Fi/LAN):

```bash
npx evenhub qr --url http://<your-LAN-IP>:5173
```

Scan the QR with the Even Realities app. Hot-reload works on glasses.

Package for distribution:

```bash
npm run pack       # builds and produces a .ehpk
```

Prerequisites: Node.js v18+ (tested on Node v24.22.1 / npm 10.9.4),
`@evenrealities/even_hub_sdk` 0.0.10, CLI 0.1.14, simulator 0.7.3.

## Mock data — read this before judging

**This scaffold uses mock data only.** The 3 emails (a Clera-style
recruiter follow-up, a Clera intro-call invite, a newsletter), the draft
reply, and the meeting brief live in `src/data/mock.ts`. There are no real
Gmail/Calendar calls, no API keys, and no secrets in this repo. The sender
domains are `.example` on purpose.

## What remains for the MVP (build week 23–29 Nov 2026)

1. **Gmail + Calendar wiring** — OAuth via a pairing code (Google sign-in
   does not work inside the WebView); fetch inbox + next event through our
   own backend server. Add that server's origin to the `network` whitelist
   in `app.json` (an empty whitelist is rejected by `evenhub pack`).
2. **STT backend** — wire `src/asr/stt.ts` to Whisper (or Deepgram): the
   template stub currently throws, the app catches it and stays usable via
   tap/scroll + companion buttons. Never ship the API key in the app — send
   PCM to our server, which calls the provider.
3. **AI draft generation** — generate the reply draft server-side
   (Claude/Gemini) from the real thread. Drafts must stay plain text, no
   markdown/asterisks — Gmail renders them raw.
4. **Real send** — approve must actually send the reply via the Gmail API
   (currently it only flips the mock state to "Sent").
5. **Demo video** — up to 3 minutes, in the simulator or on G2, plus the
   DoraHacks submission before 29 Nov 23:59 Dubai time (30 Nov 02:59 WIB).

## What existed before 23 Nov 2026

Only the official Even Hub `asr` template (MIT), cloned with
`npx degit even-realities/evenhub-templates/asr`: Vite + TypeScript +
Even Hub SDK, mic → STT-stub pipeline, companion UI, tap/double-tap
handling. All GlanceMail screens, mock data, voice commands, and this
README were written during the hackathon build week. No pre-existing
GlanceMail code, no reused app code.

## Files

| File | Purpose |
|---|---|
| `src/main.ts` | Entry: bridge, screen state machine, tap/scroll/voice routing, mic + STT wiring, debounced glasses render. |
| `src/screens.ts` | Pure renderers: exact 576×288 text for inbox / reply / meeting. |
| `src/data/mock.ts` | Mock Gmail + Calendar data + draft reply (to be replaced by the backend client). |
| `src/asr/stt.ts` | **Blank STT stub from the template** — wire up Whisper here. |
| `src/ui.ts` | Companion preview: glasses-canvas mirror, action buttons, simulate-voice box, transcript. |
| `app.json` | Manifest: `com.soshixos.glancemail`, `g2-microphone` permission only (no `network` yet — see MVP list). |
| `public/icon.png` | 24×24 greyscale envelope icon. |
| `.env.example` | `VITE_STT_API_KEY=` placeholder. Never commit `.env.local`. |
