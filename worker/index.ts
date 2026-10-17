import { Hono } from "hono";
import { plainText } from "./lib/ingress-response";
import { api } from "./routes/api";
import { handleIngress } from "./routes/ingress";

const app = new Hono<{ Bindings: Env }>();

app.all("/h/*", (c) => handleIngress(c.req.raw, c.env));
app.route("/api", api);
app.notFound(() => plainText(404, "Not found"));

export default app;
export { LimboStore } from "./store/LimboStore";
