import { SLUG_RE } from "../../shared/endpoint";
import type { ResponseConfig } from "../../shared/types";
import { readConfig } from "../config";
import { buildCapture } from "../lib/capture";
import { ingressResponse, plainText } from "../lib/ingress-response";
import { getStore } from "../store/LimboStore";

const INGRESS_PATH_RE = /^\/h\/([^/]+)(\/.*)?$/;

export async function handleIngress(req: Request, env: Env): Promise<Response> {
  const match = INGRESS_PATH_RE.exec(new URL(req.url).pathname);
  const slug = match?.[1];
  if (!slug || !SLUG_RE.test(slug)) return plainText(404, "Not found");

  const { success } = await env.INGRESS_LIMITER.limit({ key: slug });
  if (!success) return plainText(429, "Too many requests");

  const input = await buildCapture(req, slug, match[2] ?? "", readConfig(env).maxBodyBytes);
  // RPC typing widens KV tuples to string[]; the value is a ResponseConfig.
  const response = (await getStore(env).capture(input)) as ResponseConfig | null;
  return response ? ingressResponse(req.method, response) : plainText(404, "Not found");
}
