/**
 * LINE Notify integration — agents can connect their personal LINE
 * via a token obtained from https://notify-bot.line.me/my/
 */

export interface LineNotifyOptions {
  token: string;
  message: string;
  imageUrl?: string;
  stickerPackageId?: number;
  stickerId?: number;
}

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify';

export async function sendLineNotify(
  opts: LineNotifyOptions
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!opts.token) return { ok: false, error: 'no_token' };

  const body = new URLSearchParams();
  body.append('message', opts.message);
  if (opts.imageUrl) {
    body.append('imageThumbnail', opts.imageUrl);
    body.append('imageFullsize', opts.imageUrl);
  }
  if (opts.stickerPackageId && opts.stickerId) {
    body.append('stickerPackageId', String(opts.stickerPackageId));
    body.append('stickerId', String(opts.stickerId));
  }

  try {
    const res = await fetch(LINE_NOTIFY_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('[LINE Notify] failed', res.status, text.slice(0, 200));
      return { ok: false, status: res.status, error: text.slice(0, 200) };
    }
    return { ok: true, status: 200 };
  } catch (e: any) {
    console.warn('[LINE Notify] error', e?.message);
    return { ok: false, error: e?.message ?? 'unknown' };
  }
}

/** Verify a token works by calling /api/status (lightweight) */
export async function verifyLineToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch('https://notify-api.line.me/api/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
