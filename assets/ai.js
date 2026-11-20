/* Real AI for the Architect, free by default.
   - "free": a hosted endpoint that needs no key and no account, so the Architect
     always works out of the box. If a saved choice cannot run, the free engine
     takes over, so the app is never stuck behind a key.
   - your own key (optional): OpenAI, OpenRouter or any OpenAI-compatible server.
     The key lives in this browser's localStorage only, never in the site. */
window.PowerplayAI = (function () {
  const KEY = "powerplay.ai.v1";
  const FREE = { baseUrl: "https://text.pollinations.ai/openai", model: "openai" };
  const PRESETS = {
    free: FREE,
    openai: { baseUrl: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
    openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions", model: "openai/gpt-4o-mini" },
    custom: { baseUrl: "", model: "" }
  };
  const NAMES = { free: "free hosted AI", openai: "OpenAI", openrouter: "OpenRouter", custom: "your own server" };

  function settings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    let provider = PRESETS[s.provider] ? s.provider : "free";
    const preset = PRESETS[provider];
    // Each engine has its own fixed address; only "custom" may point anywhere, so a
    // stale address can never send a key to the wrong host or break the free engine.
    let baseUrl = provider === "custom" ? (s.baseUrl || "").trim() : (preset.baseUrl || "").trim();
    const model = (s.model || preset.model || "").trim();
    const key = (s.key || "").trim();
    // Always free: a saved engine that cannot run by itself falls back to the free
    // host, so nobody is ever asked to pay or paste a key to use the Architect.
    const usable = provider === "free" || (provider === "custom" ? !!baseUrl : !!key);
    if (!usable) {
      provider = "free";
      baseUrl = FREE.baseUrl;
    }
    return { provider: provider, baseUrl: baseUrl, model: model || FREE.model, key: key };
  }

  function saveSettings(next) {
    const clean = {
      provider: PRESETS[next.provider] ? next.provider : "free",
      baseUrl: (next.baseUrl || "").trim(),
      model: (next.model || "").trim(),
      key: (next.key || "").trim()
    };
    localStorage.setItem(KEY, JSON.stringify(clean));
    return settings();
  }

  // The free engine is always ready; your own provider needs its key and address.
  function ready() {
    const s = settings();
    if (s.provider === "free") return true;
    return !!(s.baseUrl && (s.provider === "custom" || s.key));
  }

  function label() {
    const s = settings();
    if (s.provider === "free") return "free hosted AI";
    return NAMES[s.provider] + (s.model ? " · " + s.model : "");
  }

  function errorFor(status, body) {
    const err = new Error(
      status === 401 || status === 403
        ? "That key was refused. The free AI takes over — ask again, or clear the key in AI settings."
        : status === 402
        ? "The free AI is having a busy moment. Nothing was lost — ask again in about a minute."
        : status === 429
        ? "The AI is busy right now (rate limit). Give it a few seconds and ask again."
        : "The AI could not be reached (" + status + "). " + String(body || "").slice(0, 120)
    );
    err.code = status === 401 || status === 403 ? "auth" : status === 402 || status === 429 || status >= 500 ? "rate" : "http";
    return err;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // messages: [{role:"system"|"user"|"assistant", content:"..."}]
  async function once(s, opts) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs || 120000);
    try {
      const res = await fetch(s.baseUrl, {
        method: "POST",
        signal: ctl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: s.model,
          messages: opts.messages,
          temperature: opts.temperature == null ? 0.75 : opts.temperature,
          max_tokens: opts.maxTokens || 3200
        })
      });
      const text = await res.text();
      if (!res.ok) throw errorFor(res.status, text);
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("The AI sent something unreadable. Try again."); }
      const choice = (data && data.choices && data.choices[0]) || {};
      const msg = choice.message || {};
      const content = msg.content || msg.reasoning_content || "";
      if (!String(content).trim()) throw new Error("The AI answered with nothing. Try asking again.");
      // "length" means the answer was cut off at the provider's token cap.
      return { text: String(content), engine: data.model || s.model || "AI", truncated: choice.finish_reason === "length" };
    } catch (err) {
      if (err && err.name === "AbortError") {
        const t = new Error("The AI took too long. Try a smaller request, or ask again.");
        t.code = "timeout";
        throw t;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // A busy or dropped connection is retried before the caller falls back:
  // the free host rate-limits bursts, and a build is worth a second try.
  async function ask(opts) {
    const s = settings();
    const attempts = s.provider === "free" ? 3 : 2;
    let last = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await once(s, opts);
      } catch (err) {
        last = err;
        const code = err && err.code;
        const retry = !code || code === "rate" || code === "http";
        if (!retry || i === attempts - 1) break;
        await sleep(1500 * (i + 1));
      }
    }
    // An own key that stops working never blocks the Architect: the free engine answers.
    if (s.provider !== "free") {
      try {
        const out = await once({ baseUrl: FREE.baseUrl, model: FREE.model }, opts);
        out.usedFree = true;
        return out;
      } catch (err) {
        last = err;
      }
    }
    throw last;
  }

  async function test(next) {
    const before = settings();
    if (next) saveSettings(next);
    try {
      const out = await ask({
        messages: [{ role: "user", content: "Reply with exactly: READY" }],
        maxTokens: 12,
        timeoutMs: 45000,
        temperature: 0
      });
      return { ok: /ready/i.test(out.text), engine: out.engine };
    } finally {
      if (next) saveSettings(before);
    }
  }

  return { settings: settings, saveSettings: saveSettings, ready: ready, label: label, ask: ask, test: test, PRESETS: PRESETS };
})();
