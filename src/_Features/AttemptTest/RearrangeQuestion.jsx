// RearrangeQuestion.jsx (compatible with both shapes)
// - supports question.items (item_id) and question.options (option_id)
// - reads question.is_drag_and_drop to decide drag vs up/down (but you can override via prop)
import React, { useEffect, useState, useRef } from "react";

export default function RearrangeQuestion({
  question,
  onSolved = () => {},
  onClear = () => {},
  onNextWithoutSave = () => {},
  disabled = false,
  initialOrder = null, // array of ids OR array of objects
  isDrag = null, // if null, will read question.is_drag_and_drop
}) {
  // Determine canonical keys and list
  const rawList = question?.items ?? question?.options ?? [];
  const idKey = rawList.length > 0 && rawList[0].item_id ? "item_id" : "option_id";
  const textKey = rawList.length > 0 && rawList[0].value ? "value" : "value";

  // detect drag mode: explicit prop takes precedence, otherwise question flag
//   const resolvedIsDrag = typeof isDrag === "boolean" ? isDrag : !!question?.is_drag_and_drop;
   const resolvedIsDrag = typeof isDrag === "boolean" ? isDrag : !!question?.is_drag_and_drop;

  // helper: convert raw element to canonical { id, html, images, raw }
  const toCanon = (raw) => ({
    id: raw[idKey],
    html: raw[textKey] ?? "",
    images: raw.images ?? [],
    raw,
  });

  // build initial items from initialOrder if provided (initialOrder may be array of ids)
  const buildInitial = () => {
    if (Array.isArray(initialOrder) && initialOrder.length > 0) {
      // map id -> raw
      const map = rawList.reduce((m, r) => {
        m[r[idKey]] = r;
        return m;
      }, {});
      // if initialOrder contains objects instead of ids, normalize
      if (typeof initialOrder[0] === "object") {
        return initialOrder.map((o) => toCanon(o));
      }
      return initialOrder.map((id) => map[id]).filter(Boolean).map(toCanon);
    }
    // fallback: default order from question
    return rawList.map(toCanon);
  };

  const [items, setItems] = useState(buildInitial);
  const draggingIdx = useRef(null);
  const questionIdRef = useRef(null);
  // optional dirty flag: becomes true when user manipulates UI (prevents automatic reset)
  const dirtyRef = useRef(false);
    useEffect(() => {
    const qId = question?.id ?? question?.question_id ?? null;
    if (questionIdRef.current !== qId) {
      questionIdRef.current = qId;
      // reset dirty when a new question loads
      dirtyRef.current = false;
      setItems(buildInitial());
    }
    // deliberately DO NOT depend on `initialOrder` to avoid clobbering user's edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);
  // Drag handlers
  const onDragStart = (e, idx) => {
    if (!resolvedIsDrag || disabled) return;
    draggingIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch (_) {}
  };
  const onDragOver = (e, idx) => {
    if (!resolvedIsDrag || disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
const onDrop = (e, idx) => {
  if (!resolvedIsDrag || disabled) return;
  e.preventDefault();
  let from = draggingIdx.current;
  if (from == null) {
    const txt = e.dataTransfer.getData("text/plain");
    from = txt ? Number(txt) : null;
  }
  if (from == null || from === idx) {
    draggingIdx.current = null;
    return;
  }
  setItems((prev) => {
    const next = [...prev];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    return next;
  });
  // mark as dirty (user has made changes)
  dirtyRef.current = true;
  draggingIdx.current = null;
};

const moveUp = (idx) => {
  if (disabled || idx <= 0) return;
  setItems((prev) => {
    const next = [...prev];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    return next;
  });
  dirtyRef.current = true;
};
const moveDown = (idx) => {
  if (disabled || idx >= items.length - 1) return;
  setItems((prev) => {
    const next = [...prev];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    return next;
  });
  dirtyRef.current = true;
};


  // Save: call onSolved with array of ids
  const handleSave = async () => {
    if (disabled) return;
    const order = items.map((it) => it.id);
    console.log("order",order)
    try {
      await Promise.resolve(onSolved(order));
    } catch (err) {
      console.error("Rearrange onSolved threw:", err);
    }
  };

  // Clear: reset UI and call onClear with [] (parent will normalize)
  const handleClear = async () => {
    if (disabled) return;
    setItems(rawList.map(toCanon));
    try {
      await Promise.resolve(onClear([]));
    } catch (err) {
      console.error("Rearrange onClear threw:", err);
    }
  };

  const handleNextNoSave = () => {
    if (disabled) return;
    onNextWithoutSave();
  };

  return (
    <div className="bg-white/5 border rounded-lg p-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="mb-3">
        <div className="font-semibold text-white">{question?.title ?? "Arrange the following"}</div>
        {question?.prompt && (
          <div className="text-sm text-gray-300 mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: String(question.prompt) }} />
        )}
      </div>

      <div className="space-y-2">
        {items.map((opt, idx) => {
          const key = opt?.id ?? `opt-${idx}`;
          return (
            <div
              key={key}
              draggable={resolvedIsDrag && !disabled}
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
              className="flex items-center gap-3 p-3 rounded-md border bg-transparent"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                cursor: resolvedIsDrag && !disabled ? "grab" : "default",
              }}
            >
              <div className="w-6 text-sm text-gray-300">{idx + 1}.</div>

              <div className="flex-1 text-sm text-gray-100">
                <div dangerouslySetInnerHTML={{ __html: opt.html || "" }} />
                {opt.images?.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {opt.images.map((img, i) => (
                      <img key={i} src={img} alt={`opt-${i}`} className="w-24 h-16 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              {!resolvedIsDrag && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveUp(idx)} disabled={disabled || idx === 0} className="px-2 py-1 bg-gray-700 rounded text-sm text-white">▲</button>
                  <button onClick={() => moveDown(idx)} disabled={disabled || idx === items.length - 1} className="px-2 py-1 bg-gray-700 rounded text-sm text-white">▼</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-sm text-gray-400">
        {resolvedIsDrag ? "Drag and drop to reorder." : "Use the ▲ ▼ buttons to reorder."} Click <strong>Save & Continue</strong> to persist.
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={handleSave} disabled={disabled} className={`px-3 py-2 rounded-md text-white ${disabled ? "bg-gray-600" : "bg-[#4CA466]"}`}>
          Save & Continue
        </button>

        <button onClick={handleClear} disabled={disabled} className="px-3 py-2 rounded-md text-white bg-gray-700">
          Clear
        </button>

        <button onClick={handleNextNoSave} disabled={disabled} className="px-3 py-2 rounded-md text-white bg-blue-600">
          Next (No Save)
        </button>
      </div>
    </div>
  );
}
