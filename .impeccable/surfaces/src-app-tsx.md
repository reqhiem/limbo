---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src"]
---

# Surface: Limbo app (src/App.tsx and everything under src/)

Mode: Operate. Audience: the owner (single developer) debugging a provider integration on a laptop, Limbo beside the terminal or provider dashboard. Job: see a webhook land within a second, open it, read it, copy body/cURL, configure the endpoint's answer. Constraints: dark by default (the use scene is a dim desk next to terminals), laptop width, captured content always inert text.

## Direction contract

THESIS: Limbo is a data field, not a dashboard. Every request is shown as signal: bytes, tabular numbers, and a barcode drawn from its own SHA-256 digest, in pure black and white. It refuses the category default: a grey DevTools clone with a blue accent and rainbow method badges.

OWN-WORLD: #000 ground, #fff ink, 1px white hairline rules framing every region; one self-hosted monospace (Martian Mono, variable weight/width) at tabular density. Hierarchy by size, weight, uppercase tracking and inversion (white block, black text), never color. One secondary tier, #fff at 62%, for labels only, never data. No shadows, no radii above 2px, no gradients. Canvas barcodes; one sine trace in the header.

STORY: Paste the URL into Stripe, fire a test event, a row inverts at the top of the list, open it, read the JSON tree, copy body or cURL. Identical barcodes expose retries at a glance.

FIRST VIEWPORT: 56px header (LIMBO wordmark, sine trace across, live state, counters, pause). Below, three ruled columns at >=1280px: endpoints (~248px; selected endpoint inverted; create form behind "+ New" in the column head, because a permanent form at the foot cost list height on every screen for a once-per-integration action), requests (~460px; URL + copy, filter, rows METHOD · path · event label · IP · barcode · time/size), detail (request line at display size with its event label, equal ruled tab cells, body tree with the signal aside — hero barcode, digest, bytes, edge metadata — beside). Endpoint settings take the detail column when no request is open. Narrower windows (the side-by-side scene) collapse to two columns (900–1279px) or one route-driven pane (<900px).

FORM: dealt challenger "Ikeda datamatics" (won against the grounded list; the roll's assigned index was 7), seed 4876cac5.

SIGNATURE: arrival = the new row inverts for one frame (stepped, ~120ms), then holds a 1px inset outline while unseen; the sine trace shifts phase per arrival. Motion is stepped snaps, never eased fades; reduced motion keeps only the outline.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
