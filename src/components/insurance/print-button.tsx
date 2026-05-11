'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button
      size="sm"
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
    >
      <Printer className="mr-2 h-4 w-4" />
      พิมพ์ / บันทึก PDF
    </Button>
  );
}
