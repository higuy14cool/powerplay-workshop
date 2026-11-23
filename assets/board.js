/* The people board: a public, keyless place where the admin's workshop leaves
   the list of accounts so a worker can sign in on his own computer by typing his
   username and passcode — nothing to download, nothing to send.

   It is a ntfy.sh topic: the message outlives the moment it was sent by twelve
   hours, and every open of the admin's workshop publishes it again. Passcodes
   are never sent: only a SHA-256 of "username:passcode", enough to prove a sign
   in and useless to anyone reading the topic. The GitHub copy stays the
   permanent record; this only fills the gap before it is published. */
(function () {
  "use strict";

  const TOPIC = "powerplay-higuy14cool-workshop-people-v2";
  const BASE = "https://ntfy.sh/" + TOPIC;
  const SHAPE = "powerplay-people";

  async function hash(name, pass) {
    if (!window.crypto || !window.crypto.subtle) return null;
    const data = new TextEncoder().encode(
      String(name || "").trim().toLowerCase() + ":" + String(pass || "")
    );
    const buf = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function entry(user, digest) {
    return {
      username: String(user.username || "").trim(),
      role: user.role === "admin" ? "admin" : "worker",
      assigned: Array.isArray(user.assigned) ? user.assigned.slice() : [],
      hash: digest,
    };
  }

  /* Only an admin publishes, and only ever the whole list, so a removed worker
     stays removed instead of drifting back from an older copy. */
  async function publish(users) {
    const people = Array.isArray(users) ? users : [];
    if (!people.length) return false;
    try {
      const rows = [];
      for (const user of people) {
        if (!String(user.username || "").trim()) continue;
        const digest = await hash(user.username, user.passcode);
        if (!digest) return false;
        rows.push(entry(user, digest));
      }
      if (!rows.length) return false;
      const body = JSON.stringify({ v: 1, shape: SHAPE, at: new Date().toISOString(), people: rows });
      const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Title: "POWERPLAY people", Tags: "video_game" },
        body,
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  function read(message) {
    try {
      const data = JSON.parse(message);
      if (!data || data.shape !== SHAPE || !Array.isArray(data.people)) return null;
      const people = data.people.filter((p) => p && String(p.username || "").trim() && p.hash);
      if (!people.length) return null;
      return { at: data.at || null, people };
    } catch (err) {
      return null;
    }
  }

  async function people() {
    try {
      const res = await fetch(BASE + "/json?poll=1&since=all", { cache: "no-store" });
      if (!res.ok) return null;
      const text = await res.text();
      let latest = null;
      text.split("\n").forEach((line) => {
        if (!line.trim()) return;
        let row;
        try {
          row = JSON.parse(line);
        } catch (err) {
          return;
        }
        if (!row || row.event !== "message" || typeof row.message !== "string") return;
        const data = read(row.message);
        if (data) latest = data;
      });
      return latest;
    } catch (err) {
      return null;
    }
  }

  window.PowerplayBoard = { TOPIC, hash, publish, people };
})();
