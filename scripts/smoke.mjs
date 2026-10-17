// End-to-end check against a running dev server (DEV_SKIP_ACCESS=true, localhost).
// Usage: node scripts/smoke.mjs [baseUrl]   (default http://localhost:5173)
import { createHash, randomBytes } from "node:crypto";

const base = (process.argv[2] ?? "http://localhost:5173").replace(/\/+$/, "");
let failures = 0;

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail !== undefined ? ` -- ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
  return ok;
}

async function api(method, path, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(`${base}/api${path}`, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {}
  return { status: res.status, json, text };
}

const hook = (slug, path = "", init = {}) => fetch(`${base}/h/${slug}${path}`, init);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const digestOf = (bytes) => sha256(bytes).slice(0, 32);
const latest = async (slug) => (await api("GET", `/endpoints/${slug}/requests`)).json?.[0];
const detail = async (slug, id) => (await api("GET", `/endpoints/${slug}/requests/${id}`)).json;

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(base);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`server at ${base} did not respond`);
}

await waitForServer();
const tag = randomBytes(3).toString("hex");
const created = [];

// --- endpoints -------------------------------------------------------------
const random = await api("POST", "/endpoints", { name: "  smoke random  " });
check("create endpoint with random slug -> 201", random.status === 201, random);
check("random slug length >= 10", random.json?.slug?.length >= 10, random.json);
check("name is trimmed", random.json?.name === "smoke random", random.json);
check("new endpoint gets the default response", random.json?.response?.status === 200 && random.json?.response?.body === '{"ok":true}', random.json);
const slug = random.json.slug;
created.push(slug);

const customSlug = `smoke-${tag}`;
const custom = await api("POST", "/endpoints", { slug: customSlug });
check("create endpoint with custom slug -> 201", custom.status === 201 && custom.json?.slug === customSlug, custom);
created.push(customSlug);
const dup = await api("POST", "/endpoints", { slug: customSlug });
check("duplicate custom slug -> 409", dup.status === 409 && typeof dup.json?.error === "string", dup);
const badSlug = await api("POST", "/endpoints", { slug: "Bad Slug!" });
check("invalid slug -> 400 {error}", badSlug.status === 400 && typeof badSlug.json?.error === "string", badSlug);
const badJson = await api("POST", "/endpoints", "{not json");
check("invalid JSON body -> 400 {error}", badJson.status === 400 && typeof badJson.json?.error === "string", badJson);
const unknownApi = await api("GET", "/nope");
check("unknown /api path -> 404 JSON", unknownApi.status === 404 && typeof unknownApi.json?.error === "string", unknownApi);
const list = await api("GET", "/endpoints");
check("list endpoints, newest first", list.status === 200 && list.json?.[0]?.slug === customSlug && list.json.some((e) => e.slug === slug), list.json?.slice(0, 2));
check("get unknown endpoint -> 404", (await api("GET", "/endpoints/no-such-endpoint")).status === 404);

// --- ingress capture ---------------------------------------------------------
const res1 = await hook(slug, "/a/b?x=1&x=2", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", "x-smoke": "1" },
  body: '{"a":1}',
});
const res1Body = await res1.text();
check("ingress POST -> 200 {\"ok\":true}", res1.status === 200 && res1Body === '{"ok":true}', { status: res1.status, res1Body });
check("ingress ACAO *", res1.headers.get("access-control-allow-origin") === "*");
check("ingress nosniff + CSP sandbox", res1.headers.get("x-content-type-options") === "nosniff" && res1.headers.get("content-security-policy") === "sandbox");

const s1 = await latest(slug);
check("summary: method/path/contentType/size", s1?.method === "POST" && s1?.path === "/a/b" && s1?.contentType === "application/x-www-form-urlencoded" && s1?.size === 7 && !("body" in s1), s1);
const d1 = await detail(slug, s1?.id);
check("detail: query keeps duplicate x", JSON.stringify(d1?.query) === JSON.stringify([["x", "1"], ["x", "2"]]), d1?.query);
check("detail: headers captured", d1?.headers?.some(([k, v]) => k === "x-smoke" && v === "1") && d1.headers.some(([k]) => k === "content-type"), d1?.headers);
check("detail: body utf8, not truncated", d1?.body === '{"a":1}' && d1?.bodyEncoding === "utf8" && d1?.truncated === false, d1);
check("endpoint requestCount/lastRequestAt updated", await api("GET", `/endpoints/${slug}`).then((r) => r.json?.requestCount === 1 && r.json?.lastRequestAt > 0));

const ep404 = await hook("no-such-endpoint");
check("unknown slug -> 404 text", ep404.status === 404 && ep404.headers.get("access-control-allow-origin") === "*" && ep404.headers.get("content-type")?.startsWith("text/plain"));
check("invalid slug -> 404", (await hook("NO")).status === 404);

await hook(slug, "/");
const sGet = await latest(slug);
const dGet = await detail(slug, sGet?.id);
check("bodyless GET: path '/', empty utf8 body", sGet?.path === "/" && dGet?.body === "" && dGet?.bodyEncoding === "utf8" && dGet?.size === 0, dGet);
check("empty body digest = sha256('') prefix", sGet?.digest === digestOf("") && dGet?.digest === sGet?.digest, sGet?.digest);
await hook(slug);
check("no sub-path -> path ''", (await latest(slug))?.path === "");

// --- search ------------------------------------------------------------------
const search = async (q) => (await api("GET", `/endpoints/${slug}/requests?q=${encodeURIComponent(q)}`)).json?.length;
check("search by path (case-insensitive)", (await search("A/B")) === 1);
check("search by body", (await search('"a":1')) === 1);
check("search by method", (await search("post")) === 1);
check("search with no match", (await search("zzz-nothing")) === 0);

// --- digest ------------------------------------------------------------------
const postDigest = async (body) => {
  await hook(slug, "/digest", { method: "POST", body });
  return (await latest(slug))?.digest;
};
const dA1 = await postDigest('{"same":1}');
const dA2 = await postDigest('{"same":1}');
const dB = await postDigest('{"same":2}');
check("digest is 32 lowercase hex = sha256(body)[:16]", /^[0-9a-f]{32}$/.test(dA1) && dA1 === digestOf('{"same":1}'), dA1);
check("identical bodies -> same digest", dA1 === dA2, { dA1, dA2 });
check("different body -> different digest", dB !== dA1 && dB === digestOf('{"same":2}'), { dA1, dB });

// --- response config ---------------------------------------------------------
const patched = await api("PATCH", `/endpoints/${slug}`, {
  name: "renamed",
  response: { status: 201, contentType: "text/plain; charset=utf-8", body: "created!", headers: [["X-Custom", "yes"], ["X-Custom", "again"]] },
});
check("PATCH response config -> 200", patched.status === 200 && patched.json?.response?.status === 201 && patched.json?.name === "renamed", patched);
const res2 = await hook(slug, "", { method: "PUT", body: "x" });
check("ingress honors configured status/body", res2.status === 201 && (await res2.text()) === "created!");
check("ingress honors content type + extra headers", res2.headers.get("content-type") === "text/plain; charset=utf-8" && res2.headers.get("x-custom") === "yes, again", Object.fromEntries(res2.headers));
const patchName = await api("PATCH", `/endpoints/${slug}`, { name: null });
check("PATCH name only keeps response", patchName.json?.name === null && patchName.json?.response?.status === 201, patchName.json);
const badResp = (response) => api("PATCH", `/endpoints/${slug}`, { response: { status: 200, contentType: "text/plain", body: "", headers: [], ...response } });
check("PATCH status 100 -> 400", (await badResp({ status: 100 })).status === 400);
check("PATCH content-length header -> 400", (await badResp({ headers: [["Content-Length", "1"]] })).status === 400);
check("PATCH header value with newline -> 400", (await badResp({ headers: [["X-A", "a\nb"]] })).status === 400);
check("PATCH bad header name -> 400", (await badResp({ headers: [["Bad Name", "a"]] })).status === 400);
check("PATCH Set-Cookie -> 400", (await badResp({ headers: [["Set-Cookie", "a=b"]] })).status === 400);
check("PATCH Clear-Site-Data -> 400", (await badResp({ headers: [["Clear-Site-Data", '"cookies"']] })).status === 400);
check("PATCH Content-Type as extra header -> 400", (await badResp({ headers: [["Content-Type", "text/html"]] })).status === 400);
const textPlain = await fetch(`${base}/api/endpoints`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
check("API JSON body with text/plain -> 415", textPlain.status === 415, textPlain.status);
const crossSite = await fetch(`${base}/api/endpoints`, { headers: { origin: "https://evil.example" } });
check("API cross-origin request -> 403", crossSite.status === 403, crossSite.status);
check("PATCH unknown endpoint -> 404", (await api("PATCH", "/endpoints/no-such-endpoint", {})).status === 404);

const head = await hook(slug, "", { method: "HEAD" });
check("HEAD -> configured status, no body", head.status === 201 && (await head.text()) === "");
check("HEAD is captured", (await latest(slug))?.method === "HEAD");
const opts = await hook(slug, "", { method: "OPTIONS" });
check("OPTIONS -> CORS allow headers", opts.headers.get("access-control-allow-methods") === "*" && opts.headers.get("access-control-allow-headers") === "*");
check("OPTIONS is captured", (await latest(slug))?.method === "OPTIONS");
await api("PATCH", `/endpoints/${slug}`, { response: { status: 204, contentType: "text/plain", body: "ignored", headers: [] } });
const r204 = await hook(slug, "", { method: "POST", body: "hello" });
check("204 -> no body", r204.status === 204 && (await r204.text()) === "");

// --- bodies ------------------------------------------------------------------
const binary = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]), randomBytes(512)]);
await hook(slug, "/bin", { method: "POST", headers: { "content-type": "image/png" }, body: binary });
const dBin = await detail(slug, (await latest(slug))?.id);
check("binary body -> base64", dBin?.bodyEncoding === "base64" && dBin?.size === binary.length, { enc: dBin?.bodyEncoding, size: dBin?.size });
check("binary body round-trips (sha256)", dBin && sha256(Buffer.from(dBin.body, "base64")) === sha256(binary));
check("binary digest matches stored bytes", dBin?.digest === digestOf(binary), dBin?.digest);
check("search skips base64 bodies (raw bytes contain 'PNG')", (await search("png")) === 0);

const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("héllo")]);
await hook(slug, "/bom", { method: "POST", body: bom });
const dBom = await detail(slug, (await latest(slug))?.id);
check("UTF-8 BOM kept byte-identically", dBom?.bodyEncoding === "utf8" && sha256(Buffer.from(dBom.body, "utf8")) === sha256(bom));

const big = Buffer.alloc(1_572_864, "a");
await hook(slug, "/big", { method: "POST", body: big });
const sBig = await latest(slug);
const dBig = await detail(slug, sBig?.id);
check("1.5 MB body: size 1572864, truncated, stored 1048576", sBig?.size === 1_572_864 && dBig?.truncated === true && dBig?.body?.length === 1_048_576 && dBig?.bodyEncoding === "utf8", { size: sBig?.size, truncated: dBig?.truncated, stored: dBig?.body?.length });
check("truncated digest covers stored bytes only", sBig?.digest === digestOf(big.subarray(0, 1_048_576)), sBig?.digest);

// 3-byte chars: the 1 MiB cut lands mid-character, which must be trimmed, not base64'd.
const euro = Buffer.from("€".repeat(400_000));
await hook(slug, "/euro", { method: "POST", body: euro });
const dEuro = await detail(slug, (await latest(slug))?.id);
check("truncation trims a split UTF-8 char", dEuro?.bodyEncoding === "utf8" && dEuro?.truncated === true && Buffer.byteLength(dEuro.body) === 1_048_575, { enc: dEuro?.bodyEncoding, bytes: dEuro && Buffer.byteLength(dEuro.body) });
check("trimmed digest covers trimmed bytes", dEuro?.digest === digestOf(euro.subarray(0, 1_048_575)), dEuro?.digest);

// Text up to the cut, then an invalid UTF-8 byte right at it: binary, nothing dropped.
const textThenJunk = Buffer.concat([Buffer.alloc(1_048_575, "a"), Buffer.from([0xff]), Buffer.alloc(1024, "b")]);
await hook(slug, "/junk", { method: "POST", body: textThenJunk });
const dJunk = await detail(slug, (await latest(slug))?.id);
check("invalid byte at the cut stays binary, nothing trimmed", dJunk?.bodyEncoding === "base64" && Buffer.from(dJunk.body, "base64").length === 1_048_576, { enc: dJunk?.bodyEncoding });

// Chunked upload (no Content-Length): the stream is drained to learn the original size.
const chunked = new ReadableStream({
  start(c) {
    for (let i = 0; i < 24; i++) c.enqueue(new Uint8Array(65_536).fill(0x41));
    c.close();
  },
});
await hook(slug, "/chunked", { method: "POST", body: chunked, duplex: "half" });
const sChunked = await latest(slug);
check("chunked 1.5 MB upload: original size kept", sChunked?.path === "/chunked" && sChunked?.size === 1_572_864, { path: sChunked?.path, size: sChunked?.size });

// --- WebSocket ---------------------------------------------------------------
const nonUpgrade = await api("GET", "/ws");
check("GET /api/ws without upgrade -> 426", nonUpgrade.status === 426, nonUpgrade);
const ws = new WebSocket(`${base.replace(/^http/, "ws")}/api/ws`);
const messages = [];
const arrivals = new Map();
ws.addEventListener("message", (e) => {
  messages.push(String(e.data));
  arrivals.set(String(e.data), Date.now());
});
const opened = await new Promise((resolve) => {
  ws.addEventListener("open", () => resolve(true));
  ws.addEventListener("error", () => resolve(false));
  setTimeout(() => resolve(false), 5000);
});
check("WebSocket connects", opened);
const waitFor = async (pred, ms) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const hit = messages.find(pred);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 20));
  }
};
if (opened) {
  ws.send("ping");
  check("ping -> pong", (await waitFor((m) => m === "pong", 1000)) === "pong", messages);
  const sentAt = Date.now();
  await hook(slug, "/ws-test", { method: "POST", body: "secret-body" });
  const msg = await waitFor((m) => m.includes("/ws-test"), 1000);
  const parsed = msg && JSON.parse(msg);
  check("WebSocket receives summary within 1s", parsed?.type === "request" && parsed.request?.path === "/ws-test" && parsed.request.slug === slug && arrivals.get(msg) - sentAt < 1000, { messages, ms: msg && arrivals.get(msg) - sentAt });
  check("WebSocket summary has no body", parsed && !("body" in parsed.request) && !msg.includes("secret-body"));
check("WebSocket summary carries digest", parsed?.request?.digest === digestOf("secret-body"), parsed?.request?.digest);
  ws.close();
}

// --- deletes -----------------------------------------------------------------
const before = (await api("GET", `/endpoints/${slug}`)).json?.requestCount;
const victim = await latest(slug);
check("delete request -> 204", (await api("DELETE", `/endpoints/${slug}/requests/${victim?.id}`)).status === 204);
check("deleted request is gone", (await api("GET", `/endpoints/${slug}/requests/${victim?.id}`)).status === 404);
check("requestCount decremented", (await api("GET", `/endpoints/${slug}`)).json?.requestCount === before - 1, { before });
check("delete unknown request -> 404", (await api("DELETE", `/endpoints/${slug}/requests/01AAAAAAAAAAAAAAAAAAAAAAAA`)).status === 404);
check("clear requests -> 204", (await api("DELETE", `/endpoints/${slug}/requests`)).status === 204);
const afterClear = await api("GET", `/endpoints/${slug}`);
check("cleared: no requests, requestCount 0", afterClear.json?.requestCount === 0 && (await api("GET", `/endpoints/${slug}/requests`)).json?.length === 0, afterClear.json);
check("clear already-empty endpoint -> 204", (await api("DELETE", `/endpoints/${slug}/requests`)).status === 204);
check("clear unknown endpoint -> 404", (await api("DELETE", "/endpoints/no-such-endpoint/requests")).status === 404);
check("list requests of unknown endpoint -> 404", (await api("GET", "/endpoints/no-such-endpoint/requests")).status === 404);
for (const s of created.splice(0)) {
  check(`delete endpoint ${s} -> 204`, (await api("DELETE", `/endpoints/${s}`)).status === 204);
}
check("deleted endpoint -> 404 (API and ingress)", (await api("GET", `/endpoints/${slug}`)).status === 404 && (await hook(slug)).status === 404);
check("delete unknown endpoint -> 404", (await api("DELETE", `/endpoints/${slug}`)).status === 404);

// --- rate limit (optional: 60/min per slug) ----------------------------------
const rl = await api("POST", "/endpoints", { slug: `smoke-rl-${tag}` });
let limited;
for (let i = 0; i < 80 && !limited; i++) {
  const r = await hook(rl.json.slug);
  if (r.status === 429) limited = r;
  await r.arrayBuffer();
}
if (limited) {
  check("rate limit -> 429 text", limited.headers.get("access-control-allow-origin") === "*" && limited.headers.get("content-type")?.startsWith("text/plain"));
} else {
  console.log("SKIP rate limit: no 429 after 80 requests (not enforced locally)");
}
await api("DELETE", `/endpoints/${rl.json.slug}`);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
