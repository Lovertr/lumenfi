'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Copy-to-clipboard button for an agent's invite link.
 * The link is meant for sharing (LINE / Facebook / business card),
 * NOT for the agent to open themselves — so the primary action is "Copy".
 */
export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts (mobile may need this)
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2.5 font-mono text-sm">
      <span className="flex-1 truncate text-primary">{url}</span>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          copied
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-background text-muted-foreground hover:bg-muted'
        }`}
        aria-label={copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            คัดลอกแล้ว
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            คัดลอก
          </>
        )}
      </button>
    </div>
  );
}
