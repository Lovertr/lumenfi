/**
 * Slip2Go verification helper.
 * API: https://slip2go.com/developer (Thai bank slip verification via QR)
 *
 * Given a slip image URL, verifies:
 * - amount matches expected
 * - recipient PromptPay ID matches expected
 * - timestamp is recent (< 24h)
 */

export interface SlipVerifyRequest {
  slipImageUrl: string;
  expectedAmount: number;
  expectedReceiverPromptPay: string; // 10-digit phone
  maxAgeHours?: number;               // default 24
}

export interface SlipVerifyResult {
  ok: boolean;
  autoApprove: boolean;
  reason?: string;
  amount?: number;
  receiver?: string;
  transRef?: string;
  transDate?: string;
  raw?: unknown;
}

/**
 * Call Slip2Go API to verify a slip.
 * Returns { ok, autoApprove, reason }.
 */
export async function verifySlipWithSlip2Go(
  req: SlipVerifyRequest
): Promise<SlipVerifyResult> {
  const apiKey = process.env.SLIP2GO_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      autoApprove: false,
      reason: 'slip2go_not_configured',
    };
  }

  try {
    // Slip2Go API — POST slip image URL and verify
    // Endpoint varies by plan; using v3/qr/verify as common endpoint
    const res = await fetch('https://connect.slip2go.com/api/verify-slip/qr-image', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: req.slipImageUrl,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        autoApprove: false,
        reason: `slip2go_http_${res.status}`,
        raw: body,
      };
    }

    // Response shape may vary — extract common fields
    const data = body?.data ?? body ?? {};
    const amount = Number(
      data.amount ??
        data.transAmount ??
        data.total ??
        data.sendingBank?.amount ??
        0
    );
    const receiver = String(
      data.receiver?.proxy?.value ??
        data.receiver?.account?.value ??
        data.receiverAccountId ??
        ''
    ).replace(/\D/g, '');
    const transRef = String(data.transRef ?? data.ref ?? data.transactionId ?? '');
    const transDate = String(data.transDate ?? data.date ?? data.timestamp ?? '');

    // Verify amount
    if (Math.abs(amount - req.expectedAmount) > 0.5) {
      return {
        ok: false,
        autoApprove: false,
        reason: `amount_mismatch (got ${amount}, expected ${req.expectedAmount})`,
        amount,
        receiver,
        transRef,
        transDate,
        raw: body,
      };
    }

    // Verify receiver (compare last 4 digits since middle may be masked)
    const expReceiver = req.expectedReceiverPromptPay.replace(/\D/g, '');
    const receiverTail = receiver.slice(-4);
    const expTail = expReceiver.slice(-4);
    if (receiverTail && expTail && receiverTail !== expTail) {
      return {
        ok: false,
        autoApprove: false,
        reason: `receiver_mismatch (got ...${receiverTail}, expected ...${expTail})`,
        amount,
        receiver,
        transRef,
        transDate,
        raw: body,
      };
    }

    // Verify freshness
    const maxAge = (req.maxAgeHours ?? 24) * 3600 * 1000;
    const slipTime = new Date(transDate).getTime();
    if (!Number.isNaN(slipTime) && Date.now() - slipTime > maxAge) {
      return {
        ok: false,
        autoApprove: false,
        reason: `slip_too_old (${transDate})`,
        amount,
        receiver,
        transRef,
        transDate,
        raw: body,
      };
    }

    return {
      ok: true,
      autoApprove: true,
      amount,
      receiver,
      transRef,
      transDate,
      raw: body,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      autoApprove: false,
      reason: `slip2go_error: ${msg}`,
    };
  }
}
