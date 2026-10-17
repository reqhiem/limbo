---
name: Limbo
description: A personal webhook inspector drawn as a black-and-white data field.
colors:
  ink: "#ffffff"
  ground: "#000000"
  label: "rgb(255 255 255 / 0.62)"
  label-inverse: "rgb(0 0 0 / 0.62)"
typography:
  display:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "normal"
    fontFeature: '"tnum" 1, "zero" 1'
    fontVariation: '"wdth" 75'
  title:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "0.04em"
    fontFeature: '"tnum" 1, "zero" 1'
    fontVariation: '"wdth" 87.5'
  name:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.04em"
    fontFeature: '"tnum" 1, "zero" 1'
    fontVariation: '"wdth" 87.5'
  body:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
    fontFeature: '"tnum" 1, "zero" 1'
    fontVariation: '"wdth" 87.5'
  label:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.08em"
    fontFeature: '"tnum" 1, "zero" 1'
    fontVariation: '"wdth" 87.5'
  control:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.08em"
    fontFeature: '"tnum" 1, "zero" 1'
    fontVariation: '"wdth" 87.5'
  wordmark:
    fontFamily: '"Martian Mono Variable", ui-monospace, "SFMono-Regular", Menlo, monospace'
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "0.32em"
    fontVariation: '"wdth" 112.5'
rounded:
  none: "0px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
components:
  button:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "32px"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  button-small:
    padding: "0 8px"
    height: "24px"
  button-disabled:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.label}"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "32px"
  tab:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "36px"
  tab-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  endpoint-item:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.name}"
    padding: "12px 16px"
  endpoint-item-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  request-row:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 16px"
    height: "52px"
  request-row-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  badge:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 5px"
    height: "18px"
  badge-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  header:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    height: "56px"
  barcode-row:
    height: "20px"
  barcode-signal:
    height: "64px"
---

# Design System: Limbo

## Overview

**Creative North Star: "Datamatics Field"**

Limbo is a data field, not a dashboard. Each request is drawn as signal: bytes, tabular numbers and a barcode generated from its own SHA-256 digest, all in pure black and white. The idiom is datamatics: information shown as raw monochrome pattern, ruled into a grid and read at tabular density. Hierarchy comes from size, weight, width, uppercase tracking and inversion. It never comes from color.

The density is close to an instrument panel. Three ruled columns fill the viewport, each with its own scroll, and the 56px header carries the wordmark, a sine trace, counters and the live state. One self-hosted variable monospace sets every role. Width on the `wdth` axis sets the register: condensed for display, slightly condensed for data, expanded for the wordmark. Motion is stepped. A state snaps on, holds, and snaps off.

The rejected look is the category default: a grey DevTools clone with a blue accent and rainbow method badges. Limbo answers each of those with a different device. A mutating method is heavier, not redder. A selected row is inverted, not tinted. A retry shows up as an identical barcode, not a colored tag.

**Key Characteristics:**
- Two inks, #000 ground and #fff ink, plus one 62% label tier.
- Inversion (a white block with black text) is the only fill emphasis. Outlines and border weight carry the lesser states.
- Captured data stays in full ink and is coded by weight.
- 1px solid hairlines frame regions and structural cells, and 1px dotted ones separate repeated items.
- Martian Mono variable is the only typeface, set with tabular numbers and a slashed zero.
- Canvas barcodes are drawn from each body's digest, and one sine trace runs in the header.
- Motion is stepped (`steps(1)`). There are no eased transitions anywhere.

## Colors

The palette is strictly monochrome. Two inks and one translucent tier make every surface.

### Primary
- **Signal White** (ink): Text, rules, icons, barcode bars and the fill of every inverted block. All captured data uses it at full strength.

### Neutral
- **Field Black** (ground): The page, column and control background, and the text color inside an inverted block. Overlays such as the endpoint switcher menu use it too, with no tint.
- **Label Grey-by-Alpha** (label): The one secondary tier. It is used for labels, placeholders, JSON punctuation and collapsed counts, hex offsets, tab counts, the `/h/slug` routing prefix in the request line, relative times ("14m ago") and the text of disabled buttons. It is white at 62% alpha, not a mixed grey, so it reads as a step down from the ink.
- **Label Inverse** (label-inverse): The same tier mirrored for inverted blocks: black at 62% on white. `.inv` redefines the label variable to this value, so labels inside a selected row or an error block stay legible.

### Named Rules
**The Two Inks Rule.** Ground and ink are the only colors. No hue appears anywhere: not for methods, statuses, errors or success. A 4xx or 5xx response is an outlined badge, and ERR is an inverted one.

**The One Tier Rule.** The 62% tier belongs to labels, syntax and Limbo's own annotations. Captured data is never set at the label tier or in any grey. That covers the method, path, query, header names and values, body, IP and sizes.

**The Mirror Rule.** An inverted block flips everything inside it. Its label tier becomes black at 62%, its focus ring and text selection turn black, its buttons fill with ink behind a ground border, and its barcodes invert. Nothing white is left inside a white block.

## Typography

**Display Font:** Martian Mono Variable (self-hosted via `@fontsource-variable/martian-mono`, `wdth` axis), with ui-monospace, SFMono-Regular, Menlo and monospace as fallbacks
**Body Font:** the same family
**Label/Mono Font:** the same family

**Character:** One monospace family, used across its whole range. Display text is a condensed 800 that reads like a stamped readout. Data is a slightly condensed 400 at tabular density. The wordmark is an expanded 800 with very wide tracking. Every numeral is tabular with a slashed zero, so columns of clocks, sizes and counts line up digit for digit.

### Hierarchy
- **Display** (800, 28px, 1.15, width 75%): The request line in the detail head, the endpoint title in settings and the orientation title. Owner-given names are uppercase. The request line keeps the case of the captured path.
- **Title** (800, 16px, 0.04em, uppercase): The endpoint name in the request-column head, the switcher summary and the "Waiting for the first request" card. Numeric readouts use 16px at 700: header counters (zero-padded to three digits) and the event label in the detail head. The webhook URL box uses 16px at 600.
- **Name** (700, 13px, 0.04em, uppercase): Endpoint names in lists, the switcher menu and the orientation list, and the titles of danger rows.
- **Body** (400, 13px, 1.5, width 87.5%): All captured data and running text. The JSON tree and raw `pre` views open up to a 1.6 line height. Running prose stays between 48 and 60ch.
- **Label** (500, 11px, 0.08em, uppercase, label tier): Field labels, `dt` terms, column headings ("ENDPOINTS · 2") and the metadata keys of key-value tables.
- **Control** (600, 11px, 0.08em, uppercase, full ink): Button text. Other ink-colored 11px uppercase text steps up to 700: tabs, badges, the live state, settings subheads and empty-state titles. Section heads step up to 800.
- **Wordmark** (800, 16px, 0.32em, width 112.5%, uppercase): "LIMBO" in the header cell above the endpoint column. It is the only expanded setting.

The hex view is the one small-data exception. It sets bytes at the label size (11px, line height 1.6) because a 16-byte row has to fit.

### Named Rules
**The Weight-Codes-Data Rule.** Inside captured data, weight is the only differentiator. Mutating methods (POST, PUT, PATCH, DELETE) are 800 and safe methods (GET, HEAD, OPTIONS) are 400. JSON keys are 600 and values are 400. Event labels are 600. Non-printable hex bytes drop to 300. Tone never changes.

**The Own-Case Rule.** Captured text is never case-transformed. Paths, event labels, header values and bodies keep the case they were received in. Uppercase belongs to labels, controls and owner-given names.

**The Tabular Rule.** Every numeral is tabular with a slashed zero (`tabular-nums slashed-zero`). Counters are zero-padded to three digits ("002", "013"), and an unknown count shows as "---".

## Layout

The app is locked to the viewport (`100dvh`): a 56px header row above a body row of independently scrolling columns. Column heads never scroll (`flex: none`). Only the lists and panels under them do.

- **≥1280px, three columns:** endpoints (248px), requests (460px), detail (the rest). The header grid reuses the 248px endpoint width, so the wordmark cell sits exactly over the endpoint column. On the home route, orientation spans both right-hand columns instead of leaving an empty list.
- **900–1279px, two columns:** a side slot (minmax(320px, 40%)) and the detail. The endpoint column folds into a switcher dropdown in the request-column head. The side slot shows the endpoint list on home and the request list everywhere else.
- **<900px, one pane:** the route picks the pane (endpoints, requests or detail), and back buttons return to the list.
- **Header compaction:** below 760px the counters drop. Below 600px the sine trace goes first, and the live state and Pause always remain.

The detail column is a size container, so its inner layout responds to the column, not the window. The body sits beside a 13.5rem signal aside from 680px for text bodies and from 960px for binary bodies, since a hex dump needs about 520px. The four-fact strip becomes a 1 + 2 + 1 grid under 700px. Panel padding tightens from 24px to 16px under 760px. Tabs stack their counts under the label below 600px.

Spacing follows a 4px scale (4, 8, 12, 16, 24, 32). Column content is inset 16px and detail content 24px. Fixed heights hold the rhythm: controls 32px, small controls 24px, request rows 52px, the endpoint column head 48px, the filter strip 40px, tabs 36px and badges 18px. The endpoint settings panel is capped at 60rem and orientation at 88rem. Both leave 7rem of bottom padding so the last control never sits on the window edge.

### Named Rules
**The Ruled Field Rule.** A 1px solid ink rule draws structure. It frames every region (header, columns, column heads, tab strip, code boxes) and marks the boundaries between structural cells: header cells, tab cells, toggle segments, the facts strip's top edge, the signal aside's edge, and the underline beneath a display title or section head. A 1px dotted ink rule separates repeated items: list rows, menu items, key-value rows, fact and counter sub-cells, and the hex ASCII gutter. Structure is solid and repetition is dotted.

**The No-Nudge Rule.** Text that changes never moves its neighbors. The copy button stacks all its labels in one grid cell. The live-state cell has a floor wide enough for CONNECTING. The time and size column in each row has a fixed 4.75em width.

## Elevation & Depth

The system is completely flat. There are no shadows, gradients, blur or translucent surfaces other than the label tier. Depth and focus come from two devices. Rules separate planes, and inversion lifts the one active thing out of the field. Even the switcher menu, the only overlay, is drawn as a ground-filled box with a 1px rule and no top border, stacked by z-index alone.

### Named Rules
**The Flat Field Rule.** Nothing casts a shadow and nothing glows. If an element needs to stand forward, invert it. If it needs a boundary, rule it.

**The Stepped Motion Rule.** Every animation uses `steps(1)`, and the codebase has no CSS transitions. On arrival, a new row inverts for one 120ms frame (its barcode included), snaps back, and holds a 1px inset outline until it is opened. The connecting lamp blinks at 1s, stepped. The sine trace advances one of 16 discrete phase steps per arrival. Under reduced motion, animations are off and the trace is frozen. Only the unseen outline remains.

## Shapes

Every corner is square: radius 0, explicitly reset on form controls. The direction contract allowed radii up to 2px, but the build uses none, so square is the rule. Lines come in three weights by meaning:

- **1px solid ink** frames regions and controls and marks the boundaries between structural cells.
- **1px dotted ink** separates repeated items. It is also the hover outline on list items, rows and tabs (inset 4px) and the border of a disabled button.
- **2px** is reserved for the focus ring and an invalid field's border.

Recurring geometry:
- The live lamp is an 8px square with four states. Hollow is offline, filled is live, a stepped blink is connecting, and two 3px side bars (a pause sign) is paused.
- Orientation step numbers sit in 24px ruled squares.
- Barcode bars are whole-unit rectangles, left-aligned and clipped, never squeezed.
- Icons are drawn on a 16px grid with 1.5px strokes, square caps and miter joins. They render at 14px inside buttons.

The middle dot (·) is the primary typographic separator. A slash pairs two values ("324 / 324 B").

## Components

### Buttons
Ruled, uppercase and blunt. A button is a frame that fills with ink when touched.
- **Shape:** Square (0) with a 1px solid ink border.
- **Default:** Ground fill, ink text in the control type, 32px tall, 12px horizontal padding, an 8px gap to a 14px icon.
- **Hover / Active / Pressed / Current:** The whole button inverts. `aria-pressed`, `aria-current` and the `.on` state share the same inversion.
- **Small:** 24px tall with 8px padding, used in column heads, action rows and toolbars.
- **Disabled:** Dotted border, label-tier text, and no inversion on hover.
- **Inside an inverted block:** Ink fill with a ground border, and the button inverts back to ground on hover.
- **Copy:** Swaps to COPIED (or FAILED) in the inverted state without changing width, then returns to idle.
- **Confirm (destructive):** The first press arms the button for 3s, showing inverted "CONFIRM?". The second press runs the action. Escape or blur disarms it.
- **Segmented toggle (Tree / Raw):** Adjacent small buttons share a border, and the pressed one is inverted.

### Chips
Badges are outlined flags, not chips.
- **Style:** 18px tall, a 1px currentColor border, 5px padding, 11px 700 uppercase, no fill. Examples are TRUNCATED, BINARY, and the response status in a row when Limbo answered 400 or above.
- **State:** The solid variant (an inverted ink block) is reserved for ERR beside a field or form error.

### Cards / Containers
- **Corner Style:** Square (0).
- **Background:** Ground. A selected or alerting container is inverted instead.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** A 1px solid rule for code boxes, the URL box and the waiting card. Dotted rules divide inside.
- **Internal Padding:** 8px × 12px for code and URL boxes, 16px for the waiting card.
- **States:** An error is an inverted strip with "ERR", the message and a Retry button. Loading is a stack of row-height cells, each holding two 1px ink lines of varying width, with no shimmer. An empty state is an uppercase 700 title over 48ch of body text.

### Inputs / Fields
- **Style:** A 1px solid ink border, ground fill and square corners. Inputs and selects are 32px tall with 8px padding, and textareas have 8px padding with vertical resize. Placeholders use the label tier. Labels sit above in the label type with a 6px gap.
- **Focus:** A 2px ink ring at a 1px offset. The request filter is a borderless input in a 40px ruled strip, so its focus draws an inset 2px ring around the whole strip instead.
- **Error:** The border thickens to 2px (`aria-invalid`), and a line below starts with a solid ERR badge.
- **Prefixed field:** The slug field puts a ruled `/h/` cell, in the label tier, in front of the input.
- **Disabled:** Disabled controls follow the button rule: dotted border, label-tier text.

### Navigation
- **Endpoint list (≥1280px):** A 48px head with a label-tier heading ("ENDPOINTS · N") and a small "+ New" button that opens the create form under the head. Each item shows the name in the name type, then the `/h/slug` and a zero-padded request count at 11px, then "LAST" and a relative time. Items are separated by dotted rules. Hover draws a dotted inset outline, and the selected endpoint inverts.
- **Endpoint switcher (<1280px):** A 32px ruled summary with the name in the title type and a chevron. When open, the summary inverts and a ground menu drops below it with dotted separators.
- **Tabs:** Body, Headers, Query, Metadata and Raw sit in five equal cells inside one ruled strip, 36px tall, with 1px solid dividers. Counts are in the label tier. The active tab inverts and inactive tabs show the dotted hover outline. Arrow keys move between tabs.
- **Links:** Inherit ink and are underlined at a 3px offset, on hover for names or always for inline links.

### Request Row (signature)
The 52px row is the arrival surface. It is laid out as main text, a 120px barcode and a 4.75em time and size column, with 12px gaps and 16px side padding.
- **Line 1:** The method, weight-coded (400 safe, 800 mutating), then the path and query in full ink, ellipsized as a unit.
- **Line 2 (11px):** An outlined status badge when the response was 400 or above, the event label at 600, a label-tier middle dot, then the IP. The event label gives way to an ellipsis, and the IP is always shown in full.
- **Right column:** Clock and size, right-aligned and tabular.
- **Unseen:** A 1px currentColor outline inset 3px, held until the request is opened. Screen readers hear ", new".
- **Arrival:** One stepped 120ms inversion of the row and its barcode.
- **Selected:** Inverted. Hover on unselected rows draws the dotted inset outline.

### Digest Barcode (signature)
A deterministic barcode drawn on canvas from a body's SHA-256 digest. The first 8 bytes split into 32 two-bit groups. Each group becomes a run of 1 to 3 units, alternating bar and space and starting with a bar. Identical payloads draw identical codes, so retries show up at a glance. A unit is 2px in rows (20px tall) and 3px in the signal aside (64px tall). Bars are left-aligned and pixel-snapped, and they redraw on resize and zoom. The barcode clips rather than squeezes. Inside an inverted block it inverts with the block.

### Signal Aside
This aside sits beside the body: the hero barcode, then the digest in two columns of 8-character groups at the label size, then stacked facts (Stored / original, Encoding, Edge, IP), each a label term over an ink value with dotted rules between them. From 680px it becomes sticky with a 1px solid left rule. Below that it folds under the body with a solid top rule.

### Header
A 56px ruled strip, from left to right:
- The wordmark cell.
- The sine trace: a 1px ink wave over a dotted 1/5 axis, 3.5 cycles wide, stretched to fill.
- Counters: a label term over a 16px 700 zero-padded value, with a dotted divider.
- The live state: the lamp plus 11px 700 uppercase text. The whole cell inverts while paused, showing "PAUSED · N WAITING".
- A full-height Pause or Resume button with only a left rule.

### Request Detail Head
- The request line at display size: the method, the `/h/slug` prefix in the label tier (kept atomic so it wraps whole), then the path in ink.
- The event label at 16px 700 with outlined badges.
- A facts strip: a solid top rule, a dotted bottom rule, and dotted cell dividers holding Received, Size, Response and Content type, each a label term over an ink value.
- An action row of small buttons, with Delete pushed to the right edge.

### Data Views
- **JSON tree:** Keys at 600 and values at 400, both in full ink. Punctuation and collapsed counts ("{ 1 KEY }") are in the label tier. A 12px chevron hangs in a 20px gutter so keys at the same depth align. Each depth indents by 2ch.
- **Hex view:** Offsets in the label tier. Bytes and ASCII are in ink, with non-printable bytes at 300. A dotted rule separates the ASCII gutter.
- **Key-value tables:** Dotted row rules. Captured header names use a 15rem column at 700 in ink. Limbo's metadata keys use an 11rem column in the label type.

## Do's and Don'ts

### Do:
- **Do** build every surface from ground (#000) and ink (#fff), with the 62% label tier only for labels, syntax and Limbo's own annotations.
- **Do** mark selection and active state by inversion (white block, black text): selected, active tab, pressed, current, copied, armed, paused, arrival and ERR. Let `.inv` mirror everything inside the block, including the label tier, focus ring, selection, buttons and barcode. Lesser states use outlines and border weight: a dotted inset outline for hover, a 1px inset outline for unseen, a 2px border for invalid and a dotted border for disabled.
- **Do** tell captured data apart by weight (300, 400, 600, 800) in full ink.
- **Do** use 1px solid ink for frames and structural cell boundaries, and 1px dotted ink between repeated items. Keep 2px for focus rings and invalid fields.
- **Do** set every number tabular with a slashed zero, and zero-pad counters to three digits.
- **Do** keep captured text in its received case. Uppercase only labels, controls and owner-given names.
- **Do** animate with `steps(1)` only. Under reduced motion keep only the unseen outline.
- **Do** reserve width for text that changes (stacked labels, min-widths, fixed columns) so nothing nudges.
- **Do** draw icons as 16px-grid SVG with 1.5px strokes, square caps and miter joins.
- **Do** clip a barcode that does not fit, and keep its unit width.

### Don't:
- **Don't** introduce a hue: not for methods, statuses, errors, success or links.
- **Don't** set captured data (method, path, query, headers, body, IP, sizes) in the label tier or any grey.
- **Don't** add shadows, gradients, blur or rounded corners.
- **Don't** use eased transitions or fades. A state snaps on and snaps off.
- **Don't** add a second typeface. Martian Mono variable carries every role through weight and width.
- **Don't** draw a region frame dotted, or separate repeated list items with solid rules.
- **Don't** fall back to the category default: a grey DevTools panel, a blue accent, rainbow method badges.
