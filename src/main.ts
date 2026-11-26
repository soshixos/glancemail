// GlanceMail — Gmail inbox triage in 30 seconds + voice reply, for Even
// Realities G2. Track 4: AI Assistants & Work.
//
// Built on the official `asr` template: the mic -> STT pipeline, the
// event-routing pattern (see eventTypeOf — CLICK_EVENT is 0 and protobuf
// omits zero-value fields, so a tap arrives with eventType undefined),
// double-tap-to-exit, and the debounced textContainerUpgrade render are
// all kept as-is. What changed: one text container now renders the inbox
// and reply screens from src/screens.ts, and STT final text is also parsed
// as voice commands ("approve", "edit", "discard").
//
// LIVE BACKEND: inbox, AI draft and send go through our own server
// (src/data/backend.ts, default http://localhost:8787). If the backend is
// unreachable the app falls back to src/data/mock.ts and says so
// ("OFFLINE — mock data") in the companion footer and on the glasses.
// No API keys, no secrets in this repo.
// Meeting brief: CUT in the MVP (see screens.ts) — the backend never
// returns kind "meeting" and meeting emails are filtered from the inbox.

import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { startSttStream } from './asr/stt'
import {
  mountUi,
  setStatus,
  setTranscript,
  setGlassesText,
  setBackendStatus,
} from './ui'
import {
  initialState,
  renderGlassesText,
  fallbackEmails,
  type GlanceState,
  type ReplyAction,
} from './screens'
import { MOCK_DRAFT_REPLY } from './data/mock'
import { getInbox, getDraft, sendReply } from './data/backend'

const state: GlanceState = initialState()

// --- backend: live inbox load (mock fallback when unreachable) ---

async function loadInbox() {
  state.inboxLoading = true
  state.offline = false
  setBackendStatus('connecting')
  render()
  try {
    const { emails } = await getInbox(3)
    // Meeting brief is CUT in the MVP: drop any meeting-kind email so the
    // meeting screen stays unreachable even if the backend ever sends one.
    state.emails = emails.filter(e => e.kind !== 'meeting')
    if (state.selectedEmail >= state.emails.length) state.selectedEmail = 0
    state.offline = false
    state.notice = ''
    setBackendStatus('live')
  } catch (err) {
    console.warn('Backend unreachable — showing mock data:', err)
    state.emails = fallbackEmails()
    state.offline = true
    state.notice = 'OFFLINE - mock data'
    setBackendStatus('offline')
  } finally {
    state.inboxLoading = false
    render()
  }
}

// --- state transitions (shared by glasses events, voice, companion UI) ---

async function approveReply() {
  if (state.screen !== 'reply') return
  if (state.replyStatus !== 'draft') return
  const email = state.emails[state.selectedEmail]
  if (!email) return
  state.replyStatus = 'sending'
  state.notice = ''
  render()
  try {
    await sendReply(email.id, state.draft)
    state.replyStatus = 'approved'
    state.notice = 'Sent.'
  } catch (err) {
    console.warn('Send failed:', err)
    state.replyStatus = 'draft'
    state.notice = `Send failed: ${(err as Error)?.message ?? 'backend error'}`
  }
  render()
}

function discardReply() {
  if (state.screen !== 'reply' || state.replyStatus !== 'draft') return
  state.replyStatus = 'discarded'
  render()
}

function startEdit() {
  if (state.screen !== 'reply' || state.replyStatus !== 'draft') return
  state.replyStatus = 'editing'
  render()
}

function cancelEdit() {
  if (state.replyStatus !== 'editing') return
  state.replyStatus = 'draft'
  render()
}

async function openSelectedEmail() {
  const email = state.emails[state.selectedEmail]
  if (!email) return
  if (email.kind === 'newsletter') {
    state.notice = 'Archived — no action needed'
    render()
    return
  }
  if (email.kind === 'meeting') {
    // CUT in MVP — unreachable (filtered from the inbox); defensive only.
    state.notice = 'Meeting brief cut in MVP'
    render()
    return
  }
  state.screen = 'reply'
  state.replyStatus = 'drafting'
  state.replyAction = 'approve'
  state.notice = ''
  render()
  if (state.offline) {
    // No backend: keep the mock draft and say so.
    state.draft = MOCK_DRAFT_REPLY
    state.replyStatus = 'draft'
    state.notice = 'OFFLINE - mock draft'
    render()
    return
  }
  try {
    const { draft } = await getDraft(email.id)
    state.draft = draft
    state.replyStatus = 'draft'
    state.notice = ''
  } catch (err) {
    console.warn('Draft fetch failed — keeping mock draft:', err)
    state.draft = MOCK_DRAFT_REPLY
    state.replyStatus = 'draft'
    state.notice = 'Draft failed - mock draft'
  }
  render()
}

function cycleSelection(dir: 1 | -1) {
  if (state.screen === 'inbox') {
    state.selectedEmail =
      (state.selectedEmail + dir + state.emails.length) % state.emails.length
    state.notice = ''
  } else if (state.screen === 'reply' && state.replyStatus === 'draft') {
    const order: ReplyAction[] = ['approve', 'edit', 'discard']
    const i = order.indexOf(state.replyAction)
    state.replyAction = order[(i + dir + order.length) % order.length]
  }
  render()
}

/** Tap = primary action for the current screen. */
function primaryAction() {
  if (state.screen === 'inbox') return openSelectedEmail()
  if (state.screen === 'meeting') {
    state.screen = 'inbox'
    state.notice = ''
    return render()
  }
  // reply screen
  if (state.replyStatus === 'approved' || state.replyStatus === 'discarded') {
    state.screen = 'inbox'
    state.replyStatus = 'draft'
    state.notice = ''
    return render()
  }
  if (state.replyStatus === 'editing') return cancelEdit()
  if (state.replyStatus === 'drafting' || state.replyStatus === 'sending') return
  if (state.replyAction === 'approve') return approveReply()
  if (state.replyAction === 'edit') return startEdit()
  return discardReply()
}

/** Voice commands from STT final text (or the companion "simulate voice" box). */
function handleVoiceCommand(raw: string) {
  const text = raw.toLowerCase().trim()
  if (!text) return
  if (state.replyStatus === 'editing') {
    if (text.includes('cancel')) return cancelEdit()
    if (text.length > 3) {
      state.draft = raw.trim()
      state.replyStatus = 'draft'
      state.notice = 'Draft updated by voice'
      return render()
    }
    return
  }
  if (text.includes('approve') || text === 'yes' || text.includes('send it')) {
    if (state.screen === 'reply') return approveReply()
  }
  if (text.includes('discard') || text === 'no') {
    if (state.screen === 'reply') return discardReply()
  }
  if (text.includes('edit')) {
    if (state.screen === 'reply') return startEdit()
  }
  if (text.includes('reply')) {
    if (state.screen === 'inbox') return openSelectedEmail()
    state.screen = 'reply'
    return render()
  }
  if (text.includes('inbox')) {
    state.screen = 'inbox'
    return render()
  }
}

// Companion UI (browser preview) drives the same transitions.
mountUi({
  onTap: primaryAction,
  onScrollUp: () => cycleSelection(-1),
  onScrollDown: () => cycleSelection(1),
  onVoice: handleVoiceCommand,
  onApprove: approveReply,
  onEdit: startEdit,
  onDiscard: discardReply,
  onOpenReply: () => {
    if (state.screen === 'inbox') return openSelectedEmail()
    state.screen = 'reply'
    state.replyStatus = 'draft'
    render()
  },
  onGoMeeting: () => {
    // Meeting brief CUT in the MVP — button hidden in the companion UI.
    state.notice = 'Meeting brief cut in MVP'
    render()
  },
  onGoInbox: () => {
    state.screen = 'inbox'
    state.replyStatus = 'draft'
    state.notice = ''
    render()
  },
})

// --- Even Hub bridge ---

const bridge = await waitForEvenAppBridge()

const container = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 1,
  containerName: 'main',
  content: renderGlassesText(state),
  isEventCapture: 1,
})

const created = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [container] }),
)
if (created !== 0) {
  setStatus('error', `createStartUpPageContainer failed: ${created}`)
  console.error('Failed to create startup page')
}

let lastRender = ''
let renderTimer: number | null = null

function render() {
  const content = renderGlassesText(state)
  setGlassesText(content)
  if (renderTimer !== null) return
  renderTimer = window.setTimeout(async () => {
    renderTimer = null
    if (content === lastRender) return
    lastRender = content
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 1, containerName: 'main', content }),
    )
  }, 120) // debounce display writes — BLE render queue is slow
}

render()

// Load the real inbox now (falls back to mock data if the backend is down).
void loadInbox()

// --- mic -> STT (template stub: throws until a provider is wired in) ---

const API_KEY = import.meta.env.VITE_STT_API_KEY as string
let lastHandledFinal = ''
let stt: ReturnType<typeof startSttStream> | null = null
try {
  stt = startSttStream(
    API_KEY,
    ({ finalText, interimText }) => {
      setTranscript(finalText, interimText)
      const final = finalText.trim()
      if (final && final !== lastHandledFinal) {
        lastHandledFinal = final
        handleVoiceCommand(final)
      }
      render()
    },
    err => {
      setStatus('error', `STT error: ${(err as Error)?.message ?? err}`)
      console.error('STT error:', err)
    },
  )
} catch (err) {
  // Expected until src/asr/stt.ts is wired to a real provider (Whisper).
  // The app stays fully usable via tap/scroll + companion buttons.
  setStatus('error', (err as Error)?.message ?? 'STT startup failed')
  console.warn('STT not wired yet — voice via companion UI only:', err)
}

if (stt) {
  await bridge.audioControl(true)
  setStatus('listening', 'Mic live · tap = action · double-tap = exit')
} else {
  setStatus('paused', 'STT not wired — tap/scroll + companion buttons work')
}

// --- events: same routing pattern as the asr template ---

let cleanedUp = false
function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  bridge.audioControl(false)
  stt?.close()
  unsubscribe()
}

function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

const unsubscribe = bridge.onEvenHubEvent(event => {
  const pcm = event.audioEvent?.audioPcm
  if (pcm) stt?.sendPcm(pcm)

  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)

  if (
    sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    textType === OsEventTypeList.DOUBLE_CLICK_EVENT
  ) {
    bridge.shutDownPageContainer(1)
    return
  }

  if (
    sysType === OsEventTypeList.SCROLL_TOP_EVENT ||
    textType === OsEventTypeList.SCROLL_TOP_EVENT
  ) {
    cycleSelection(-1)
    return
  }
  if (
    sysType === OsEventTypeList.SCROLL_BOTTOM_EVENT ||
    textType === OsEventTypeList.SCROLL_BOTTOM_EVENT
  ) {
    cycleSelection(1)
    return
  }

  if (
    sysType === OsEventTypeList.CLICK_EVENT ||
    textType === OsEventTypeList.CLICK_EVENT
  ) {
    primaryAction()
    return
  }

  if (
    sysType === OsEventTypeList.SYSTEM_EXIT_EVENT ||
    sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT
  ) {
    cleanup()
  }
})

window.addEventListener('beforeunload', cleanup)
