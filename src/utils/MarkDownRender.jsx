// src/components/MarkdownRenderer.jsx
import React from "react";
import PropTypes from "prop-types";
import { marked } from "marked";
import DOMPurify from "dompurify";
import markedKatex from "marked-katex-extension";
import './markdownoverride.css'
import "github-markdown-css/github-markdown-light.css";

/**
 * MarkdownRenderer
 *
 * Props:
 *  - text: string (markdown source) — required
 *  - className: string (optional additional classNames for wrapper)
 *  - containerProps: object (props forwarded to the wrapper div)
 *
 * Usage:
 *  <MarkdownRenderer text={markdownString} />
 */
export default function MarkdownRenderer({ text, className = "", containerProps = {} }) {
    const options = {
  throwOnError: false
};
  // Configure marked — keep header IDs off and avoid email mangling
  const mdOptions = {
    headerIds: false,
    mangle: false,
  };

  // Convert markdown -> HTML
  const rawHtml = React.useMemo(() => {
    try {
        marked.use(markedKatex(options));

      return marked.parse(text || "", mdOptions);
    } catch (err) {
      // Fallback to plain-escaped text if parsing fails
      return `<pre>${String(text || "").replace(/</g, "&lt;")}</pre>`;
    }
  }, [text]);

  // Sanitize HTML to protect from XSS
  const sanitized = React.useMemo(() => DOMPurify.sanitize(rawHtml), [rawHtml]);

  return (
    <div
      {...containerProps}
      className={`markdown-body ${className}`}
      // Intentional: sanitized HTML only
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

MarkdownRenderer.propTypes = {
  text: PropTypes.string.isRequired,
  className: PropTypes.string,
  containerProps: PropTypes.object,
};
