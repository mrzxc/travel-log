import { useEffect, useRef, useState } from "react";
export function PictureNote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false),
    [overflow, setOverflow] = useState(false);
  const paragraph = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = paragraph.current;
    if (!el) return;
    const measure = () => {
      if (!expanded) setOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [text, expanded]);
  return (
    <aside
      className={"picture-note" + (expanded ? " is-expanded" : "")}
      aria-label="图片备注"
      data-media-tool
    >
      <p ref={paragraph}>{text}</p>
      {(overflow || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起备注" : "展开备注"}
        </button>
      )}
    </aside>
  );
}
