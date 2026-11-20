// GlanceMail companion UI — the browser preview shown next to the glasses.
// It mirrors the 576x288 glasses canvas and exposes every glasses action as
// a button, so the app is fully demoable without hardware or a wired STT
// provider. Buttons call the same transitions as tap / scroll / voice.

export interface CompanionCallbacks {
  onTap: () => void
  onScrollUp: () => void
  onScrollDown: () => void
  onVoice: (text: string) => void
  onApprove: () => void
  onEdit: () => void
  onDiscard: () => void
  onOpenReply: () => void
  onGoMeeting: () => void
  onGoInbox: () => void
}

type Status = 'connecting' | 'listening' | 'paused' | 'error'

let statusEl: HTMLDivElement
let finalEl: HTMLSpanElement
let interimEl: HTMLSpanElement
let glassesEl: HTMLPreElement

export function mountUi(cb: CompanionCallbacks) {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <main class="panel">
      <header>
        <h1>GlanceMail — companion preview</h1>
        <div id="status" class="status status-connecting">Connecting…</div>
      </header>
      <p class="hint">What the G2 glasses show (576×288, monochrome green):</p>
      <pre id="glasses" class="glasses" aria-label="Glasses display preview"></pre>
      <section class="controls">
        <button data-act="tap">Tap (primary action)</button>
        <button data-act="up">Scroll up</button>
        <button data-act="down">Scroll down</button>
        <button data-act="inbox">Inbox</button>
        <button data-act="reply">Reply screen</button>
        <button data-act="meeting">Meeting brief</button>
        <button data-act="approve">Approve + send</button>
        <button data-act="edit">Edit by voice</button>
        <button data-act="discard">Discard</button>
      </section>
      <section class="voice">
        <input id="voice-input" type="text" placeholder='Simulate voice: try "approve" or "meeting"' />
        <button data-act="voice">Send as voice</button>
      </section>
      <section class="transcript" aria-live="polite">
        <span id="final"></span><span id="interim" class="interim"></span>
      </section>
      <footer>Mock data only — no real Gmail/Calendar calls yet. Tap the glasses temple for the primary action · double-tap to exit.</footer>
    </main>
  `
  statusEl = app.querySelector<HTMLDivElement>('#status')!
  finalEl = app.querySelector<HTMLSpanElement>('#final')!
  interimEl = app.querySelector<HTMLSpanElement>('#interim')!
  glassesEl = app.querySelector<HTMLPreElement>('#glasses')!
  const voiceInput = app.querySelector<HTMLInputElement>('#voice-input')!

  app.querySelectorAll<HTMLButtonElement>('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act
      if (act === 'tap') cb.onTap()
      else if (act === 'up') cb.onScrollUp()
      else if (act === 'down') cb.onScrollDown()
      else if (act === 'inbox') cb.onGoInbox()
      else if (act === 'reply') cb.onOpenReply()
      else if (act === 'meeting') cb.onGoMeeting()
      else if (act === 'approve') cb.onApprove()
      else if (act === 'edit') cb.onEdit()
      else if (act === 'discard') cb.onDiscard()
      else if (act === 'voice') {
        const text = voiceInput.value.trim()
        if (text) {
          cb.onVoice(text)
          voiceInput.value = ''
        }
      }
    })
  })
  voiceInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const text = voiceInput.value.trim()
      if (text) {
        cb.onVoice(text)
        voiceInput.value = ''
      }
    }
  })
  injectStyles()
}

export function setStatus(kind: Status, text: string) {
  if (!statusEl) return
  statusEl.className = `status status-${kind}`
  statusEl.textContent = text
}

export function setTranscript(finalText: string, interimText: string) {
  if (!finalEl) return
  finalEl.textContent = finalText
  interimEl.textContent = interimText
}

export function setGlassesText(text: string) {
  if (!glassesEl) return
  glassesEl.textContent = text
}

function injectStyles() {
  const css = `
    :root { color-scheme: dark; }
    html, body { margin: 0; min-height: 100%; background: #232323; color: #E5E5E5;
      font: 16px/1.4 -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif;
      touch-action: manipulation; -webkit-text-size-adjust: 100%;
      overscroll-behavior: none; }
    #app { display: flex; min-height: 100%; }
    .panel { display: flex; flex-direction: column; gap: 12px;
      width: 100%; max-width: 640px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.02em; }
    .hint { margin: 0; font-size: 13px; color: #A7A7A7; }
    .status { font-size: 12px; padding: 4px 10px; border-radius: 999px;
      border: 1px solid transparent; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
    .status-connecting { color: #A7A7A7; border-color: #3E3E3E; }
    .status-listening  { color: #3CFA44; border-color: #3CFA44; background: rgba(60,250,68,0.08); }
    .status-paused     { color: #E5E5E5; border-color: #7B7B7B; background: rgba(229,229,229,0.06); }
    .status-error      { color: #FF453A; border-color: #FF453A; background: rgba(255,69,58,0.08); }
    .glasses { margin: 0; width: 576px; max-width: 100%; height: 288px; box-sizing: border-box;
      background: #0a2a0c; color: #3CFA44; border: 2px solid #3E3E3E; border-radius: 8px;
      padding: 10px 12px; font: 13px/1.45 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      white-space: pre-wrap; word-break: break-word; overflow: hidden; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; }
    .controls button, .voice button { background: #2E2E2E; color: #E5E5E5; border: 1px solid #3E3E3E;
      border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 14px; cursor: pointer; }
    .controls button:hover, .voice button:hover { border-color: #3CFA44; }
    .voice { display: flex; gap: 8px; }
    .voice input { flex: 1; background: #2E2E2E; color: #E5E5E5; border: 1px solid #3E3E3E;
      border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 14px; }
    .transcript { background: #2E2E2E; border: 1px solid #3E3E3E; color: #E5E5E5;
      border-radius: 12px; padding: 12px 16px; font-size: 15px; line-height: 1.5;
      min-height: 24px; white-space: pre-wrap; word-break: break-word; }
    .transcript:empty::before { content: 'Transcript (STT) appears here…'; color: #7B7B7B; }
    .interim { color: #919191; }
    footer { font-size: 12px; color: #7B7B7B; text-align: center; }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
