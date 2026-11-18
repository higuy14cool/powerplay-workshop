/* Real AI for the Architect.
   Two ways to reach a model:
   - "free" (default): a hosted OpenAI-compatible endpoint that needs no key, so the
     Architect can really build from a phone with nothing to set up.
   - your own key: OpenAI, OpenRouter or any OpenAI-compatible server (Groq, Ollama...).
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
    const provider = PRESETS[s.provider] ? s.provider : "free";
    const preset = PRESETS[provider];
    return {
      provider: provider,
      baseUrl: (s.baseUrl || preset.baseUrl || "").trim(),
      model: (s.model || preset.model || "").trim(),
      key: (s.key || "").trim()
    };
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

  // Free hosting needs no key; your own provider needs a key and an address.
  function ready() {
    const s = settings();
    if (s.provider === "free") return !!s.baseUrl;
    return !!(s.key && s.baseUrl);
  }

  function label() {
    const s = settings();
    if (s.provider === "free") return "free hosted AI";
    return NAMES[s.provider] + (s.model ? " · " + s.model : "");
  }

  function errorFor(status, body) {
    const err = new Error(
      status === 401 || status === 403
        ? "That key was refused. Check it in AI settings — or switch back to the free hosted AI."
        : status === 402
        ? "The free AI has used up its free answers for the moment. Add your own key in AI settings (the chip at the top of this panel), or ask again in a minute."
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
    if (!ready()) throw new Error("No AI is set up. Open AI settings and add one.");
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
