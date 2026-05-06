'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { exportUserData, deleteUserAccount } from '@/app/[locale]/(app)/settings/privacy/actions';

export function PrivacyControls() {
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumenfi-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold">ส่งออกข้อมูลของฉัน</h3>
        <p className="text-sm text-muted-foreground">
          ดาวน์โหลดข้อมูลทั้งหมดในรูปแบบ JSON — รายการ บัญชี เป้าหมาย ทุกอย่าง
        </p>
        <Button onClick={handleExport} disabled={exporting} variant="outline" className="w-full">
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {exporting ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลด JSON'}
        </Button>
      </div>

      <div className="border-t pt-6 space-y-2">
        <h3 className="flex items-center gap-2 font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          ลบบัญชีและข้อมูลทั้งหมด
        </h3>
        <p className="text-sm text-muted-foreground">
          การลบบัญชีจะลบข้อมูลทั้งหมดอย่างถาวร — ไม่สามารถกู้คืนได้
        </p>

        {!confirmOpen ? (
          <Button
            onClick={() => setConfirmOpen(true)}
            variant="outline"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            ลบบัญชีของฉัน
          </Button>
        ) : (
          <form
            action={async (fd) => {
              const result = await deleteUserAccount(fd);
              if (result?.error) setError(result.error);
            }}
            className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          >
            <p className="text-sm">
              พิมพ์อีเมลของคุณเพื่อยืนยัน — ข้อมูลทั้งหมดจะถูกลบและออกจากระบบ
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm_email">อีเมล</Label>
              <Input
                id="confirm_email"
                name="confirm_email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                required
              />
            </div>
            {error === 'email_mismatch' && (
              <p className="text-xs text-destructive">อีเมลไม่ตรงกัน</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setConfirmOpen(false);
                  setError(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" variant="destructive" className="flex-1">
                ลบถาวร
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
