import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ApiError } from "../../shared/types";
import { parseCreateEndpoint, parseUpdateEndpoint, readJson } from "../lib/validate";
import { access } from "../middleware/access";
import { getStore } from "../store/LimboStore";

export const api = new Hono<{ Bindings: Env }>();

const notFound = { error: "not found" } satisfies ApiError;

api.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message } satisfies ApiError, err.status);
  console.error(err);
  return c.json({ error: "internal error" } satisfies ApiError, 500);
});

api.use("*", access);

api.get("/ws", async (c) => {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "expected a WebSocket upgrade" } satisfies ApiError, 426);
  }
  return getStore(c.env).fetch(c.req.raw);
});

api.get("/endpoints", async (c) => c.json(await getStore(c.env).listEndpoints()));

api.post("/endpoints", async (c) => {
  const input = parseCreateEndpoint(await readJson(c.req.raw));
  const result = await getStore(c.env).createEndpoint(input);
  if (result === "conflict") return c.json({ error: "slug already taken" } satisfies ApiError, 409);
  return c.json(result, 201);
});

api.get("/endpoints/:slug", async (c) => {
  const endpoint = await getStore(c.env).getEndpoint(c.req.param("slug"));
  return endpoint ? c.json(endpoint) : c.json(notFound, 404);
});

api.patch("/endpoints/:slug", async (c) => {
  const patch = parseUpdateEndpoint(await readJson(c.req.raw));
  const endpoint = await getStore(c.env).updateEndpoint(c.req.param("slug"), patch);
  return endpoint ? c.json(endpoint) : c.json(notFound, 404);
});

api.delete("/endpoints/:slug", async (c) => {
  const deleted = await getStore(c.env).deleteEndpoint(c.req.param("slug"));
  return deleted ? c.body(null, 204) : c.json(notFound, 404);
});

api.get("/endpoints/:slug/requests", async (c) => {
  const requests = await getStore(c.env).listRequests(c.req.param("slug"), c.req.query("q")?.trim() ?? "");
  return requests ? c.json(requests) : c.json(notFound, 404);
});

api.delete("/endpoints/:slug/requests", async (c) => {
  const cleared = await getStore(c.env).clearRequests(c.req.param("slug"));
  return cleared ? c.body(null, 204) : c.json(notFound, 404);
});

api.get("/endpoints/:slug/requests/:id", async (c) => {
  const request = await getStore(c.env).getRequest(c.req.param("slug"), c.req.param("id"));
  return request ? c.json(request) : c.json(notFound, 404);
});

api.delete("/endpoints/:slug/requests/:id", async (c) => {
  const deleted = await getStore(c.env).deleteRequest(c.req.param("slug"), c.req.param("id"));
  return deleted ? c.body(null, 204) : c.json(notFound, 404);
});

api.all("*", (c) => c.json(notFound, 404));
