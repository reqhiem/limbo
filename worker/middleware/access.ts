import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Key-set cache per team domain (jose refreshes keys on its own); not request state.
const jwksByTeam = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/** Cloudflare Access JWT check. Fails closed on any missing config or verification error. */
export const access = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const { hostname } = new URL(c.req.url);
  if (c.env.DEV_SKIP_ACCESS === "true" && (hostname === "localhost" || hostname === "127.0.0.1")) {
    return next();
  }
  const team = c.env.ACCESS_TEAM_DOMAIN.replace(/\/+$/, "");
  const audience: string = c.env.ACCESS_AUD;
  const token = c.req.header("cf-access-jwt-assertion");
  try {
    if (!token || !team || !audience) throw new Error("missing token or Access config");
    let jwks = jwksByTeam.get(team);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
      jwksByTeam.set(team, jwks);
    }
    await jwtVerify(token, jwks, { issuer: team, audience, algorithms: ["RS256"] });
  } catch {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});
