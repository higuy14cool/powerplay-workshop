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
`pp_install*_verify.py`. Suites that need deterministic offline output set
`powerplay.ai.v1` to an empty `custom` provider through `add_init_script`.

Preview: `nohup python3 /tmp/ppserve.py "$PWD" 4173` then http://127.0.0.1:4173/index.html
(admin `higuy14/cool` / `favgame1`).
