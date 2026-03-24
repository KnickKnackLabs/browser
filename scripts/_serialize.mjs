// _serialize.mjs — DOM serializer for the `content` action
//
// Runs inside page.evaluate() — must be self-contained (no imports).
// Exported as a function that returns the serializer source for injection.

export const SERIALIZE_FN = function({ selector, depth }) {
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG']);

  function serialize(el, currentDepth, maxDepth, indent) {
    if (el.nodeType === Node.TEXT_NODE) {
      const text = el.textContent.trim();
      if (!text) return '';
      return indent + text + '\n';
    }
    if (el.nodeType !== Node.ELEMENT_NODE) return '';
    if (SKIP_TAGS.has(el.tagName)) return '';
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return '';

    const tag = el.tagName.toLowerCase();
    const attrs = [];
    for (const name of ['id', 'class', 'name', 'type', 'value', 'href', 'src', 'action', 'method', 'placeholder', 'role', 'aria-label', 'for']) {
      const val = el.getAttribute(name);
      if (val) attrs.push(`${name}="${val}"`);
    }
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';

    if (['input', 'img', 'br', 'hr', 'meta', 'link'].includes(tag)) {
      return indent + `<${tag}${attrStr}>\n`;
    }

    if (currentDepth >= maxDepth) {
      const hasChildren = el.children.length > 0 || el.textContent.trim();
      if (hasChildren) {
        return indent + `<${tag}${attrStr}>...</${tag}>\n`;
      }
      return indent + `<${tag}${attrStr}></${tag}>\n`;
    }

    let inner = '';
    for (const child of el.childNodes) {
      inner += serialize(child, currentDepth + 1, maxDepth, indent + '  ');
    }

    if (!inner.trim()) {
      const text = el.textContent.trim();
      if (text) {
        return indent + `<${tag}${attrStr}>${text}</${tag}>\n`;
      }
      return indent + `<${tag}${attrStr}></${tag}>\n`;
    }

    return indent + `<${tag}${attrStr}>\n` + inner + indent + `</${tag}>\n`;
  }

  const root = document.querySelector(selector);
  if (!root) return `No element found for selector: ${selector}`;
  return serialize(root, 0, depth, '');
};
