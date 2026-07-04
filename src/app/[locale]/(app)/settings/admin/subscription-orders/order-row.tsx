'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ExternalLink } from 'lucide-react';

interface Order {
  id: string;
  order_ref: string;
  plan_code: string;
  billing_cycle: string;
  amount_thb: number;
  slip_url: string | null;
  slip_uploaded_at: string | null;
  slip_auto_verified: boolean;
  slip_verify_meta: unknown;
  status: string;
  created_at: string;
  signed_slip_url: string | null;
  user_email: string;
  user_display_name: string | null;
}

export default function OrderRow({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!confirm(`ยืนยันการอนุมัติ Order ${order.order_ref}?\n\nจะ activate ${order.plan_code} ${order.billing_cycle} ให้ ${order.user_email}`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscription/orders/${order.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!rejectReason.trim()) {
      setError('กรุณาระบุเหตุผล');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscription/orders/${order.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const meta = order.slip_verify_meta as { reason?: string; amount?: number; receiver?: string } | null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Slip image */}
          {order.signed_slip_url ? (
            <a
              href={order.signed_slip_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.signed_slip_url}
                alt="slip"
                className="h-40 w-40 rounded-md border object-cover"
              />
            </a>
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
              No slip
            </div>
          )}

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-semibold">
                {order.order_ref}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · ฿{Number(order.amount_thb).toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {order.user_email} {order.user_display_name && `(${order.user_display_name})`}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.plan_code} · {order.billing_cycle}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Uploaded: {order.slip_uploaded_at ? new Date(order.slip_uploaded_at).toLocaleString('th-TH') : '?'}
              </p>
            </div>

            {/* Slip2Go verification result */}
            {meta && (
              <div className="rounded-md bg-muted/40 p-2 text-xs">
                <p className="font-semibold">🤖 Slip2Go auto-verify: ❌ (needs manual review)</p>
                <p className="text-muted-foreground">Reason: {meta.reason ?? '?'}</p>
                {meta.amount != null && <p className="text-muted-foreground">Slip amount: ฿{meta.amount}</p>}
                {meta.receiver && <p className="text-muted-foreground">Receiver: {meta.receiver}</p>}
              </div>
            )}

            {error && <p className="text-xs text-red-600">⚠️ {error}</p>}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={approve}
                disabled={busy}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Check className="mr-1 h-3 w-3" />
                Approve
              </Button>
              {!showRejectInput ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectInput(true)}
                  disabled={busy}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              ) : (
                <div className="flex flex-1 items-center gap-1">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="เหตุผล"
                    className="flex-1 rounded border px-2 py-1 text-sm"
                    disabled={busy}
                  />
                  <Button size="sm" variant="destructive" onClick={reject} disabled={busy}>
                    Confirm reject
                  </Button>
                </div>
              )}
              {order.signed_slip_url && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={order.signed_slip_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
