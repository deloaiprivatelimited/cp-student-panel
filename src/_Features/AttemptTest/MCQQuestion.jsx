// MCQQuestion.jsx
import React, { useEffect, useState } from "react";
import { useRef } from "react";

/**
 * Props:
 * - question
 * - onSolved(answer)
 * - onClear(clearPayload)   <-- NEW: called when user clicks Clear (persist a cleared answer)
 * - onNextWithoutSave()     <-- NEW: advance to next question without saving
 * - disabled, initialSelected, autoSubmit
 */
export default function MCQQuestion({
  question,
  onSolved = () => {},
  onClear = () => {},
  onNextWithoutSave = () => {},
  disabled = false,
  initialSelected = null,
  autoSubmit = false,
}) {
  const isMultiple = !!question?.is_multiple;
  const normalize = (sel) => {
    if (sel == null) return [];
    return Array.isArray(sel) ? sel : [sel];
  };
const questionIdRef = useRef(null);

  const [selected, setSelected] = useState(() => normalize(initialSelected));
  const [localSolved, setLocalSolved] = useState(false);
  const [saving, setSaving] = useState(false);
  // console.log('initaly selceteed')
  // console.log(initialSelected)


useEffect(() => {
  const qId = question?.id ?? question?.question_id ?? null;

  // Only initialize selected when the question changed (first mount for this question)
  // Avoid resyncing when parent updates initialSelected while the user is editing.
  if (questionIdRef.current !== qId) {
    questionIdRef.current = qId;
    setSelected(normalize(initialSelected));
    setLocalSolved(false);
  }
  // we deliberately DO NOT depend on `initialSelected` to avoid overwriting the user's in-progress edits
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [question?.id]);
  useEffect(() => {
    if (autoSubmit && selected.length > 0 && !localSolved) {
      setLocalSolved(true);
      const payload = isMultiple ? [...selected] : selected[0];
      try {
        onSolved(payload);
      } catch (err) {
        console.error("onSolved handler threw:", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, autoSubmit]);

  const toggleOption = (optionId) => {
    if (disabled) return;
    if (isMultiple) {
      setSelected((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
    } else {
      setSelected([optionId]);
    }
  };

  const handleSaveAndContinue = async () => {
    if (disabled) return;
    if (selected.length === 0) return;
    setSaving(true);
    setLocalSolved(true);
    const payload = isMultiple ? [...selected] : selected[0];
    try {
      await Promise.resolve(onSolved(payload));
    } catch (err) {
      console.error("onSolved handler threw:", err);
    } finally {
      setSaving(false);
    }
  };

  // Persist cleared value (calls parent onClear) but does NOT navigate forward
  const handleClear = async () => {
    if (disabled) return;
    const clearedPayload = []; // always send [] (parent normalizes)
    setSelected([]);
    setLocalSolved(false); // allow autosubmit later if needed
    try {
      setSaving(true);
      await Promise.resolve(onClear(clearedPayload));
    } catch (err) {
      console.error("onClear handler threw:", err);
    } finally {
      setSaving(false);
      setLocalSolved(true);
    }
  };

  // Just notify parent to advance without saving (parent should handle index increment)
  const handleNextWithoutSave = () => {
    if (disabled) return;
    onNextWithoutSave();
  };

  return (
    <div className="bg-white/5 border rounded-lg p-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="mb-3">
        <div className="font-semibold text-white">{question?.title ?? "Question"}</div>
        <div
          className="text-sm text-gray-300 mt-1 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: (question?.question_text || "").replace(/\n/g, "<br />") }}
        />
      </div>

      <div className="space-y-2">
        {(question?.options || []).map((opt) => {
          const isSelected = selected.includes(opt.option_id);
          return (
            <label
              key={opt.option_id}
              className={`flex items-start gap-3 p-3 rounded-md cursor-pointer border ${isSelected ? "ring-2 ring-green-400 bg-white/5" : "bg-transparent"}`}
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="mt-0.5">
                {isMultiple ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(opt.option_id)}
                    disabled={disabled}
                    className="w-4 h-4"
                  />
                ) : (
                  <input
                    type="radio"
                    name={`mcq-${question?.id}`}
                    checked={isSelected}
                    onChange={() => toggleOption(opt.option_id)}
                    disabled={disabled}
                    className="w-4 h-4"
                  />
                )}
              </div>

              <div className="flex-1 text-sm text-gray-100">
                <div dangerouslySetInnerHTML={{ __html: opt.value }} />
                {opt.images && opt.images.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {opt.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`option-${idx}`} className="w-24 h-16 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              {isSelected && <div className="text-xs text-green-300">Selected</div>}
            </label>
          );
        })}
      </div>

      <div className="mt-3 text-sm text-gray-400">
        {isMultiple
          ? "Multiple choice — you may select more than one option. Click Save & Continue to store your selections."
          : "Single choice — pick one, then click Save & Continue to store your selection."}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSaveAndContinue}
          disabled={disabled || selected.length === 0 || saving}
          className={`px-3 py-2 rounded-md text-white ${disabled || selected.length === 0 ? "bg-gray-600 cursor-not-allowed" : "bg-[#4CA466]"}`}
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>

        {/* Clear persists an empty answer but does NOT advance */}
        <button onClick={handleClear} disabled={disabled || saving} className="px-3 py-2 rounded-md text-white bg-gray-700">
          {saving ? "Saving..." : "Clear"}
        </button>

        {/* Next without saving (local navigation only) */}
        <button onClick={handleNextWithoutSave} disabled={disabled} className="px-3 py-2 rounded-md text-white bg-blue-600">
          Next (No Save)
        </button>
      </div>
    </div>
  );
}
