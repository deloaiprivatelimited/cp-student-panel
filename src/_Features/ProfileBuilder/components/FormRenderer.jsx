import { useEffect, useMemo, useRef, useState } from "react";
import { FieldRenderer } from "./FieldRenderer";
import { CheckCircle } from "lucide-react";

/**
 * Props:
 *  - form: form snapshot (with sections[] and fields[] as your backend returns)
 *  - initialSubmission (optional): submission object returned from backend (to prefill values)
 *  - onSubmit: function(payload) where payload is { sections: [ { section_id, fields: [{ field_id, value, verified? }] } ] }
 *  - onChange: optional (fieldId, value) callback
 */
export function FormRenderer({ form, initialSubmission = null, onSubmit, onChange }) {
  const [formData, setFormData] = useState({}); // flat map: { [fieldId]: value }
  const [errors, setErrors] = useState({}); // flat map: { [fieldId]: errorMessage }
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const firstInvalidRef = useRef(null);

  // Build flat map of default values from form + initialSubmission
  const buildInitialFormData = () => {
    const data = {};
    const submissionMap = new Map(); // section_id -> { field_id -> value }
    if (initialSubmission && Array.isArray(initialSubmission.sections)) {
      for (const s of initialSubmission.sections) {
        const fm = {};
        for (const f of s.fields || []) {
          fm[f.field_id] = f.value;
        }
        submissionMap.set(s.section_id, fm);
      }
    }

    for (const sec of form.sections || []) {
      const submittedSection = submissionMap.get(sec.id) || {};
      for (const f of sec.fields || []) {
        // prefer submission value, else fallback to f.defaultValue or f.value (if backend uses)
        const val =
          submittedSection[f.id] !== undefined
            ? submittedSection[f.id]
            : f.defaultValue !== undefined
            ? f.defaultValue
            : f.value !== undefined
            ? f.value
            : null;
        data[f.id] = val;
      }
    }
    return data;
  };

  // initialize when form or initialSubmission changes
  useEffect(() => {
    if (!form) return;
    setFormData(buildInitialFormData());
    setErrors({});
    setCurrentSection(0);
    setIsSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, JSON.stringify(initialSubmission)]); // rerun when form changes or submission changes

  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => ({ ...prev, [fieldId]: "" }));
    onChange?.(fieldId, value);
  };

  const validateField = (field, value) => {
    if (field.required) {
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) return "This field is required";
    }

    // support optional validation array from your form model
    if (Array.isArray(field.validation)) {
      for (const rule of field.validation) {
        if (rule.type === "email" && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) return rule.message || "Invalid email address";
        }
        if (rule.type === "url" && value) {
          try {
            new URL(String(value));
          } catch {
            return rule.message || "Invalid URL";
          }
        }
        if (rule.type === "minLength" && value != null && String(value).length < rule.value) {
          return rule.message || `Minimum length is ${rule.value}`;
        }
        if (rule.type === "maxLength" && value != null && String(value).length > rule.value) {
          return rule.message || `Maximum length is ${rule.value}`;
        }
        if (rule.type === "custom" && typeof rule.validator === "function") {
          // run validator if value present or field is required
          const shouldRun = value !== undefined && value !== null && value !== "" ? true : !!field.required;
          if (shouldRun && !rule.validator(value)) return rule.message || "Validation failed";
        }
      }
    }

    // numeric range support if your form fields use min/max keys
    if (field.type === "number" && value !== undefined && value !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        if (field.min !== undefined && num < field.min) return `Value must be at least ${field.min}`;
        if (field.max !== undefined && num > field.max) return `Value must be at most ${field.max}`;
      }
    }

    return null;
  };

  const validateSection = (sectionIndex) => {
    const sec = form.sections?.[sectionIndex];
    if (!sec) return true;
    const newErrors = {};
    let isValid = true;
    for (const field of sec.fields || []) {
      const err = validateField(field, formData[field.id]);
      if (err) {
        newErrors[field.id] = err;
        isValid = false;
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const focusFirstInvalid = () => {
    // try to focus DOM element with data-field-id attribute matching first error
    const firstErrorField = Object.keys(errors).find((k) => errors[k]);
    if (!firstErrorField) return;
    const el = document.querySelector(`[data-field-id="${firstErrorField}"]`);
    if (el && typeof el.focus === "function") el.focus();
  };

  useEffect(() => {
    // whenever errors change, focus first invalid
    focusFirstInvalid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  const handleNext = () => {
    if (validateSection(currentSection)) {
      setCurrentSection((prev) => Math.min(prev + 1, (form.sections?.length || 1) - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentSection((prev) => Math.max(prev - 1, 0));
  };

  // Convert flat formData -> nested payload expected by backend
  const buildSubmissionPayload = useMemo(() => {
    const sections = (form.sections || []).map((sec) => {
      const fields = (sec.fields || []).map((f) => ({
        field_id: f.id,
        value: formData[f.id] !== undefined ? formData[f.id] : null,
      }));
      return { section_id: sec.id, fields };
    });
    return { sections };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, formData]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // validate all sections
    let allValid = true;
    for (let i = 0; i < (form.sections?.length || 0); i++) {
      if (!validateSection(i)) allValid = false;
    }

    if (!allValid) {
      setCurrentSection(0);
      return;
    }

    // If there are File objects and the consumer expects FormData, they can convert here.
    // We simply call onSubmit with the nested payload object.
    onSubmit?.(buildSubmissionPayload);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#4CA466] rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#1E1E1E] mb-4">Form Submitted!</h2>
          <p className="text-lg text-[#666666] mb-8">{form.settings?.confirmationMessage || "Thank you for your submission!"}</p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setFormData(buildInitialFormData());
              setCurrentSection(0);
              setErrors({});
            }}
            className="px-6 py-3 bg-[#4CA466] text-white rounded-lg font-medium hover:bg-[#3d8a52] transition-colors"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  const section = form.sections?.[currentSection] ?? { title: "", fields: [] };
  const progress = ((currentSection + 1) / Math.max((form.sections?.length || 1), 1)) * 100;

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1E1E1E] mb-2">{form.title}</h1>
          {form.description && <p className="text-lg text-[#666666]">{form.description}</p>}
        </div>

        {form.settings?.showProgressBar && (form.sections?.length || 0) > 1 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-[#666666] mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
              <div className="h-full bg-[#4CA466] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg p-8 mb-6">
            <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-2">{section.title}</h2>
            {section.description && <p className="text-[#666666] mb-6">{section.description}</p>}

            <div className="space-y-6">
              {(section.fields || []).map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  error={errors[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentSection === 0}
              className="px-6 py-3 border border-[#DDDDDD] text-[#666666] rounded-lg font-medium hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-[#666666]">Section {currentSection + 1} of {form.sections?.length || 1}</div>

            {currentSection < (form.sections?.length || 1) - 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
                className="px-6 py-3 bg-[#4CA466] text-white rounded-lg font-medium hover:bg-[#3d8a52] transition-colors"
              >
                Next
              </button>
            ) : (
              <button type="submit" className="px-6 py-3 bg-[#4CA466] text-white rounded-lg font-medium hover:bg-[#3d8a52] transition-colors">
                Submit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
