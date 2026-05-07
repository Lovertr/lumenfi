'use client';

import { Link } from '@/i18n/routing';
import { ExternalLink } from 'lucide-react';

/**
 * Lightweight markdown renderer tuned for advisor reports.
 * Supports: # ## ### h, * **bold**, - bullets, [text](/path) internal links,
 * [text](https://...) external links.
 * No raw HTML — strict allow-list to avoid injection from LLM output.
 */
export function MarkdownRender({ content }: { content: string }) {
  const lines = content.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const renderInline = (s: string): React.ReactNode[] => {
    // Match links [text](url) and bold **text**
    const parts: React.ReactNode[] = [];
    let rest = s;
    let kk = 0;
    while (rest.length > 0) {
      const linkMatch = rest.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const boldMatch = rest.match(/\*\*([^*]+)\*\*/);

      const linkIdx = linkMatch ? rest.indexOf(linkMatch[0]) : -1;
      const boldIdx = boldMatch ? rest.indexOf(boldMatch[0]) : -1;

      let nextIdx = -1;
      let kind: 'link' | 'bold' | null = null;
      if (linkIdx !== -1 && (boldIdx === -1 || linkIdx < boldIdx)) {
        nextIdx = linkIdx;
        kind = 'link';
      } else if (boldIdx !== -1) {
        nextIdx = boldIdx;
        kind = 'bold';
      }

      if (nextIdx === -1 || !kind) {
        parts.push(rest);
        break;
      }

      if (nextIdx > 0) parts.push(rest.slice(0, nextIdx));

      if (kind === 'link' && linkMatch) {
        const [full, text, url] = linkMatch;
        const isInternal = url.startsWith('/');
        if (isInternal) {
          parts.push(
            <Link
              key={`l${kk++}`}
              href={url}
              className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
            >
              {text}
              <ExternalLink className="h-3 w-3" />
            </Link>
          );
        } else {
          parts.push(
            <a
              key={`l${kk++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {text}
            </a>
          );
        }
        rest = rest.slice(nextIdx + full.length);
      } else if (kind === 'bold' && boldMatch) {
        const [full, text] = boldMatch;
        parts.push(<strong key={`b${kk++}`}>{text}</strong>);
        rest = rest.slice(nextIdx + full.length);
      } else {
        parts.push(rest);
        break;
      }
    }
    return parts;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      out.push(
        <h3 key={key++} className="mt-4 text-sm font-semibold text-foreground">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      out.push(
        <h2 key={key++} className="mt-5 mb-2 text-base font-bold text-foreground">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      out.push(
        <h1 key={key++} className="mt-2 mb-3 text-lg font-bold text-foreground">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Bullet groups
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l.startsWith('- ') || l.startsWith('* ')) {
          items.push(l.slice(2));
          i++;
        } else if (l === '') {
          i++;
          break;
        } else {
          break;
        }
      }
      out.push(
        <ul key={key++} className="ml-5 list-disc space-y-1 text-sm text-foreground/90">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Plain paragraph
    out.push(
      <p key={key++} className="text-sm leading-relaxed text-foreground/90">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <article className="space-y-2">{out}</article>;
}
