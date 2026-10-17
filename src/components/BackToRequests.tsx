import { hrefFor } from "../lib/router";
import { IconArrowLeft } from "./icons";

/** Narrow-pane back link to the request list; inverted while requests arrived unseen behind it. */
export function BackToRequests({ slug, unseen, className }: { slug: string; unseen: number; className?: string }) {
  return (
    <a
      className={`btn small only-narrow${unseen ? " on" : ""}${className ? ` ${className}` : ""}`}
      href={hrefFor(slug)}
      aria-label={unseen ? `Back to requests, ${unseen} new` : "Back to requests"}
    >
      <IconArrowLeft />
      Requests{unseen ? ` · ${unseen}` : ""}
    </a>
  );
}
