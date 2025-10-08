export class FormBuilder {
  constructor(title, description) {
    this.form = {
      id: this.generateId(),
      title,
      description,
      sections: [],
      settings: {
        allowMultipleSubmissions: true,
        showProgressBar: false,
        shuffleQuestions: false,
        collectEmail: false,
        confirmationMessage: 'Thank you for your submission!',
      },
    };
    this.currentSection = null;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  addSection(title, description) {
    this.currentSection = {
      id: this.generateId(),
      title,
      description,
      fields: [],
    };
    this.form.sections.push(this.currentSection);
    return this;
  }

  ensureSection() {
    if (!this.currentSection) {
      this.addSection('Main Section');
    }
  }

  addShortText(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'short-text',
      label,
      ...options,
    });
    return this;
  }

  addLongText(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'long-text',
      label,
      rows: options.rows || 4,
      ...options,
    });
    return this;
  }

  addParagraph(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'paragraph',
      label,
      rows: options.rows || 6,
      ...options,
    });
    return this;
  }

  addNumber(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'number',
      label,
      ...options,
    });
    return this;
  }

  addEmail(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'email',
      label,
      validation: [{ type: 'email', message: 'Please enter a valid email address' }],
      ...options,
    });
    return this;
  }

  addUrl(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'url',
      label,
      validation: [{ type: 'url', message: 'Please enter a valid URL' }],
      ...options,
    });
    return this;
  }

  addPhone(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'phone',
      label,
      ...options,
    });
    return this;
  }

  addDate(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'date',
      label,
      ...options,
    });
    return this;
  }

  addTime(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'time',
      label,
      ...options,
    });
    return this;
  }

  addDateTime(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'datetime',
      label,
      ...options,
    });
    return this;
  }

  addMultipleChoice(label, options, fieldOptions = {}) {
    this.ensureSection();
    const formattedOptions = options.map((opt) => {
      if (typeof opt === 'string') {
        return {
          id: this.generateId(),
          label: opt,
          value: opt,
        };
      }
      return opt;
    });

    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'multiple-choice',
      label,
      options: formattedOptions,
      ...fieldOptions,
    });
    return this;
  }

  addCheckboxes(label, options, fieldOptions = {}) {
    this.ensureSection();
    const formattedOptions = options.map((opt) => {
      if (typeof opt === 'string') {
        return {
          id: this.generateId(),
          label: opt,
          value: opt,
        };
      }
      return opt;
    });

    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'checkboxes',
      label,
      options: formattedOptions,
      ...fieldOptions,
    });
    return this;
  }

  addDropdown(label, options, fieldOptions = {}) {
    this.ensureSection();
    const formattedOptions = options.map((opt) => {
      if (typeof opt === 'string') {
        return {
          id: this.generateId(),
          label: opt,
          value: opt,
        };
      }
      return opt;
    });

    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'dropdown',
      label,
      options: formattedOptions,
      ...fieldOptions,
    });
    return this;
  }

  addLinearScale(label, minScale, maxScale, minLabel, maxLabel, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'linear-scale',
      label,
      minScale,
      maxScale,
      scaleMinLabel: minLabel,
      scaleMaxLabel: maxLabel,
      ...options,
    });
    return this;
  }

  addFileUpload(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'file-upload',
      label,
      acceptedFileTypes: options.acceptedFileTypes || ['*/*'],
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024,
      allowMultiple: options.allowMultiple || false,
      ...options,
    });
    return this;
  }

  addImageUpload(label, options = {}) {
    this.ensureSection();
    this.currentSection.fields.push({
      id: this.generateId(),
      type: 'image-upload',
      label,
      acceptedFileTypes: options.acceptedFileTypes || ['image/*'],
      maxFileSize: options.maxFileSize || 5 * 1024 * 1024,
      allowMultiple: options.allowMultiple || false,
      ...options,
    });
    return this;
  }

  setSettings(settings) {
    this.form.settings = {
      ...this.form.settings,
      ...settings,
    };
    return this;
  }

  build() {
    return this.form;
  }
}
