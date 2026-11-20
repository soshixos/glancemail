// GlanceMail — Gmail inbox triage in 30 seconds + voice reply + next-meeting
// brief, for Even Realities G2. Track 4: AI Assistants & Work.
//
// Built on the official `asr` template: the mic -> STT pipeline, the
// event-routing pattern (see eventTypeOf — CLICK_EVENT is 0 and protobuf
// omits zero-value fields, so a tap arrives with eventType undefined),
// double-tap-to-exit, and the debounced textContainerUpgrade render are
// all kept as-is. What changed: one text container now renders three
// screens (inbox / reply / meeting) from src/screens.ts, and STT final
// text is also parsed as voice commands ("approve", "edit", "discard").
//
// MOCK DATA: inbox, draft reply and meeting come from src/data/mock.ts.
// No real Gmail/Calendar calls, no API keys, no secrets in this repo.
// TODO (MVP): Gmail OAuth via pairing code + Whisper STT backend + real
// send-reply wiring — all through our own server, whitelisted in app.json.

import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { startSttStream } from './asr/stt'
import { mountUi, setStatus, setTranscript, setGlassesText } from './ui'
import {
  initialState,
  renderGlassesText,
  type GlanceState,
  type ReplyAction,
} from './screens'
import { MOCK_EMAILS } from './data/mock'

const state: GlanceState = initialState()

// --- state transitions (shared by glasses events, voice, companion UI) ---

function approveReply() {
  if (state.screen !== 'reply' || state.replyStatus !== 'draft') return
  state.replyStatus = 'approved'
  state.notice = 'Sent (mock — no real send yet)'
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

function openSelectedEmail() {
  const email = MOCK_EMAILS[state.selectedEmail]
  if (!email) return
  if (email.kind === 'newsletter') {
    state.notice = 'Archived — no action needed'
    render()
    return
  }
  if (email.kind === 'meeting') {
    state.screen = 'meeting'
    state.notice = ''
    render()
    return
  }
  state.screen = 'reply'
  state.replyStatus = 'draft'
  state.notice = ''
  render()
}

function cycleSelection(dir: 1 | -1) {
  if (state.screen === 'inbox') {
    state.selectedEmail =
      (state.selectedEmail + dir + MOCK_EMAILS.length) % MOCK_EMAILS.length
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
  if (text.includes('meeting') || text.includes('brief')) {
    state.screen = 'meeting'
    return render()
  }
  if (text.includes('reply')) {
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
    state.screen = 'reply'
    state.replyStatus = 'draft'
    render()
  },
  onGoMeeting: () => {
    state.screen = 'meeting'
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
