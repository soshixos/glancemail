# GlanceMail backend — end-to-end curl log

Verified 2026-11-26 ~15:05 WIB. Server started with `node server.js` (port 8787).
No live Gmail send was executed — /send verified via dryRun only.

## 1. GET /api/health
{"ok":true,"gmail":true,"llm":"local-template"}

## 2. GET /api/inbox?limit=3 (real emails from the connected mailbox)
{"emails":[{"id":"1a216cd33114e752","threadId":"1a216cd33114e752","from":"Atlassian","subject":"Discover more in Service Collection","time":"14:41","summary":"Skim later. No action needed.","priority":"LOW","actionable":false,"kind":"newsletter","snippet":"Work smarter, not harder Service Collection Unlock the power of AI-powered service You've covered the essentials in Service Collection – no…"},{"id":"1a21456e294abed5","threadId":"1a21456e294abed5","from":"Handshake","subject":"New (CAN) General Merchandise Associate at Walmart & Sam's Club","time":"03:12","summary":"Skim later. No action needed.","priority":"LOW","actionable":false,"kind":"newsletter","snippet":"YS New job match A new role at Walmart & Sam's Club matches your preferences. Walmart & Sam's Club logo Walmart & Sam's Club (CAN) General…"},{"id":"1a2139f6a7db1e69","threadId":"1a2139f6a7db1e69","from":"Perplexity","subject":"Pilih model AI default Anda (dari OpenAI, Anthropic, Google, dan lainnya)","time":"23:52","summary":"Skim later. No action needed.","priority":"LOW","actionable":false,"kind":"newsletter","snippet":"Dapatkan semua model dengan harga satu langganan ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​ ͏​…"}]}

## 3. POST /api/draft — real reply-kind message (Hookdeck security report receipt, 1a1fc86eafe8595c)
{"draft":"Hi Hookdeck, thank you for confirming. I have noted it and I look forward to the next step. Please let me know if you need anything else from me. Best, Yuni","messageId":"1a1fc86eafe8595c","threadId":"1a1fc86eafe8595c","engine":"local-template","intent":"confirmation"}

## 4. POST /api/draft — newsletter (Atlassian, 1a216cd33114e752) — empty draft, as designed
{"draft":"","messageId":"1a216cd33114e752","threadId":"1a216cd33114e752","engine":"local-template","intent":"newsletter","note":"Newsletter, no reply needed. Skim later."}

## 5. POST /api/send with dryRun:true — exact CLI command, nothing sent
{"ok":true,"dryRun":true,"command":"/opt/hatch/bin/hatch_gws_cli gmail +reply --message-id 1a1fc86eafe8595c --body 'Hi, thank you for confirming. I have noted it and I look forward to the next step. Best, Yuni'","messageId":"1a1fc86eafe8595c"}

## 6. POST /api/pair + GET /api/pair/:code
issued code: 146398 (expired 5 min after issue; shown only as proof the flow works)
{"code":"146398","valid":true}
{"code":"000000","valid":false}
