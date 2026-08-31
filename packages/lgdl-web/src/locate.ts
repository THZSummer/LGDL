/**
 * Source-location resolution for the LGDL workbench.
 *
 * Maps a location string (as emitted by the parser's issues and by the
 * renderer's `data-lgdl-loc` attributes) to the char range of the offending
 * / corresponding text in the current document.
 *
 * Supported location formats:
 *   - "type"                          -> value after "type:"
 *   - "nodes[i]"                      -> the i-th node item's first line
 *   - "nodes[i].id|kind|label"        -> that field's value in node i
 *   - "nodes[i].contains"             -> first value in the inline group-member list
 *   - "nodes[i].contains[j]"          -> the j-th group member
 *   - "edges[i].from|to|label"        -> that field's value in edge i
 *   - "line N"                        -> the whole line N
 *   - deep paths (e.g. "nodes[0].members[1].kind") resolve to the nearest
 *     supported prefix ("nodes[0].members[1]")
 *   - "doc" / "runtime" / undefined   -> null (no location)
 */

/** Absolute position (char offsets) of a field value in the document. */
export interface DocSpan {
  from: number;
  to: number;
}

export function locateIssue(source: string, location: string | undefined): DocSpan | null {
  if (!location) return null;
  const lines = source.split('\n');
  const lineStart: number[] = [];
  let off = 0;
  for (const l of lines) {
    lineStart.push(off);
    off += l.length + 1;
  }

  // "line N" — highlight the whole line
  const lineMatch = location.match(/^line (\d+)$/);
  if (lineMatch) {
    const ln = parseInt(lineMatch[1], 10) - 1;
    if (ln < 0 || ln >= lines.length) return null;
    const content = lines[ln];
    const firstNonSpace = content.match(/\S/);
    const start = firstNonSpace ? lineStart[ln] + firstNonSpace.index! : lineStart[ln];
    return { from: start, to: lineStart[ln] + content.length };
  }

  // structured: section[index].field  or  section[index].field[j]
  // Deep paths (nodes[0].members[1].kind) don't match — strip trailing
  // segments until a supported prefix matches.
  let m = location.match(/^(\w+)(?:\[(\d+)\])?(?:\.(\w+)(?:\[(\d+)\])?)?$/);
  if (!m) {
    let loc = location;
    while (loc) {
      const dot = loc.lastIndexOf('.');
      if (dot === -1) break;
      loc = loc.slice(0, dot);
      m = loc.match(/^(\w+)(?:\[(\d+)\])?(?:\.(\w+)(?:\[(\d+)\])?)?$/);
      if (m) break;
    }
  }
  if (!m) return null;
  const [, section, idxStr, field, subIdxStr] = m;
  const idx = idxStr !== undefined ? parseInt(idxStr, 10) : 0;
  const subIdx = subIdxStr !== undefined ? parseInt(subIdxStr, 10) : 0;

  // find the top-level section line, e.g. "edges:" (may or may not have a value)
  let sectionLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    if (indent > 0) continue; // only top-level keys
    if (/^\w+:/.test(trimmed) && trimmed.startsWith(section + ':')) {
      sectionLine = i;
      break;
    }
  }
  if (sectionLine === -1) return null;

  // section without list items (e.g. "type", "title"): value after colon
  if (idxStr === undefined && !field) {
    const line = lines[sectionLine];
    const colonIdx = line.indexOf(':');
    const value = line.slice(colonIdx + 1).trim();
    if (!value) {
      // empty value — mark right after the colon
      return { from: lineStart[sectionLine] + colonIdx + 1, to: lineStart[sectionLine] + colonIdx + 2 };
    }
    const vStart = line.indexOf(value, colonIdx + 1);
    return { from: lineStart[sectionLine] + vStart, to: lineStart[sectionLine] + vStart + value.length };
  }

  // walk the list items under the section. Only items at the section's own
  // indent count — nested lists (e.g. `members:` items inside a node) must
  // not be mistaken for section items, or `nodes[1]` would resolve to a
  // member row of node 0 when node 0 has members.
  let itemCount = -1;
  let itemIndent = -1;
  for (let i = sectionLine + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || l.trim().startsWith('#')) continue;
    const indent = l.length - l.trimStart().length;
    if (indent === 0) break; // next top-level key
    if (!l.trim().startsWith('- ')) continue;
    if (itemIndent === -1) itemIndent = indent;
    if (indent !== itemIndent) continue; // nested list item (e.g. member)
    itemCount++;
    if (itemCount !== idx) continue;

    const itemIndentAt = indent;
    if (!field) {
      // whole item line fallback
      return { from: lineStart[i], to: lineStart[i] + l.length };
    }

    // the field may sit on the item's first line: "- from: paid1"
    const firstMatch = l.trim().slice(2).match(new RegExp(`^${field}:\\s*(.*)$`));
    if (firstMatch) {
      const value = firstMatch[1].trim();
      if (subIdxStr !== undefined) {
        // inline list value: contains: [a, b, c]
        return locateListValue(source, lines, lineStart, i, value, subIdx);
      }
      const vStart = l.indexOf(value);
      return { from: lineStart[i] + vStart, to: lineStart[i] + vStart + value.length };
    }

    // scan following indented lines for "field: value"
    for (let j = i + 1; j < lines.length; j++) {
      const nl = lines[j];
      if (!nl.trim() || nl.trim().startsWith('#')) continue;
      const ni = nl.length - nl.trimStart().length;
      if (ni <= itemIndentAt) break;
      const fm = nl.trim().match(new RegExp(`^${field}:\\s*(.*)$`));
      if (fm) {
        const value = fm[1].trim();
        if (subIdxStr !== undefined) {
          if (value === '') {
            // block list field (e.g. members:) — locate the j-th nested item
            return locateNestedListItem(lines, lineStart, j, subIdx);
          }
          return locateListValue(source, lines, lineStart, j, value, subIdx);
        }
        const vStart = nl.indexOf(value);
        return { from: lineStart[j] + vStart, to: lineStart[j] + vStart + value.length };
      }
    }

    // field not found in this item — fallback to whole item line
    return { from: lineStart[i], to: lineStart[i] + l.length };
  }
  return null;
}

/** Locate the j-th element of an inline list like "contains: [a, b, c]". */
function locateListValue(
  source: string,
  lines: string[],
  lineStart: number[],
  lineIdx: number,
  rawValue: string,
  subIdx: number,
): DocSpan | null {
  const listMatch = rawValue.match(/^\[(.*)\]$/s);
  if (!listMatch) return null;
  const items = listMatch[1].split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  if (subIdx >= items.length) return null;
  // find the sub-item within the raw list text
  const listStart = lines[lineIdx].indexOf(rawValue);
  const itemPos = listMatch[1].indexOf(items[subIdx]);
  if (itemPos === -1) return null;
  return {
    from: lineStart[lineIdx] + listStart + 1 + itemPos,
    to: lineStart[lineIdx] + listStart + 1 + itemPos + items[subIdx].length,
  };
}

/**
 * Locate the j-th item of a block list field (e.g. `members:`). Items live
 * at a deeper indent than the field line; returns the item's first line.
 */
function locateNestedListItem(
  lines: string[],
  lineStart: number[],
  fieldLineIdx: number,
  subIdx: number,
): DocSpan | null {
  const fieldIndent = lines[fieldLineIdx].length - lines[fieldLineIdx].trimStart().length;
  let itemCount = -1;
  for (let j = fieldLineIdx + 1; j < lines.length; j++) {
    const nl = lines[j];
    if (!nl.trim() || nl.trim().startsWith('#')) continue;
    const ni = nl.length - nl.trimStart().length;
    if (ni <= fieldIndent) break;
    if (!nl.trim().startsWith('- ')) continue;
    itemCount++;
    if (itemCount !== subIdx) continue;
    return { from: lineStart[j], to: lineStart[j] + nl.length };
  }
  return null;
}
