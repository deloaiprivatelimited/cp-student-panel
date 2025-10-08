import React from 'react';

import { useState ,useEffect} from 'react';
import { FormBuilder } from '../utils/FormBuilder';
import { Plus, Trash2, Eye, GripVertical, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import HeaderWrapper from '../../../utils/HeaderWrapper';
import FooterWrapper from '../../../utils/FooterWrapper';
import { privateAxios } from '../../../utils/axios';
import { showError,showSuccess } from '../../../utils/toast';

export function FormCreator({ onFormGenerated,formData }) {
  const [formTitle, setFormTitle] = useState('Student Placement Profile');
  const [formDescription, setFormDescription] = useState('Please complete this form to create your student placement profile. The information you provide will help the placement team understand your academic background, skills, and interests, and connect you with suitable opportunities. You may be asked to share your resume, academic scores, certifications, and other relevant details. Ensure that all information is accurate and updated.');
  const [currentPage, setCurrentPage] = useState(0);
   const [isOpen, setIsOpen] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [sections, setSections] = useState([
    {
      id: generateId(),
      title: 'Main Section',
      description: '',
      fields: [],
    },
  ]);

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  // 🧩 Load existing form data if provided
  useEffect(() => {
    if (formData) {
      setFormTitle(formData.title || 'Student Placement Profile');
      setFormDescription(formData.description || '');
      setIsOpen(Boolean(formData.open))
      if (formData.sections && Array.isArray(formData.sections)) {
        // Ensure all sections and fields have IDs
        const withIds = formData.sections.map((s) => ({
          ...s,
          id: s.id || generateId(),
          fields: (s.fields || []).map((f) => ({
            ...f,
            id: f.id || generateId(),
          })),
        }));
        setSections(withIds);
      }
    }
  }, [formData]);
  const addSection = () => {
    setSections([
      ...sections,
      {
        id: generateId(),
        title: 'New Section',
        description: '',
        fields: [],
      },
    ]);
    setCurrentPage(sections.length);
  };

  const removeSection = (sectionId) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== sectionId));
      if (currentPage >= sections.length - 1) {
        setCurrentPage(Math.max(0, sections.length - 2));
      }
    }
  };
const toggleOpen = async () => {
  if (toggleBusy) return;
  setToggleBusy(true);

  try {
    // axios will throw for non-2xx by default, so we just await the request
    const res = await privateAxios.patch('/faculty/student/profile/form/forms/toggle_open');

    // axios response body is in res.data
    const body = res && res.data ? res.data : null;
    console.log(body)

    if (!body) {
      showError('Toggle failed', 'Empty response from server');
      return;
    }

    // optionally handle API-level success flag
    if (typeof body.success !== 'undefined' && !body.success) {
      showError('Toggle failed', body.message || 'Unknown error');
      return;
    }

    // new open state should be in body.data.open per your backend
    const newOpen = body.data && typeof body.data.open !== 'undefined'
      ? Boolean(body.data.open)
      : // fallback: if backend didn't return open, toggle locally
        !isOpen;

    setIsOpen(newOpen);
    // show success feedback if you have it
    if (body.message) showSuccess?.(body.message);

  } catch (err) {
    console.log('errer',err)
    // axios error shape: err.response (server returned non-2xx), err.request (no response), or generic
    if (err.response && err.response.data) {
      const serverMsg = err.response.data.message || JSON.stringify(err.response.data);
      showError('Toggle failed', serverMsg);
    } else if (err.request) {
      showError('Toggle failed', 'No response from server. Check your network or backend.');
    } else {
      showError('Toggle failed', err.message || String(err));
    }
  } finally {
    setToggleBusy(false);
  }
};


  const handleNextPage = () => {
    if (currentPage < sections.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const updateSection = (sectionId, updates) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  const addField = (sectionId, type) => {
    const newField = {
      id: generateId(),
      type,
      label: `${type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Question`,
      required: false,
      verificationRequired: false,
      ...(type === 'multiple-choice' || type === 'checkboxes' || type === 'dropdown'
        ? { options: ['Option 1', 'Option 2', 'Option 3'] }
        : {}),
      ...(type === 'linear-scale'
        ? { minScale: 1, maxScale: 5, scaleMinLabel: 'Low', scaleMaxLabel: 'High' }
        : {}),
      ...(type === 'long-text' || type === 'paragraph' ? { rows: 4 } : {}),
    };

    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s
      )
    );
  };

  const removeField = (sectionId, fieldId) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    );
  };

  const updateField = (sectionId, fieldId, updates) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : s
      )
    );
  };

  const updateFieldOption = (sectionId, fieldId, optionIndex, value) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) => {
                if (f.id === fieldId && f.options) {
                  const newOptions = [...f.options];
                  newOptions[optionIndex] = value;
                  return { ...f, options: newOptions };
                }
                return f;
              }),
            }
          : s
      )
    );
  };

  const addFieldOption = (sectionId, fieldId) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) => {
                if (f.id === fieldId && f.options) {
                  return {
                    ...f,
                    options: [...f.options, `Option ${f.options.length + 1}`],
                  };
                }
                return f;
              }),
            }
          : s
      )
    );
  };

  const removeFieldOption = (sectionId, fieldId, optionIndex) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) => {
                if (f.id === fieldId && f.options && f.options.length > 1) {
                  return {
                    ...f,
                    options: f.options.filter((_, i) => i !== optionIndex),
                  };
                }
                return f;
              }),
            }
          : s
      )
    );
  };

  const generateForm = () => {
    const builder = new FormBuilder(formTitle, formDescription);
    // console.log(builder)
    // return;

    sections.forEach((section) => {
      builder.addSection(section.title, section.description);

      section.fields.forEach((field) => {
        switch (field.type) {
          case 'short-text':
            builder.addShortText(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'long-text':
            builder.addLongText(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
              rows: field.rows,
            });
            break;
          case 'paragraph':
            builder.addParagraph(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
              rows: field.rows,
            });
            break;
          case 'number':
            builder.addNumber(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
              min: field.min,
              max: field.max,
            });
            break;
          case 'email':
            builder.addEmail(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'url':
            builder.addUrl(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'phone':
            builder.addPhone(field.label, {
              description: field.description,
              placeholder: field.placeholder,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'date':
            builder.addDate(field.label, {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'time':
            builder.addTime(field.label, {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'datetime':
            builder.addDateTime(field.label, {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'multiple-choice':
            builder.addMultipleChoice(field.label, field.options || [], {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'checkboxes':
            builder.addCheckboxes(field.label, field.options || [], {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'dropdown':
            builder.addDropdown(field.label, field.options || [], {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'linear-scale':
            builder.addLinearScale(
              field.label,
              field.minScale || 1,
              field.maxScale || 5,
              field.scaleMinLabel,
              field.scaleMaxLabel,
              {
                description: field.description,
                required: field.required,
                verificationRequired: field.verificationRequired,
              }
            );
            break;
          case 'file-upload':
            builder.addFileUpload(field.label, {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
          case 'image-upload':
            builder.addImageUpload(field.label, {
              description: field.description,
              required: field.required,
              verificationRequired: field.verificationRequired,
            });
            break;
        }
      });
    });

    builder.setSettings({
      allowMultipleSubmissions: true,
      showProgressBar: sections.length > 1,
      confirmationMessage: 'Thank you for your submission!',
    });

    onFormGenerated(builder.build());
  };

  const fieldTypes = [
    { value: 'short-text', label: 'Short Text' },
    { value: 'long-text', label: 'Long Text' },
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'checkboxes', label: 'Checkboxes' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'linear-scale', label: 'Linear Scale' },
    { value: 'file-upload', label: 'File Upload' },
    { value: 'image-upload', label: 'Image Upload' },
  ];

  const currentSection = sections[currentPage];

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
   {/* Replace your existing <HeaderWrapper> ... </HeaderWrapper> with this */}
<HeaderWrapper>
  <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
    {/* Left: title + subtitle */}
    <div className="min-w-0">
      <h1 className="text-4xl font-bold text-[#1E1E1E] mb-2">Student Placement Profile Builder</h1>
      <p className="text-lg text-[#666666]">Build your custom form with drag-and-drop simplicity</p>
    </div>

    {/* Right: Save button (aligned to top-right on larger screens) */}
      {/* Right: Save button + Open toggle */}
    <div className="flex items-start md:items-center gap-3">
      <button
        onClick={generateForm}
        className="flex items-center gap-2 px-6 py-3 bg-[#4CA466] text-white rounded-lg font-medium hover:bg-[#3d8a52] transition-colors"
      >
        <Eye className="w-5 h-5" />
        Save Form
      </button>

      <button
        onClick={toggleOpen}
        disabled={toggleBusy}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors border ${
          isOpen
            ? 'bg-white border-[#4CA466] text-[#4CA466] hover:bg-[#f0fff4]'
            : 'bg-white border-[#DDDDDD] text-[#666666] hover:bg-[#F5F5F5]'
        }`}
        title={isOpen ? 'Click to close the form (no further submissions)' : 'Click to open the form (allow submissions)'}
      >
        {/* simple visual: text + small indicator */}
        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-[#4CA466]' : 'bg-[#DDDDDD]'}`} />
        <span className="text-sm">{isOpen ? 'Open' : 'Closed'}</span>
      </button>
    </div>

  </div>
</HeaderWrapper>

    <div className="bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg p-8 mb-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[#1E1E1E] font-medium mb-2">Form Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                disabled={true}
                className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
              />
            </div>
            <div>
              <label className="block text-[#1E1E1E] font-medium mb-2">Form Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
                disabled={true}
                className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E] resize-none"
              />
            </div>
          </div>
        </div>
        {sections.length > 1 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1E1E1E]">
                Section {currentPage + 1} of {sections.length}
              </h3>
              <div className="flex gap-2">
                {sections.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentPage
                        ? 'bg-[#4CA466]'
                        : 'bg-[#DDDDDD] hover:bg-[#999999]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <SectionEditor
          key={currentSection.id}
          section={currentSection}
          sectionIndex={currentPage}
          canRemove={sections.length > 1}
          fieldTypes={fieldTypes}
          onUpdateSection={(updates) => updateSection(currentSection.id, updates)}
          onRemoveSection={() => removeSection(currentSection.id)}
          onAddField={(type) => addField(currentSection.id, type)}
          onRemoveField={(fieldId) => removeField(currentSection.id, fieldId)}
          onUpdateField={(fieldId, updates) => updateField(currentSection.id, fieldId, updates)}
          onUpdateFieldOption={(fieldId, index, value) =>
            updateFieldOption(currentSection.id, fieldId, index, value)
          }
          onAddFieldOption={(fieldId) => addFieldOption(currentSection.id, fieldId)}
          onRemoveFieldOption={(fieldId, index) =>
            removeFieldOption(currentSection.id, fieldId, index)
          }
        />

      <FooterWrapper>
          <div className="flex justify-between items-center gap-4 mt-6">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-6 py-3 border border-[#DDDDDD] text-[#666666] rounded-lg font-medium hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous Section
          </button>

          <div className="flex gap-4">
            <button
              onClick={addSection}
              className="flex items-center gap-2 px-6 py-3 border border-[#DDDDDD] text-[#666666] rounded-lg font-medium hover:bg-[#F5F5F5] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Section
            </button>

       
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === sections.length - 1}
            className="flex items-center gap-2 px-6 py-3 border border-[#DDDDDD] text-[#666666] rounded-lg font-medium hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Section
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </FooterWrapper>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  sectionIndex,
  canRemove,
  fieldTypes,
  onUpdateSection,
  onRemoveSection,
  onAddField,
  onRemoveField,
  onUpdateField,
  onUpdateFieldOption,
  onAddFieldOption,
  onRemoveFieldOption,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFieldTypeMenu, setShowFieldTypeMenu] = useState(false);

  return (
    <div className="bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <GripVertical className="w-5 h-5 text-[#999999] flex-shrink-0" />
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdateSection({ title: e.target.value })}
              className="flex-1 px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E] font-semibold"
              placeholder="Section Title"
            />
          </div>
          <input
            type="text"
            value={section.description || ''}
            onChange={(e) => onUpdateSection({ description: e.target.value })}
            className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#666666] text-sm ml-8"
            placeholder="Section Description (optional)"
          />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-[#666666] hover:text-[#4CA466] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {canRemove && (
            <button
              onClick={onRemoveSection}
              className="p-2 text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="space-y-4 mb-4">
            {section.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                onUpdateField={(updates) => onUpdateField(field.id, updates)}
                onRemoveField={() => onRemoveField(field.id)}
                onUpdateFieldOption={(index, value) =>
                  onUpdateFieldOption(field.id, index, value)
                }
                onAddFieldOption={() => onAddFieldOption(field.id)}
                onRemoveFieldOption={(index) => onRemoveFieldOption(field.id, index)}
              />
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFieldTypeMenu(!showFieldTypeMenu)}
              className="flex items-center gap-2 px-4 py-2 border border-[#DDDDDD] text-[#666666] rounded-lg font-medium hover:bg-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>

            {showFieldTypeMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-[#DDDDDD] rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                {fieldTypes.map((fieldType) => (
                  <button
                    key={fieldType.value}
                    onClick={() => {
                      onAddField(fieldType.value);
                      setShowFieldTypeMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[#1E1E1E] hover:bg-[#F5F5F5] transition-colors border-b border-[#DDDDDD] last:border-b-0"
                  >
                    {fieldType.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FieldEditor({
  field,
  onUpdateField,
  onRemoveField,
  onUpdateFieldOption,
  onAddFieldOption,
  onRemoveFieldOption,
}) {
  const hasOptions =
    field.type === 'multiple-choice' ||
    field.type === 'checkboxes' ||
    field.type === 'dropdown';
  const isScale = field.type === 'linear-scale';

  return (
    <div className="bg-white border border-[#DDDDDD] rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <GripVertical className="w-5 h-5 text-[#999999] flex-shrink-0 mt-2" />
        <div className="flex-1 space-y-3">
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdateField({ label: e.target.value })}
            className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E]"
            placeholder="Question"
          />
          <input
            type="text"
            value={field.description || ''}
            onChange={(e) => onUpdateField({ description: e.target.value })}
            className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#666666] text-sm"
            placeholder="Description (optional)"
          />
          {field.placeholder !== undefined && (
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdateField({ placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#666666] text-sm"
              placeholder="Placeholder (optional)"
            />
          )}

          {hasOptions && field.options && (
            <div className="space-y-2">
              {field.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => onUpdateFieldOption(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E] text-sm"
                    placeholder={`Option ${index + 1}`}
                  />
                  {field.options && field.options.length > 1 && (
                    <button
                      onClick={() => onRemoveFieldOption(index)}
                      className="p-2 text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={onAddFieldOption}
                className="text-sm text-[#4CA466] hover:text-[#3d8a52] transition-colors"
              >
                + Add Option
              </button>
            </div>
          )}

          {isScale && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#666666] mb-1">Min Scale</label>
                <input
                  type="number"
                  value={field.minScale || 1}
                  onChange={(e) => onUpdateField({ minScale: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-1">Max Scale</label>
                <input
                  type="number"
                  value={field.maxScale || 5}
                  onChange={(e) => onUpdateField({ maxScale: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-1">Min Label</label>
                <input
                  type="text"
                  value={field.scaleMinLabel || ''}
                  onChange={(e) => onUpdateField({ scaleMinLabel: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E] text-sm"
                  placeholder="e.g., Low"
                />
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-1">Max Label</label>
                <input
                  type="text"
                  value={field.scaleMaxLabel || ''}
                  onChange={(e) => onUpdateField({ scaleMaxLabel: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] bg-white text-[#1E1E1E] text-sm"
                  placeholder="e.g., High"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdateField({ required: e.target.checked })}
                  className="w-4 h-4 text-[#4CA466] border-[#DDDDDD] rounded focus:ring-[#4CA466]"
                />
                <span className="text-sm text-[#666666]">Required</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.verificationRequired}
                  onChange={(e) => onUpdateField({ verificationRequired: e.target.checked })}
                  className="w-4 h-4 text-[#4CA466] border-[#DDDDDD] rounded focus:ring-[#4CA466]"
                />
                <span className="text-sm text-[#666666]">Verification Required</span>
              </label>
            </div>
            <span className="text-xs text-[#999999]">{field.type}</span>
          </div>
        </div>
        <button
          onClick={onRemoveField}
          className="p-2 text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
