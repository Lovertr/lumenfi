import type { ReactNode } from 'react';

/**
 * Lightweight markdown renderer — supports h2/h3, bullets, numbered lists,
 * bold/italic/code inline. No external dependency.
 */
export function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const result: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${result.length}`} className="my-2 ml-2 space-y-1.5 list-disc list-inside">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  function renderInline(s: string): ReactNode[] {
    const parts: ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(s)) !== null) {
      if (m.index > lastIdx) parts.push(s.slice(lastIdx, m.index));
      if (m[1]) parts.push(<strong key={key++}>{m[1]}</strong>);
      else if (m[2]) parts.push(<em key={key++}>{m[2]}</em>);
      else if (m[3]) parts.push(<code key={key++} className="rounded bg-muted px-1 py-0.5 text-xs">{m[3]}</code>);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < s.length) parts.push(s.slice(lastIdx));
    return parts;
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      flushList();
      result.push(
        <h3 key={`h3-${i}`} className="mt-4 mb-2 text-base font-bold text-primary first:mt-0">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      result.push(
        <h4 key={`h4-${i}`} className="mt-3 mb-1.5 text-sm font-semibold">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      result.push(
        <h2 key={`h2-${i}`} className="mt-4 mb-2 text-lg font-bold text-primary first:mt-0">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {renderInline(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      result.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          <strong className="text-primary mr-1.5">{trimmed.match(/^\d+/)?.[0]}.</strong>
          {renderInline(trimmed.replace(/^\d+\.\s/, ''))}
        </p>
      );
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      result.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    }
  });
  flushList();

  return result;
}
