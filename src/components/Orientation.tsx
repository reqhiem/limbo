import styles from "./Orientation.module.css";

export function Orientation({ hasEndpoints }: { hasEndpoints: boolean }) {
  return (
    <div className={styles.orientation}>
      <h1 className={styles.title}>{hasEndpoints ? "Pick an endpoint" : "Create an endpoint"}</h1>
      <ol className={styles.steps}>
        <li>
          <span className={styles.n}>1</span>
          <span>Create an endpoint in the left column. Leave the slug blank for a random URL.</span>
        </li>
        <li>
          <span className={styles.n}>2</span>
          <span>Paste its URL into Stripe, GitHub, or any webhook sender, or hit it with curl.</span>
        </li>
        <li>
          <span className={styles.n}>3</span>
          <span>
            Each request lands at the top of the list within a second. Identical payloads draw identical barcodes, so
            retries stand out.
          </span>
        </li>
      </ol>
    </div>
  );
}
