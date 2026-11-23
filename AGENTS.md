# POWERPLAY Workshop — notes for future sessions

Static site, no build step: `index.html` (website), `app.html` (generated from it by `/tmp/gen_app.py`),
`assets/*.js`, `assets/styles.css`, real games under `games/<id>/`, three.js vendored in `assets/vendor/`.

## The Architect's AI
- `assets/ai.js` (`window.PowerplayAI`) talks to an OpenAI-compatible endpoint.
  Default `free` = `https://text.pollinations.ai/openai` (no key, CORS `*`);
  providers `openai`, `openrouter`, `custom` take the user's own key, kept in
  localStorage `powerplay.ai.v1` only.
- `assets/architect-ui.js` `respond()` sends every message to the model when
  `PowerplayAI.ready()`; the old deterministic planner survives only as
  `respondOffline()` for "no AI" and as the fallback after a failed call.
- The free host caps one answer near **1,500 completion tokens** and returns
  402/429 when its quota is busy, so: `ask()` retries on rate/http errors,
  edits of files over ~2,400 chars ask for a *compact* complete file, and a
  truncated answer (`finish_reason: length` / no `</html>`) is retried once as
  "under 200 lines".
- `fenceCode()` tolerates a missing closing fence, otherwise a cut-off answer
  looks like prose and no code reaches the Code tab.

## Tests (in /tmp, not committed)
`pp_ai_verify.py` (mocked model), `pp_ai_real.py`, `pp_ai_edit.py`,
`pp_ai_mobile.py`, `pp_chats_verify.py`, `pp_app_verify.py`,
`pp_worker_ai_verify.py`, `pp_restore_verify.py`, `pp_games_verify.py`,
`pp_install*_verify.py`. The Architect always runs on the free hosted AI (no key), so an empty custom
provider now heals to free and reaches the network. A suite that needs deterministic
output stubs `**/text.pollinations.ai/**` with `ctx.route(...)` and returns a
`{"choices":[{"message":{"content":...}}]}` body.

Preview: `nohup python3 /tmp/ppserve.py "$PWD" 4173` then http://127.0.0.1:4173/index.html
(admin `higuy14/cool` / `favgame1`).

Always-free AI: `assets/ai.js` keeps the free host as the engine whenever a saved
choice cannot run (`settings()` heals, `ask()` retries a refused key on it), and no
UI copy asks for a key or payment — a key is an optional upgrade only.

Sync is merge-only (learned the hard way): a device that knows less than another must
never remove what the other has. `assets/cloudsync.js` merges games, edits, Architect
chats and chat messages by id, refuses to apply a payload it cannot merge
(`if (next == null) return false`), and only deletes when a payload names the id in
`deleted` (messages) or `gone` (game pieces). Any new synced key needs its own merge
function. A copy opened on localhost/file:// syncs on the `<TOPIC>-dev` channel, so a
trial run can never touch the workshop's real data. Regression suites:
`/tmp/pp_sync_noloss.py` (nothing lost + restore + named removal),
`/tmp/pp_restore_check.py`, `/tmp/pp_sync_data.py`.

Chats are read by their owners, watched by the admin: `isParticipant` decides whether a
scope is yours, `sendMessage` refuses to post into someone else's chat, and `addComment`
lets an admin leave a marked `{comment:true}` message in a chat they are only watching.
Never post from a watched chat and never let the actor be anyone but the typed-in person.
Suite: `/tmp/pp_watch_comment.py`.
