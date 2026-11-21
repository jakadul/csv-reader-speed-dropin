// solve.js — faster drop-in for csv-reader 1.0.0 (make.fun csv-reader-speed-01-run-20261121)
// language: JavaScript (ES module), runtime: Node 22, platform: linux x64 (make.fun sandbox)
// Technique: single-pass char-code scanner with slice-based field building; conversion
// rewriting only runs when a span actually contains "" / CR / LF, so plain fields cost one
// slice. Behaviour follows csv-reader 1.0.0's broken-row policy exactly (vendor/csv-reader/index.js).

const COMMA = 1; // how a field ended: 1 = comma, 2 = line break, 3 = end
const LINE_BREAK = 2;
const END = 3;

/** csv-reader 1.0.0's answer for one case's input: {columns, rows, errors}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const len = text.length;

  let pos = 0;
  let line = 1;
  if (len > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Reads unquoted characters up to the next comma or line break. Returns [field, ended, added]:
  // a CR not followed by LF is dropped (stray_cr); if any was met, the span is rebuilt without them.
  function readUnquoted(start, initial) {
    let i = start;
    let needsRewrite = false;

    function finish(ended) {
      if (!needsRewrite) {
        const value = initial !== null ? initial + text.slice(start, i) : text.slice(start, i);
        return [value, ended, i - start];
      }
      // Rebuild without the dropped stray CRs (kept counts characters kept in this call).
      let out = initial !== null ? initial : '';
      let seg = start;
      let kept = 0;
      for (let j = start; j < i; j++) {
        const c = text.charCodeAt(j);
        if (c === 13 /* \r */ && (j + 1 >= len || text.charCodeAt(j + 1) !== 10)) {
          out += text.slice(seg, j);
          seg = j + 1;
        } else {
          kept += 1;
        }
      }
      out += text.slice(seg, i);
      return [out, ended, kept];
    }

    while (i < len) {
      const c = text.charCodeAt(i);
      if (c === 44 /* , */) {
        pos = i + 1;
        return finish(COMMA);
      }
      if (c === 10 /* \n */) {
        pos = i + 1;
        line += 1;
        return finish(LINE_BREAK);
      }
      if (c === 13 /* \r */) {
        if (i + 1 < len && text.charCodeAt(i + 1) === 10) {
          pos = i + 2;
          line += 1;
          return finish(LINE_BREAK);
        }
        error('stray_cr');
        needsRewrite = true;
      }
      i += 1;
    }
    pos = i;
    return finish(END);
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let i = open + 1;
    let needsRewrite = false;
    let closed = false;
    while (i < len) {
      const c = text.charCodeAt(i);
      if (c === 34 /* " */) {
        if (i + 1 < len && text.charCodeAt(i + 1) === 34) {
          needsRewrite = true;
          i += 2;
          continue;
        }
        i += 1;
        closed = true;
        break;
      }
      if (c === 13 /* \r */) {
        needsRewrite = true;
        i += i + 1 < len && text.charCodeAt(i + 1) === 10 ? 2 : 1;
        line += 1;
        continue;
      }
      if (c === 10 /* \n */) {
        needsRewrite = true;
        i += 1;
        line += 1;
        continue;
      }
      i += 1;
    }
    if (!closed) {
      // The quote never closes: a literal character, and the text after it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      error('unterminated_quote');
      return readUnquoted(pos, '"');
    }
    if (i >= len) {
      pos = i;
      return [needsRewrite ? buildQuoted(open + 1, i - 1) : text.slice(open + 1, i - 1), END, i - 1 - (open + 1)];
    }
    let value;
    let ended;
    if (needsRewrite) value = buildQuoted(open + 1, i - 1);
    else value = text.slice(open + 1, i - 1);
    const c = text.charCodeAt(i);
    if (c === 44 /* , */) {
      pos = i + 1;
      ended = COMMA;
    } else if (c === 10 /* \n */) {
      pos = i + 1;
      line += 1;
      ended = LINE_BREAK;
    } else if (c === 13 /* \r */ && i + 1 < len && text.charCodeAt(i + 1) === 10) {
      pos = i + 2;
      line += 1;
      ended = LINE_BREAK;
    } else {
      // What follows the closing quote is appended as it stands, up to the next comma or line break.
      const junk = readUnquoted(i, value);
      if (junk[2] > 0) error('quote_junk');
      return junk;
    }
    pos = i + (ended === LINE_BREAK && c === 13 ? 2 : 1);
    return [value, ended, 0];
  }

  // Rebuilds the quoted span [a, b): "" -> one quote, CRLF / lone CR -> one LF.
  function buildQuoted(a, b) {
    let out = '';
    let seg = a;
    for (let i = a; i < b; i++) {
      const c = text.charCodeAt(i);
      if (c === 34 /* " */) {
        out += text.slice(seg, i) + '"';
        seg = i + 2; // consume both quotes of the pair
        i += 1;
        continue;
      }
      if (c === 13 /* \r */) {
        out += text.slice(seg, i) + '\n';
        seg = i + 1;
        if (i + 1 < b && text.charCodeAt(i + 1) === 10) {
          i += 1;
          seg = i + 1;
        }
        continue;
      }
      if (c === 10 /* \n */) {
        out += text.slice(seg, i) + '\n';
        seg = i + 1;
      }
    }
    return out + text.slice(seg, b);
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10 /* \n */) {
        pos += 1;
        line += 1;
      } else if (c === 13 /* \r */ && pos + 1 < len && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let ended;
    let quoted = false;
    let firstValue;
    do {
      quoted = text.charCodeAt(pos) === 34 /* " */;
      if (quoted) {
        const r = readQuoted();
        firstValue = r[0];
        ended = r[1];
      } else {
        const r = readUnquoted(pos, null);
        firstValue = r[0];
        ended = r[1];
      }
      fields.push(firstValue);
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      do {
        fields.push('');
      } while (fields.length < width);
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}