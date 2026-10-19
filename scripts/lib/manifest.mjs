// Reads the flat syzygy.yml manifests used by Syzygy repositories: top-level
// "key: value" lines, quoted or plain scalars, and inline "[a, b]" lists.
// Nested blocks are ignored. Standard library only.

function unquote(text) {
  const t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

export function parseManifest(text) {
  const result = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim() || /^\s/.test(line) || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value.slice(1, -1).split(',').map((s) => unquote(s)).filter(Boolean);
    } else {
      result[key] = unquote(value);
    }
  }
  return result;
}
