// GlanceMail mock data — MOCK ONLY, no real Gmail/Calendar calls.
// TODO (MVP): replace this module with a backend client. Gmail + Calendar
// must be reached through our own server (pairing-code OAuth, never ship
// tokens/keys in the app); add that server's origin to the `network`
// whitelist in app.json before wiring it up. See README.md.

export interface MockEmail {
  id: string
  from: string
  subject: string
  time: string
  summary: string
  priority: 'HIGH' | 'MED' | 'LOW'
  actionable: boolean
  kind: 'reply' | 'meeting' | 'newsletter'
}

export interface MockMeeting {
  title: string
  when: string
  duration: string
  who: string
  where: string
  prep: string[]
}

export const MOCK_EMAILS: MockEmail[] = [
  {
    id: 'e1',
    from: 'Maya — Clera Talent',
    subject: 'Next step: AI Generation & Writing role',
    time: '09:41',
    summary: '2 short answers wanted by tomorrow. Draft ready.',
    priority: 'HIGH',
    actionable: true,
    kind: 'reply',
  },
  {
    id: 'e2',
    from: 'Rani — Clera (Calendar invite)',
    subject: 'Invite: Intro call, AI Evaluator role',
    time: '09:12',
    summary: 'Fri 28 Nov, 14:00 WIB, 30 min. Brief next.',
    priority: 'HIGH',
    actionable: true,
    kind: 'meeting',
  },
  {
    id: 'e3',
    from: 'AI Weekly (newsletter)',
    subject: '5 new AI tools this week',
    time: '08:05',
    summary: 'Skim later. No action needed.',
    priority: 'LOW',
    actionable: false,
    kind: 'newsletter',
  },
]

// AI-drafted reply to email e1. Plain text, no markdown — Gmail shows raw
// asterisks, so drafts must never contain bold/asterisk formatting.
// TODO (MVP): generate this draft server-side (Claude/Gemini) from the
// real thread; for now it is a fixed mock draft.
export const MOCK_DRAFT_REPLY =
  'Hi Maya, thanks for the update. ' +
  'My answers: 1) Writing task — study guide Kompos vs ' +
  'Pupuk Sintetis, Gamma + ChatGPT. ' +
  '2) Rubrics Academy, 12 of 12. Best, Yuni'

export const MOCK_MEETING: MockMeeting = {
  title: 'Intro call — AI Evaluator role',
  when: 'Fri 28 Nov, 14:00 WIB',
  duration: '30 min',
  who: 'Rani, Clera Talent',
  where: 'Google Meet',
  prep: [
    '2-min intro: agrotech grad, AI eval work',
    'Example: Rubrics Academy 12/12, AfterQuery',
    'Ask: talent pool start 1 Dec, hours',
  ],
}
