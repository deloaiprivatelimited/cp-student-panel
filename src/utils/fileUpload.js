// upload.js
export const uploadFile = async (file, onProgress = () => {}, path = '/') => {
  const sanitizedPath = path.replace(/^\/+/, '');

  // Sanitize file name (remove spaces)
  const safeFileName = file.name.replace(/\s+/g, '_');

  // Step 1: Request a pre-signed URL from backend
  const response = await fetch('https://backend.azad.deloai.com/generate-presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: safeFileName,
      fileType: file.type,
      path: sanitizedPath,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get a pre-signed upload URL from the server.');
  }

  const { uploadUrl, key } = await response.json();

  // Step 2: Upload using the pre-signed URL (XHR to track progress)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        onProgress(percentCompleted);
      }
    };

    xhr.onload = () => {
      // AWS S3 usually returns 200 for successful PUT
      if (xhr.status === 200 || xhr.status === 204) {
        // return the public file URL — adjust if you use a custom domain / cloudfront
        const fileUrl = `https://azadicsacademy.s3.amazonaws.com/${key}`;
        resolve({ url: fileUrl, key });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload'));
    };

    xhr.send(file);
  });
};

/**
 * Validate a file by size and MIME type.
 * @param {File} file
 * @param {{ maxSize?: number, allowedTypes?: string[] }} options
 * @returns {true}
 */
export const validateFile = (file, options = {}) => {
  const { maxSize = 10, allowedTypes } = options;

  // Size (MB)
  if (file.size > maxSize * 1024 * 1024) {
    throw new Error(`File size must be less than ${maxSize}MB`);
  }

  // Type
  if (Array.isArray(allowedTypes) && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return true;
};

/**
 * Format bytes as a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
