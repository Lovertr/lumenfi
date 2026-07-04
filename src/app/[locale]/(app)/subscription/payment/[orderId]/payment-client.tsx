'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, CheckCircle2, Clock, AlertCircle, Copy } from 'lucide-react';

interface Order {
  id: string;
  order_ref: string;
  plan_code: string;
  billing_cycle: string;
  amount_thb: number;
  status: string;
  admin_notes: string | null;
  slip_uploaded_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  slip_auto_verified: boolean;
}

export default function PaymentClient({
  order,
  qrImageUrl,
  promptpayId,
}: {
  order: Order;
  qrImageUrl: string;
  promptpayId: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์ต้องไม่เกิน 5MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('order_id', order.id);
      fd.append('slip', file);
      const res = await fetch('/api/subscription/order/upload-slip', {
        method: 'POST',
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'upload_failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('ยืนยันยกเลิก order นี้? หลังยกเลิกจะต้องสร้าง order ใหม่')) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/order/${order.id}/cancel`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'cancel_failed');
      router.push('/settings/billing');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setUploading(false);
    }
  }

  function copyId() {
    navigator.clipboard.writeText(promptpayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const amountStr = Number(order.amount_thb).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
  });

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pt-6">
      <header>
        <h1 className="text-xl font-bold">ชำระเงินสำหรับ Lumenfi Pro</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Order #{order.order_ref} · {order.billing_cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}
        </p>
      </header>

      {order.status === 'approved' && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">
                  ยืนยันการชำระเงินเรียบร้อย! 🎉
                  {order.slip_auto_verified && ' (auto-verified)'}
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  Pro หมดอายุ: {order.expires_at ? new Date(order.expires_at).toLocaleDateString('th-TH') : '?'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.status === 'pending_review' && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">
                  รอแอดมินยืนยัน (ปกติไม่เกิน 2 ชม.)
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  ระบบส่ง slip ให้แอดมินตรวจสอบแล้ว จะแจ้งกลับทางอีเมล
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.status === 'rejected' && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">การยืนยันไม่ผ่าน</p>
                <p className="mt-1 text-sm text-red-700">
                  เหตุผล: {order.admin_notes ?? 'ไม่ระบุ'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {order.status === 'pending_upload' && (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">ยอดชำระ</p>
                <p className="mt-1 text-3xl font-bold text-primary">฿{amountStr}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">รวม VAT แล้ว</p>
              </div>

              <div className="mx-auto max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="PromptPay QR"
                  width={400}
                  height={400}
                  className="w-full rounded-lg border bg-white p-2"
                />
              </div>

              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">รับเงินโดย PromptPay:</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono">{promptpayId}</span>
                  <button
                    onClick={copyId}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
              </div>

              <ol className="space-y-1.5 text-xs text-muted-foreground">
                <li>1. เปิด mobile banking → สแกน QR (หรือใส่เบอร์ + ยอด)</li>
                <li>2. ยอดจะถูก lock ที่ ฿{amountStr} (ห้ามแก้)</li>
                <li>3. โอนแล้ว → screenshot slip → อัพโหลดด้านล่าง</li>
                <li>4. ระบบจะ auto-verify ผ่าน Slip2Go (ปกติได้ Pro ทันที)</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <label
                htmlFor="slip-upload"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center hover:bg-primary/10"
              >
                <Upload className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-semibold">
                    {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดสลิปการโอน'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    JPEG / PNG / WEBP · max 5MB
                  </p>
                </div>
                <input
                  id="slip-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              {error && (
                <p className="mt-2 text-xs text-red-600">⚠️ {error}</p>
              )}
            </CardContent>
          </Card>

          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            className="w-full py-2 text-xs text-muted-foreground hover:text-destructive"
          >
            ↩ ยกเลิก order นี้
          </button>
        </>
      )}

      <div className="pt-2 text-center">
        <Button asChild variant="ghost" size="sm">
          <a href="/settings/subscription">← ประวัติการสมัคร</a>
        </Button>
      </div>
    </div>
  );
}
