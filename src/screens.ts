// GlanceMail screen renderers — pure functions returning the exact text
// shown on the G2 576x288 monochrome display. ASCII only (no emoji — the
// glasses font may not render it). Keep each screen short: the template
// notes ~240 chars as a rough fit for one text container at default font;
// inbox (~300) and reply (~300) sit just above that — verify on the
// simulator during build week and paginate (see text-heavy template) if
// anything clips.

import { MOCK_EMAILS, MOCK_DRAFT_REPLY, MOCK_MEETING } from './data/mock'

export type Screen = 'inbox' | 'reply' | 'meeting'
export type ReplyAction = 'approve' | 'edit' | 'discard'
export type ReplyStatus = 'draft' | 'approved' | 'discarded' | 'editing'

export interface GlanceState {
  screen: Screen
  selectedEmail: number
  replyAction: ReplyAction
  replyStatus: ReplyStatus
  draft: string
  notice: string
}

export function initialState(): GlanceState {
  return {
    screen: 'inbox',
    selectedEmail: 0,
    replyAction: 'approve',
    replyStatus: 'draft',
    draft: MOCK_DRAFT_REPLY,
    notice: '',
  }
}

function actionLabel(a: ReplyAction, focused: ReplyAction, label: string): string {
  return `${a === focused ? '>' : ' '} ${label}`
}

export function renderGlassesText(s: GlanceState): string {
  switch (s.screen) {
    case 'inbox': {
      const lines = ['GLANCEMAIL — INBOX  (3 new)', '']
      MOCK_EMAILS.forEach((m, i) => {
        const sel = i === s.selectedEmail ? '>' : ' '
        lines.push(`${sel} [${m.priority}] ${m.time} ${m.from}`)
        lines.push(`    ${m.summary}`)
      })
      lines.push('')
      lines.push(s.notice || 'Tap: open  |  Scroll: pick email')
      return lines.join('\n')
    }
    case 'reply': {
      const email = MOCK_EMAILS[0]
      const lines = [`REPLY — ${email.from}`, '']
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
      if (s.replyStatus === 'editing') {
        lines.push('EDIT BY VOICE — speak now.')
        lines.push('Say the new reply, or say')
        lines.push('"cancel" to keep the draft.')
        lines.push('')
        lines.push('Listening...')
        return lines.join('\n')
      }
      lines.push(`Draft: ${s.draft}`)
      lines.push('')
      lines.push(actionLabel('approve', s.replyAction, 'Approve + send'))
      lines.push(actionLabel('edit', s.replyAction, 'Edit by voice'))
      lines.push(actionLabel('discard', s.replyAction, 'Discard'))
      lines.push('')
      lines.push('Tap: run highlighted  |  Scroll: pick')
      lines.push('Voice: "approve" / "edit" / "discard"')
      return lines.join('\n')
    }
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
