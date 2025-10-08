import { Upload } from 'lucide-react';

export function FieldRenderer({ field, value, error, onChange }) {
  const renderField = () => {
    switch (field.type) {
      case 'short-text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'long-text':
      case 'paragraph':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E] resize-none"
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          />
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {field.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-5 h-5 text-[#4CA466] border-[#DDDDDD] focus:ring-[#4CA466] focus:ring-2"
                />
                <span className="text-[#1E1E1E] group-hover:text-[#4CA466] transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case 'checkboxes':
        return (
          <div className="space-y-3">
            {field.options?.map((option) => {
              const checkedValues = Array.isArray(value) ? value : [];
              const isChecked = checkedValues.includes(option.value);

              return (
                <label
                  key={option.id}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...checkedValues, option.value]
                        : checkedValues.filter((v) => v !== option.value);
                      onChange(newValues);
                    }}
                    className="w-5 h-5 text-[#4CA466] border-[#DDDDDD] rounded focus:ring-[#4CA466] focus:ring-2"
                  />
                  <span className="text-[#1E1E1E] group-hover:text-[#4CA466] transition-colors">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent bg-white text-[#1E1E1E]"
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'linear-scale':
        const scaleValues = Array.from(
          { length: (field.maxScale || 5) - (field.minScale || 1) + 1 },
          (_, i) => (field.minScale || 1) + i
        );

        return (
          <div>
            <div className="flex items-center justify-between mb-2 text-sm text-[#666666]">
              <span>{field.scaleMinLabel}</span>
              <span>{field.scaleMaxLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              {scaleValues.map((scaleValue) => (
                <label
                  key={scaleValue}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <input
                    type="radio"
                    name={field.id}
                    value={scaleValue}
                    checked={value === scaleValue}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-5 h-5 text-[#4CA466] border-[#DDDDDD] focus:ring-[#4CA466] focus:ring-2 mb-1"
                  />
                  <span className="text-sm text-[#666666] group-hover:text-[#4CA466] transition-colors">
                    {scaleValue}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'file-upload':
      case 'image-upload':
        return (
          <div>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#DDDDDD] rounded-lg cursor-pointer bg-white hover:bg-[#F5F5F5] transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 text-[#666666] mb-2" />
                <p className="text-sm text-[#666666]">
                  <span className="font-semibold text-[#4CA466]">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-[#999999] mt-1">
                  {field.acceptedFileTypes?.join(', ')} (max {(field.maxFileSize || 0) / 1024 / 1024}MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept={field.acceptedFileTypes?.join(',')}
                multiple={field.allowMultiple}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    onChange(field.allowMultiple ? Array.from(files) : files[0]);
                  }
                }}
              />
            </label>
            {value && (
              <div className="mt-2 text-sm text-[#666666]">
                {Array.isArray(value)
                  ? `${value.length} file(s) selected`
                  : value.name || 'File selected'}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <label className="block mb-2">
        <span className="text-[#1E1E1E] font-medium">
          {field.label}
          {field.required && <span className="text-[#4CA466] ml-1">*</span>}
          {field.verificationRequired && (
            <span className="text-xs text-[#666666] ml-2 font-normal">(Verification Required)</span>
          )}
        </span>
        {field.description && (
          <span className="block text-sm text-[#666666] mt-1">{field.description}</span>
        )}
      </label>
      {renderField()}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
