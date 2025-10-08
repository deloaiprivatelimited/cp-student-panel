// src/pages/ProfileBuilder.tsx (or wherever you keep it)
import React, { useEffect, useState } from "react";
import { FormRenderer } from "./components/FormRenderer";
import { privateAxios } from "../../utils/axios";
import { showError, showSuccess } from "../../utils/toast";

type FieldValue = any;

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  // ...other props forwarded from backend
  [key: string]: any;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface Form {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  settings?: Record<string, any>;
}

interface SubmissionPayload {
  id: string;
  college?: string;
  form?: string;
  student_id?: string;
  sections?: Array<{
    section_id: string;
    fields: Array<{ field_id: string; value: FieldValue; verified?: boolean }>;
  }>;
  created_at?: string;
  updated_at?: string;
}

function ProfileBuilder() {
  const [form, setForm] = useState<Form | null>(null);
  const [submission, setSubmission] = useState<SubmissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load form metadata then the student's submission for that form
  useEffect(() => {
    let mounted = true;

    const fetchFormAndSubmission = async () => {
      setLoading(true);
      try {
        // 1) Fetch the form (your existing endpoint)
        const formResp = await privateAxios.get("/faculty/student/profile/form/forms");
        // assume backend returns { success, message, data: <form object> }
        const returnedForm: Form = formResp.data?.data;
        if (!returnedForm || !returnedForm.id) {
          throw new Error("Form not available or missing id");
        }
        if (!mounted) return;
        setForm(returnedForm);

        // 2) Fetch or create the submission for the current student+form
        // Use the new submission endpoint we discussed: GET /submissions/forms/:formId
        const subResp = await privateAxios.get(`/student/profile/form/forms/${returnedForm.id}`);
        const returnedSubmission: SubmissionPayload = subResp.data?.data;
        if (!mounted) return;
        setSubmission(returnedSubmission);
        console.log("rs",returnedSubmission)

      } catch (err: any) {
        console.error("Failed to load profile form / submission:", err);
        // Try to show a friendly error based on axios response shape
        if (err?.response?.data?.message) {
          showError(err.response.data.message);
        } else {
          showError("Failed to load profile form. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFormAndSubmission();

    return () => {
      mounted = false;
    };
  }, []);

  // Convert submission->form shape expected by FormRenderer
  // The backend stores sections/fields as { section_id, fields: [{field_id, value}] }
  const buildFormForRenderer = (): Form | null => {
    if (!form || !submission) return null;

    // We want the same form structure but with `value` coming from submission
    const sectionMap = new Map<string, Record<string, FieldValue>>();
    for (const s of submission.sections || []) {
      const map: Record<string, FieldValue> = {};
      for (const f of s.fields || []) {
        map[f.field_id] = f.value;
      }
      sectionMap.set(s.section_id, map);
    }

    const sections = (form.sections || []).map((sec) => {
      const fields = (sec.fields || []).map((f) => {
        const submittedValue = sectionMap.get(sec.id)?.[f.id];
        // Field format expected by FormRenderer is the same as backend (we're re-using it).
        return {
          ...f,
          // Optionally provide default value from submission:
          defaultValue: submittedValue !== undefined ? submittedValue : f.defaultValue ?? null,
        };
      });
      return {
        ...sec,
        fields,
      };
    });

    return {
      ...form,
      sections,
    };
  };

  const formForRenderer = buildFormForRenderer();

  // Transform the data returned by FormRenderer (flat { fieldId: value } ) into submission structure
  // BUT FormRenderer currently calls onSubmit with formData object keyed by field.id (flat). We need to
  // map that back to the backend payload shape: sections -> fields -> { field_id, value }.
  // If your FormRenderer uses the nested structure instead, adapt accordingly.
  const normalizeFormDataToSections = (flat: Record<string, any>) => {
    // Build a map of fieldId -> value from flat input (flat may already be shaped by field ids)
    const valueMap = flat || {};

    // Iterate over current form snapshot to produce ordered sections & fields
    const payloadSections: Array<{ section_id: string; fields: Array<{ field_id: string; value: any }> }> = [];
    for (const sec of form?.sections || []) {
      const fieldsPayload: Array<{ field_id: string; value: any }> = [];
      for (const f of sec.fields || []) {
        // prefer submitted value from flat map; if missing, use existing submission value or null
        const fieldVal =
          valueMap[f.id] !== undefined
            ? valueMap[f.id]
            : // fallback to existing submission
              (submission?.sections || [])
                .find((s) => s.section_id === sec.id)
                ?.fields.find((fv) => fv.field_id === f.id)?.value ??
              null;
        fieldsPayload.push({ field_id: f.id, value: fieldVal });
      }
      payloadSections.push({ section_id: sec.id, fields: fieldsPayload });
    }

    return { sections: payloadSections };
  };

  const handleSubmit = async (flatFormData: Record<string, any>) => {
    if (!form) {
      showError("No form loaded");
      return;
    }

    setSaving(true);
    try {
      // Convert flat -> nested payload expected by backend
      const payload = normalizeFormDataToSections(flatFormData);

      // POST to create or update submission
      const resp = await privateAxios.post(`/student/profile/form/forms/${form.id}`, payload);

      // backend returns saved submission in data
      const saved: SubmissionPayload = resp.data?.data;
      setSubmission(saved);
      showSuccess("Profile saved successfully.");
    } catch (err: any) {
      console.error("Failed to save submission:", err);
      if (err?.response?.data?.message) {
        showError(err.response.data.message);
      } else {
        showError("Failed to save profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading profile form…</div>
      </div>
    );
  }

  if (!form || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Form not found. Contact admin if this persists.</div>
      </div>
    );
  }

  // Adapted FormRenderer expects `form` to contain fields etc. We pass 'formForRenderer'.
  // Also pass a custom onSubmit which will POST to the backend.
  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{form.title}</h1>
        {form.description && <p className="text-gray-600 mb-6">{form.description}</p>}

        {formForRenderer ? (
          <>
            <FormRenderer
              form={formForRenderer}
              onSubmit={handleSubmit}
              onChange={(fieldId: string, value: any) => {
                // optional: local analytics or UI feedback
                console.debug("field changed:", fieldId, value);
              }}
            />

            <div className="mt-4">
              <button
                onClick={() => {
                  // re-fetch submission if user wants to discard local changes
                  window.location.reload();
                }}
                className="px-4 py-2 border rounded mr-3"
                disabled={saving}
              >
                Reload
              </button>

              <button
                onClick={() => {
                  // manual submit: we want FormRenderer to perform submit itself.
                  // If you want a separate submit button here, you'd need to gather current flat values.
                  showError("Use the form's Submit button to save changes.");
                }}
                className="px-4 py-2 bg-gray-100 rounded"
                disabled={saving}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <div>No form to render.</div>
        )}
      </div>
    </div>
  );
}

export default ProfileBuilder;
