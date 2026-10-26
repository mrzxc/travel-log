import { useEffect, useRef, useState } from "react";

export function confirmedDuration(text: string, previous: number): number {
  if (!text.trim()) return previous;
  const number = Number(text);
  return Number.isFinite(number)
    ? Math.max(0.2, Math.min(60, number))
    : previous;
}
export function RouteDurationInput({
  value,
  label,
  onCommit,
}: {
  value: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  function confirm() {
    focused.current = false;
    const next = confirmedDuration(draft, value);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  }
  return (
    <input
      className="route-duration-input"
      aria-label={label}
      type="text"
      inputMode="decimal"
      title="动画时长：0.2–60 秒，回车或移开焦点确认"
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={confirm}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.blur();
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")
          event.currentTarget.blur();
      }}
    />
  );
}
