import { useEffect, useState, type ReactNode } from "react";

interface Props {
  label: string;
  onConfirm: () => Promise<void> | void;
  icon?: ReactNode;
  small?: boolean;
  disabled?: boolean;
}

/** Two-step inline confirm: the first click arms it for 3s, the second runs `onConfirm`. */
export function ConfirmButton({ label, onConfirm, icon, small = false, disabled = false }: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const onClick = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn${small ? " small" : ""}${armed ? " on" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Escape" && setArmed(false)}
      onBlur={() => setArmed(false)}
      disabled={disabled || busy}
      aria-live="polite"
    >
      {icon}
      {busy ? `${label}…` : armed ? (
        <>
          Confirm?<span className="visually-hidden"> {label}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
