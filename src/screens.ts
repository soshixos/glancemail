// GlanceMail screen renderers — pure functions returning the exact text
// shown on the G2 576x288 monochrome display. ASCII only (no emoji — the
// glasses font may not render it). Keep each screen short: the template
// notes ~240 chars as a rough fit for one text container at default font;
// inbox and reply sit just above that — verify on the simulator during
// build week and paginate (see text-heavy template) if anything clips.
//
// LIVE DATA: inbox emails come from the backend via src/data/backend.ts
// (state.emails). MOCK_EMAILS is only the offline fallback, with
// meeting-kind entries filtered out — the meeting brief is CUT in the MVP.

import { MOCK_EMAILS, MOCK_DRAFT_REPLY, MOCK_MEETING } from './data/mock'
import type { InboxEmail } from './data/backend'

export type Screen = 'inbox' | 'reply' | 'meeting'
export type ReplyAction = 'approve' | 'edit' | 'discard'
export type ReplyStatus =
  | 'draft'
  | 'drafting'
  | 'sending'
  | 'approved'
  | 'discarded'
  | 'editing'

export interface GlanceState {
  screen: Screen
  selectedEmail: number
  replyAction: ReplyAction
  replyStatus: ReplyStatus
  draft: string
  notice: string
  /** Live inbox from the backend; mock fallback when the backend is down. */
  emails: InboxEmail[]
  /** True while the first /api/inbox fetch is in flight. */
  inboxLoading: boolean
  /** True when showing mock fallback data (backend unreachable). */
  offline: boolean
}

/** Offline fallback inbox: mock data minus meeting-kind emails (CUT in MVP). */
export function fallbackEmails(): InboxEmail[] {
  return MOCK_EMAILS.filter(m => m.kind !== 'meeting')
}

export function initialState(): GlanceState {
  return {
    screen: 'inbox',
    selectedEmail: 0,
    replyAction: 'approve',
    replyStatus: 'draft',
    draft: MOCK_DRAFT_REPLY,
    notice: '',
    emails: fallbackEmails(),
    inboxLoading: true,
    offline: false,
  }
}

function actionLabel(a: ReplyAction, focused: ReplyAction, label: string): string {
  return `${a === focused ? '>' : ' '} ${label}`
}

export function renderGlassesText(s: GlanceState): string {
  switch (s.screen) {
    case 'inbox': {
      if (s.inboxLoading) {
        return ['GLANCEMAIL — INBOX', '', 'Loading inbox...'].join('\n')
      }
      const lines = [`GLANCEMAIL — INBOX  (${s.emails.length} new)`, '']
      s.emails.forEach((m, i) => {
        const sel = i === s.selectedEmail ? '>' : ' '
        lines.push(`${sel} [${m.priority}] ${m.time} ${m.from}`)
        lines.push(`    ${m.summary}`)
      })
      lines.push('')
      if (s.offline) lines.push('OFFLINE - mock data')
      lines.push(s.notice || 'Tap: open  |  Scroll: pick email')
      return lines.join('\n')
    }
    case 'reply': {
      const email = s.emails[s.selectedEmail] ?? s.emails[0]
      const lines = [`REPLY — ${email ? email.from : 'unknown'}`, '']
      if (s.replyStatus === 'approved') {
        lines.push('Sent. Back to inbox.')
        lines.push('')
        lines.push('Tap: inbox')
        return lines.join('\n')
      }
      if (s.replyStatus === 'discarded') {
        lines.push('Draft discarded.')
        lines.push('')
        lines.push('Tap: inbox')
        return lines.join('\n')
      }
      if (s.replyStatus === 'drafting') {
        lines.push('Drafting...')
        lines.push('')
        lines.push('Writing your reply.')
        return lines.join('\n')
      }
      if (s.replyStatus === 'sending') {
        lines.push('Sending...')
        return lines.join('\n')
      }
      if (s.replyStatus === 'editing') {
        lines.push('EDIT BY VOICE — speak now.')
        lines.push('Say the new reply, or say')
        lines.push('"cancel" to keep the draft.')
        lines.push('')
        lines.push('Listening...')
        return lines.join('\n')
      }
      lines.push(`Draft: ${s.draft}`)
      if (s.notice) lines.push(s.notice)
      lines.push('')
      lines.push(actionLabel('approve', s.replyAction, 'Approve + send'))
      lines.push(actionLabel('edit', s.replyAction, 'Edit by voice'))
      lines.push(actionLabel('discard', s.replyAction, 'Discard'))
      lines.push('')
      lines.push('Tap: run highlighted  |  Scroll: pick')
      lines.push('Voice: "approve" / "edit" / "discard"')
      return lines.join('\n')
    }
    // CUT IN MVP: the meeting brief screen is kept for a later milestone
    // but unreachable — the backend never returns kind "meeting", mock
    // meeting emails are filtered out of the inbox, and the companion
    // "Meeting brief" button is hidden. Do not delete this case.
    case 'meeting': {
      const m = MOCK_MEETING
      const lines = ['NEXT MEETING', '', `${m.title}`, `${m.when} · ${m.duration}`, `${m.who} · ${m.where}`, '']
      m.prep.forEach((p, i) => lines.push(`${i + 1}. ${p}`))
      lines.push('')
      lines.push('Tap: back to inbox')
      return lines.join('\n')
    }
  }
}
