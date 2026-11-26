// GlanceMail backend — Even Realities Hackathon, Track 4 AI Assistants & Work.
// Project: GlanceMail by soshixos. Node built-in http only, zero dependencies.
// Gmail access goes through the connected hatch_gws_cli (server-side, already
// connected account). No LLM keys: drafts are composed by a local intent-based
// composer (engine "local-template"). No secrets in code or logs.
'use strict';

const http = require('http');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT || 8787);
const CLI = '/opt/hatch/bin/hatch_gws_cli';
const CLI_TIMEOUT_MS = 60000;

// ---------------------------------------------------------------- Gmail CLI
function runCli(args) {
  return new Promise((resolve, reject) => {
    execFile(CLI, args, { timeout: CLI_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const e = new Error((stderr || '').trim() || err.message);
          e.code = err.code;
          return reject(e);
        }
        resolve(stdout);
      });
  });
}

// Parse CLI JSON output defensively: object, array, or NDJSON.
function parseCliJson(stdout) {
  const text = String(stdout).trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    const objs = [];
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t.startsWith('{')) { try { objs.push(JSON.parse(t)); } catch (_) {} }
    }
    if (objs.length) return objs.length === 1 ? objs[0] : objs;
    throw new Error('CLI output was not JSON');
  }
}

async function gmailStatus() {
  try {
    const out = await runCli(['gmail', 'status']);
    const j = parseCliJson(out);
    return j.ok === true || j.status === 'connected';
  } catch (_) {
    return false;
  }
}

// Cached Gmail connectivity (refreshed at most every 5 min).
let gmailOkCache = { value: null, at: 0 };
async function gmailOk() {
  if (gmailOkCache.value !== null && Date.now() - gmailOkCache.at < 5 * 60 * 1000) {
    return gmailOkCache.value;
  }
  const v = await gmailStatus();
  gmailOkCache = { value: v, at: Date.now() };
  return v;
}

// ---------------------------------------------------------------- helpers
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}

function cleanText(s, maxLen) {
  let t = decodeEntities(s || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links -> text
    .replace(/[*_#`|>\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLen && t.length > maxLen) t = t.slice(0, maxLen - 1).trimEnd() + '…';
  return t;
}

function senderName(from) {
  const f = String(from || '').trim();
  const m = f.match(/^"?([^"<]+?)"?\s*<[^>]+>/);
  if (m) return m[1].trim();
  const at = f.match(/^([^@\s]+)@/);
  if (at) return at[1];
  return f || 'Unknown sender';
}

function senderEmail(from) {
  const m = String(from || '').match(/<([^>]+)>/);
  return m ? m[1].toLowerCase() : String(from || '').toLowerCase();
}

// Short HH:MM WIB from Gmail's user_local timestamp, e.g. "2026-11-26T14:41:15.000+07:00".
function timeWib(msg) {
  const ul = msg && msg.message_sent_at && msg.message_sent_at.user_local;
  if (typeof ul === 'string' && /T\d{2}:\d{2}/.test(ul)) return ul.slice(11, 16);
  const d = msg && msg.date ? new Date(msg.date) : null;
  if (d && !isNaN(d)) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
    }).format(d);
  }
  return '';
}

// ---------------------------------------------------------------- triage
const JOB_SENDERS = ['clera', 'handshake', 'afterquery', 'vetto', 'joinhandshake'];
const NEWSLETTER_SENDERS = [
  'atlassian', 'lovable', 'perplexity', 'phoenixtraderfunding', 'openai',
  'instagram', 'newsletter', 'noreply', 'no-reply', 'notifications',
  'donotreply', 'do-not-reply', 'marketing', 'promo', 'mailchimp', 'sendgrid',
];
const URGENCY_WORDS = [
  'deadline', 'urgent', 'tomorrow', 'action required', 'interview', 'offer',
  'please reply', 'expires', 'expiring', 'due ', 'asap', 'time-sensitive',
  'final step', 'next step', 'application', 'selected', 'congratulations',
];
const QUESTION_HINTS = ['?', 'could you', 'can you', 'please share', 'please send',
  'please let', 'let us know', 'would you', 'are you available', 'please confirm'];

function isNewsletter(msg, bodyText) {
  const from = senderEmail(msg.from);
  const name = senderName(msg.from).toLowerCase();
  const subj = String(msg.subject || '').toLowerCase();
  const hay = (subj + ' ' + String(msg.snippet || '') + ' ' + (bodyText || '')).toLowerCase();
  if (/newsletter|weekly digest|unsubscribe|view in browser|skim/.test(hay)) return true;
  if (/newsletter|digest|weekly|black friday|sale|discount|% off/.test(subj)) return true;
  if (NEWSLETTER_SENDERS.some((k) => from.includes(k) || name.includes(k))) return true;
  if (/^(noreply|no-reply|donotreply|notifications?|hello|team|info)@/.test(from)) return true;
  return false;
}

function scoreEmail(msg, bodyText) {
  const from = senderEmail(msg.from);
  const name = senderName(msg.from).toLowerCase();
  const subj = String(msg.subject || '').toLowerCase();
  const text = (subj + ' ' + String(msg.snippet || '') + ' ' + (bodyText || '')).toLowerCase();
  let score = 0;

  if (JOB_SENDERS.some((k) => from.includes(k) || name.includes(k))) score += 30;
  const isNoReply = /noreply|no-reply|donotreply|notifications?@/.test(from);
  if (!isNoReply && !/^(info|hello|team|support)@/.test(from)) score += 10; // real person
  if (isNoReply) score -= 15;

  for (const w of URGENCY_WORDS) if (text.includes(w)) score += 8;
  if (QUESTION_HINTS.some((q) => text.includes(q))) score += 10;
  if (/invite|meeting|call|calendar/.test(text)) score += 5;

  return score;
}

function oneLineSummary(msg, bodyText, kind) {
  if (kind === 'newsletter') return 'Skim later. No action needed.';
  const body = cleanText(bodyText || '', 0);
  // Prefer the first real sentence of the body; fall back to the snippet.
  const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25);
  let s = sentences.find((x) => !/unsubscribe|view in browser|manage (your )?email|privacy policy/i.test(x));
  if (!s) s = cleanText(msg.snippet || '', 0);
  if (!s) s = String(msg.subject || 'No preview available.');
  s = s.replace(/^(hi|hello|dear)\s+\w+[,! ]+/i, '');
  return cleanText(s, 110);
}

function triageMessages(messages, bodiesById) {
  const scored = messages.map((m) => {
    const body = (bodiesById[m.id] && bodiesById[m.id].body_text) || '';
    const kind = isNewsletter(m, body) ? 'newsletter' : 'reply';
    let score = scoreEmail(m, body);
    if (kind === 'newsletter') score = Math.min(score, -1);
    const priority = score >= 40 ? 'HIGH' : score >= 15 ? 'MED' : 'LOW';
    const actionable = kind === 'reply' && (score >= 15 || QUESTION_HINTS.some((q) =>
      ((m.subject || '') + ' ' + (m.snippet || '') + ' ' + body).toLowerCase().includes(q)));
    return {
      id: m.id,
      threadId: (bodiesById[m.id] && bodiesById[m.id].thread_id) || m.id,
      from: senderName(m.from),
      subject: cleanText(m.subject, 120),
      time: timeWib(m),
      summary: oneLineSummary(m, body, kind),
      priority,
      actionable,
      kind,
      snippet: cleanText(m.snippet, 140),
      _score: score,
    };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored.map(({ _score, ...rest }) => rest);
}

// ---------------------------------------------------------------- draft composer
// Local intent-based composer. No external calls, no keys. Uses Yuni's real
// facts only; never invents a number, date, employer or outcome.
const YUNI_FACTS = {
  name: 'Yuni Agung Saputra',
  degree: 'Agroteknologi graduate, Universitas Muhammadiyah Purwokerto, January 2026',
  english: 'English Intermediate',
};

function classifyIntent(subject, body) {
  const t = ((subject || '') + ' ' + (body || '')).toLowerCase();
  if (/interview|intro call|screening call|invite you (to|for) (a|an) (call|meeting|interview)/.test(t)) return 'interview';
  if (/offer|congratulations|you (are|have been) selected|we would like to (offer|hire)/.test(t)) return 'offer';
  if (/could you|can you|please (share|send|answer|complete|fill|confirm)|your (answer|response|feedback)|question/i.test(t)) return 'request';
  if (/following up|checking in|just checking|any update|status update|gentle reminder/.test(t)) return 'follow-up';
  if (/confirm(ed|ation)|received your|thank you for (applying|your application)|application received/.test(t)) return 'confirmation';
  return 'other';
}

function composeDraft(intent, firstName) {
  const hi = firstName ? `Hi ${firstName},` : 'Hi,';
  const grad = `I am ${YUNI_FACTS.name}, a fresh ${YUNI_FACTS.degree}.`;
  const sign = 'Best, Yuni';
  const drafts = {
    interview: `${hi} thank you for the invitation. I would be glad to join the call. ${grad} I am interested in the role and I will prepare for our conversation. Please let me know the time that works best, and I will be there. ${sign}`,
    offer: `${hi} thank you very much for the offer. I am excited about the opportunity and I accept it with pleasure. Please let me know the next steps and anything you need from me. ${sign}`,
    request: `${hi} thank you for your message. I am happy to share what you asked for. ${grad} I also have hands-on experience with AI writing and evaluation work, including Clera roles and AfterQuery. Please let me know the format you prefer and I will send it soon. ${sign}`,
    'follow-up': `${hi} thank you for the update. I am still interested and happy to help with the next step. Please let me know what you need from me. ${sign}`,
    confirmation: `${hi} thank you for confirming. I have noted it and I look forward to the next step. Please let me know if you need anything else from me. ${sign}`,
    other: `${hi} thank you for your message. I have read it and I will get back to you with an answer soon. Please let me know if there is anything urgent in the meantime. ${sign}`,
  };
  // Plain human text only: strip any asterisk/markdown defensively, enforce <80 words.
  let d = (drafts[intent] || drafts.other).replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  const words = d.split(' ');
  if (words.length > 80) d = words.slice(0, 80).join(' ');
  return { draft: d, intent };
}

// ---------------------------------------------------------------- pairing codes
const pairCodes = new Map(); // code -> { expiresAt }
function newPairCode() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pairCodes.set(code, { expiresAt: Date.now() + 300 * 1000 });
  return code;
}
function pairValid(code) {
  const rec = pairCodes.get(code);
  if (!rec) return false;
  if (Date.now() > rec.expiresAt) { pairCodes.delete(code); return false; }
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [c, r] of pairCodes) if (now > r.expiresAt) pairCodes.delete(c);
}, 60000).unref();

// ---------------------------------------------------------------- inbox cache
// Triage costs Gmail request units; cache the triaged list briefly (2 min).
let inboxCache = { at: 0, emails: null };
const INBOX_CACHE_MS = 2 * 60 * 1000;

async function fetchInbox(limit) {
  if (inboxCache.emails && Date.now() - inboxCache.at < INBOX_CACHE_MS) {
    return inboxCache.emails.slice(0, limit);
  }
  const out = await runCli(['gmail', '+triage', '--query', 'in:inbox is:unread', '--max', '10', '--format', 'json']);
  const j = parseCliJson(out);
  const messages = Array.isArray(j) ? j : (j.messages || []);
  if (!messages.length) {
    inboxCache = { at: Date.now(), emails: [] };
    return [];
  }
  // Score on snippet first, then read full bodies only for the top 3.
  const prelim = triageMessages(messages, {});
  const top = prelim.slice(0, 3);
  let bodiesById = {};
  try {
    const args = ['gmail', '+read', '--format', 'json'];
    for (const m of top) args.push('--id', m.id);
    const readOut = await runCli(args);
    const readJson = parseCliJson(readOut);
    const arr = Array.isArray(readJson) ? readJson : (readJson.messages || [readJson]);
    for (const r of arr) if (r && r.id) bodiesById[r.id] = r;
  } catch (e) {
    // Body reads are a refinement; fall back to snippet-only triage.
    console.error('inbox body read failed, using snippets:', e.message);
  }
  const emails = triageMessages(messages, bodiesById).slice(0, limit);
  inboxCache = { at: Date.now(), emails: triageMessages(messages, bodiesById) };
  return emails;
}

async function readMessage(messageId) {
  const out = await runCli(['gmail', '+read', '--id', messageId, '--format', 'json']);
  const j = parseCliJson(out);
  const arr = Array.isArray(j) ? j : (j.messages || [j]);
  const m = arr.find((x) => x && x.id) || arr[0];
  if (!m || !m.id) throw new Error('Message not found: ' + messageId);
  return m;
}

// ---------------------------------------------------------------- HTTP
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (_) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  console.log(`${req.method} ${path}`); // method+path only, never bodies/tokens

  try {
    if (req.method === 'OPTIONS') { sendJson(res, 204, {}); return; }

    if (req.method === 'GET' && path === '/api/health') {
      sendJson(res, 200, { ok: true, gmail: await gmailOk(), llm: 'local-template' });
      return;
    }

    if (req.method === 'GET' && path === '/api/inbox') {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '3', 10) || 3, 1), 10);
      const emails = await fetchInbox(limit);
      sendJson(res, 200, { emails });
      return;
    }

    if (req.method === 'POST' && path === '/api/draft') {
      const body = await readBody(req);
      if (!body.messageId) { sendJson(res, 400, { error: 'messageId is required' }); return; }
      const msg = await readMessage(body.messageId);
      const kind = isNewsletter(msg, msg.body_text) ? 'newsletter' : 'reply';
      if (kind === 'newsletter') {
        sendJson(res, 200, {
          draft: '', messageId: msg.id, threadId: msg.thread_id || msg.id,
          engine: 'local-template', intent: 'newsletter',
          note: 'Newsletter, no reply needed. Skim later.',
        });
        return;
      }
      const firstName = (msg.from && msg.from.name ? msg.from.name : senderName(msg.from || '')).split(' ')[0];
      const { draft, intent } = composeDraft(classifyIntent(msg.subject, msg.body_text), firstName);
      sendJson(res, 200, {
        draft, messageId: msg.id, threadId: msg.thread_id || msg.id,
        engine: 'local-template', intent,
      });
      return;
    }

    if (req.method === 'POST' && path === '/api/send') {
      const body = await readBody(req);
      if (!body.messageId) { sendJson(res, 400, { ok: false, error: 'messageId is required' }); return; }
      if (!body.body) { sendJson(res, 400, { ok: false, error: 'body is required' }); return; }
      // Exact CLI command that would run (dryRun) or does run (live).
      const cmd = `${CLI} gmail +reply --message-id ${body.messageId} --body '${String(body.body).replace(/'/g, "'\\''")}'`;
      if (body.dryRun === true) {
        sendJson(res, 200, { ok: true, dryRun: true, command: cmd, messageId: body.messageId });
        return;
      }
      try {
        const out = await runCli(['gmail', '+reply', '--message-id', body.messageId, '--body', String(body.body)]);
        let sentId = null;
        try {
          const j = parseCliJson(out);
          sentId = j.id || j.messageId || j.sentMessageId || (j.message && j.message.id) || null;
        } catch (_) { /* non-JSON output; still a success if CLI exited 0 */ }
        sendJson(res, 200, { ok: true, sentMessageId: sentId || body.messageId });
      } catch (e) {
        sendJson(res, 502, { ok: false, error: 'Gmail send failed: ' + e.message });
      }
      return;
    }

    if (req.method === 'POST' && path === '/api/pair') {
      const code = newPairCode();
      sendJson(res, 200, { code, expiresIn: 300 });
      return;
    }

    if (req.method === 'GET' && path.startsWith('/api/pair/')) {
      const code = decodeURIComponent(path.slice('/api/pair/'.length));
      sendJson(res, 200, { code, valid: pairValid(code) });
      return;
    }

    if (req.method === 'GET' && path === '/') {
      sendJson(res, 200, { service: 'GlanceMail backend', by: 'soshixos', endpoints: ['GET /api/health', 'GET /api/inbox?limit=3', 'POST /api/draft', 'POST /api/send', 'POST /api/pair', 'GET /api/pair/:code'] });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('error', req.method, path, e.message);
    sendJson(res, 502, { error: e.message || 'Upstream Gmail error' });
  }
});

server.listen(PORT, () => {
  console.log(`GlanceMail backend listening on http://localhost:${PORT}`);
});
