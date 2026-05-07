'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Row {
  [key: string]: string | number;
}

export function CSVDownloadButton({ filename, rows, headers }: {
  filename: string;
  rows: Row[];
  headers: { key: string; label: string }[];
}) {
  const onClick = () => {
    const headerLine = headers.map(h => `"${h.label}"`).join(',');
    const dataLines = rows.map(r =>
      headers.map(h => {
        const v = r[h.key];
        if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
        return String(v ?? '');
      }).join(',')
    );
    const csv = [headerLine, ...dataLines].join('\n');
    // Add UTF-8 BOM so Excel opens Thai correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={onClick} size="sm" variant="outline" disabled={rows.length === 0}>
      <Download className="mr-1 h-3.5 w-3.5" />
      Download CSV
    </Button>
  );
}
