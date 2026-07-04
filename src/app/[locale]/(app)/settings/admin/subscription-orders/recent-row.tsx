'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RecentOrder {
  id: string;
  user_id: string;
  order_ref: string;
  amount_thb: number | string;
  status: string;
  slip_auto_verified: boolean;
  activated_at?: string | null;
  expires_at?: string | null;
}

export default function RecentOrderRow({
  order,
  userEmail,
}: {
  order: RecentOrder;
  userEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund() {
    const reason = prompt('เหตุผลการคืนเงิน:');
    if (!reason || !reason.trim()) return;
    if (!confirm(`ยืนยันคืนเงิน order ${order.order_ref}?\n\n${reason}\n\nจะย้อนการ activate + แจ้ง user\n(admin ต้องโอนเงินคืนเอง)`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscription/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const statusBadge = (() => {
    if (order.status === 'approved') return { cls: 'bg-emerald-100 text-emerald-800', txt: '✅ approved' };
    if (order.status === 'rejected') return { cls: 'bg-red-100 text-red-800', txt: '❌ rejected' };
    if (order.status === 'refunded') return { cls: 'bg-purple-100 text-purple-800', txt: '↩ refunded' };
    return { cls: 'bg-gray-100 text-gray-700', txt: order.status };
  })();

  return (
    <li className="flex items-center justify-between gap-2 p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">
          {order.order_ref}
          {order.slip_auto_verified && <span className="ml-2 text-[10px] text-emerald-600">🤖 auto</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {userEmail} · ฿{Number(order.amount_thb).toLocaleString()}
        </p>
        {error && <p className="text-[10px] text-red-600">⚠️ {error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}>
          {statusBadge.txt}
        </span>
        {order.status === 'approved' && (
          <button
            onClick={refund}
            disabled={busy}
            className="rounded border border-purple-300 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
            title="Refund + reverse activation"
          >
            ↩ refund
          </button>
        )}
      </div>
    </li>
  );
}
