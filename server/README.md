# GlanceMail backend

Backend for **GlanceMail** by **soshixos** — Even Realities Hackathon, Track 4
(AI Assistants & Work). Gmail triage in 30 seconds + voice reply, for the G2
glasses app. Node built-in `http` only, **zero npm dependencies**.

## How to run

```bash
cd ~/workspace/even-realities-hackathon/glancemail/server
node server.js        # or: npm start
# listening on http://localhost:8787 (override with PORT=8787)
```

Requires the already-connected Gmail CLI at `/opt/hatch/bin/hatch_gws_cli`
(the same connected `soshixos@gmail.com` account). No keys, no secrets, no
external services are called.

## Endpoints (base `http://localhost:8787`, JSON everywhere, CORS open)

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{"ok":true,"gmail":true,"llm":"local-template"}` |
| GET | `/api/inbox?limit=3` | Top triaged emails (default 3, max 10) |
| POST | `/api/draft` `{"messageId"}` | Local-template draft reply |
| POST | `/api/send` `{"messageId","body"}` | Real Gmail reply via CLI |
| POST | `/api/send` `{"messageId","body","dryRun":true}` | Returns the exact CLI command it *would* run, sends nothing |
| POST | `/api/pair` | Demo pairing code, 5-min expiry |
| GET | `/api/pair/:code` | `{"code","valid":bool}` |

### GET /api/inbox

```json
{"emails":[{"id":"...","threadId":"...","from":"Handshake","subject":"...","time":"03:12","summary":"One-line summary.","priority":"HIGH","actionable":true,"kind":"reply","snippet":"..."}]}
```

`priority` is `HIGH` / `MED` / `LOW`; `kind` is `reply` or `newsletter` only
(Calendar/meeting brief is cut from the MVP — `kind: "meeting"` is never
returned). `time` is short `HH:MM` WIB. Triage scores sender importance
(job senders Clera / Handshake / AfterQuery / Vetto, real people over
no-reply/marketing) + urgency words (deadline, urgent, tomorrow, action
required, interview, offer, please reply) + reply-requested (questions in the
body). Newsletters/promotions are `LOW`, `actionable: false`, summary
"Skim later. No action needed."

Request-unit discipline: one triage call (`max 10`), full bodies read only
for the top 3 candidates. Result cached 2 minutes.

### POST /api/draft

```json
{"draft":"Hi Maya, thank you ... Best, Yuni","messageId":"...","threadId":"...","engine":"local-template","intent":"interview"}
```

Draft engine is a **local intent-based composer** — no external LLM calls, no
keys. It classifies the intent (interview invite / request for info or
answers / offer / follow-up / confirmation / other) and composes a short
plain-text reply in Yuni's voice using his real facts only: Yuni Agung
Saputra, S.P., Agroteknologi graduate UMP Jan 2026, fresh graduate; study
guide "Kompos vs Pupuk Sintetis" (Gamma+ChatGPT, Nov 2026); Rubrics Academy
assessment 12/12 (Nov 2026); Clera AI roles; AfterQuery PowerPoint
Specialist; English Intermediate. Rules: plain human text, **never any
asterisks, bold or markdown**, under ~80 words, signed "Best, Yuni". Never
invents a number, date, employer or outcome. For a newsletter it returns
`draft: ""` with a note instead.

Why local: the planned LLM routes are both dead for this key — IteraCompute
returns HTTP 403 "IteraCompute access denied" (free access expired, verified
26 Nov 2026) and the Pollinations free tier is exhausted on the shared IP
(100/day limit). No other LLM key is used, and none is sought.

### POST /api/send

Live send runs `/opt/hatch/bin/hatch_gws_cli gmail +reply --message-id <id>
--body '<body>'` and returns `{"ok":true,"sentMessageId":"..."}` or
`{"ok":false,"error":"..."}`. **No live send is executed during build** —
verify with `dryRun: true` (returns the exact command) and test the live send
at demo time with Yuni's approval.

## Pairing-code auth — design (production) vs demo

**Production design (not fully implemented — needs Yuni):**

1. User opens a pairing page in the phone browser and signs in with Google
   once (Google sign-in does not work inside the G2 WebView, per hackathon
   rules). Scopes: `gmail.readonly`, `gmail.send`, `calendar.readonly`.
2. Backend stores the refresh token server-side (never in the app) and
   creates a session.
3. The G2 app shows a short pairing code; the user enters it on the pairing
   page, or the app displays a code the phone page confirms.
4. The code exchanges for a session token the G2 app uses for `/api/*`.
   Codes are single-use, 6 digits, 5-minute expiry.

**Demo mode (what this server actually does — honest note):** the backend
uses the already-connected Gmail account server-side via `hatch_gws_cli`.
`POST /api/pair` issues an in-memory 6-digit code (5-min expiry) and
`GET /api/pair/:code` checks it, but the code is **not yet wired to a real
Google OAuth session** — there is no Google Cloud project / OAuth client
yet, because creating one needs Yuni. Do not present the demo pairing as a
production login; it is a placeholder for the flow above.

## Verified end-to-end

See `E2E_LOG.md` (curl log, 26 Nov 2026): health + inbox returning real
emails from the connected mailbox + draft for a real message + send dryRun.
No live send was executed.

## Constraints honored

Free-only, no spending, no new accounts, no wallet, no secrets in code or
logs (nothing is logged except method + path). Toggle Wars files untouched.
Nothing submitted to DoraHacks from here.
