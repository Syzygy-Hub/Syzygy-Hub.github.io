// HTML helpers. Every value written into a page passes through esc().

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function table(headers, rows) {
  const head = headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const body = rows
    .map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('\n');
  return `<div class="table-wrap"><table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`;
}

export function link(href, text) {
  return `<a href="${esc(href)}">${esc(text)}</a>`;
}
