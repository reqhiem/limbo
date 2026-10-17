const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** 10-char Crockford base32 timestamp; also the sortable prefix of every ULID. */
export function encodeTime(ms: number): string {
  let out = "";
  for (let i = 0; i < 10; i++) {
    out = CROCKFORD.charAt(ms % 32) + out;
    ms = Math.floor(ms / 32);
  }
  return out;
}

/** Monotonic ULIDs: ids generated within the same millisecond increment the random part. */
export function ulidFactory(): (now: number) => string {
  let lastTime = -1;
  const digits = new Uint8Array(16);
  return (now) => {
    if (now <= lastTime) {
      now = lastTime;
      let i = 15;
      while (i >= 0 && digits[i] === 31) digits[i--] = 0;
      if (i < 0) throw new Error("ULID random part overflow");
      digits[i] = digits[i]! + 1;
    } else {
      lastTime = now;
      crypto.getRandomValues(digits);
      for (let i = 0; i < 16; i++) digits[i] = digits[i]! & 31;
    }
    return encodeTime(now) + Array.from(digits, (d) => CROCKFORD.charAt(d)).join("");
  };
}

export function randomSlug(length = 14): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => SLUG_ALPHABET.charAt(b & 31)).join("");
}
