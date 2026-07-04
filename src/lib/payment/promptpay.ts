/**
 * PromptPay QR generator — EMVCo Merchant Presented Mode
 * Bank of Thailand PromptPay spec compliant.
 *
 * Supports phone numbers (10 digits) and citizen IDs (13 digits).
 * Amount is embedded so user can't modify.
 */

// CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF)
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).padStart(4, '0').toUpperCase();
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function formatTarget(target: string): string {
  const clean = target.replace(/\D/g, '');
  if (clean.length === 13) {
    // Citizen ID
    return clean;
  }
  if (clean.length === 10) {
    // Phone: 0812345678 → 0066812345678
    return '0066' + clean.slice(1);
  }
  throw new Error('PromptPay target must be 10-digit phone or 13-digit citizen ID');
}

/**
 * Generate PromptPay payload string (encode into QR code separately).
 */
export function buildPromptPayPayload(target: string, amountThb: number): string {
  const formatted = formatTarget(target);
  const isPhone = target.replace(/\D/g, '').length === 10;

  // AID = A000000677010111 (Merchant Presented QR - PromptPay)
  const merchantAccount = tlv(
    isPhone ? '01' : '02',
    formatted
  );
  const gui = tlv('00', 'A000000677010111');
  const merchantInfo = tlv('29', gui + merchantAccount);

  const parts = [
    tlv('00', '01'),           // Payload format
    tlv('01', '12'),           // Dynamic QR (12 = one-time-use)
    merchantInfo,
    tlv('53', '764'),          // Currency: THB
    tlv('54', amountThb.toFixed(2)),
    tlv('58', 'TH'),           // Country
  ].join('');

  const withoutCrc = parts + '6304';
  const crc = crc16(withoutCrc);
  return withoutCrc + crc;
}

/**
 * Generate SVG QR code from payload.
 * Uses a minimal QR encoder inline (no external dep).
 * For MVP, we return a Google Chart URL as fallback if inline QR generation
 * is too heavy. Client can render this URL as <img>.
 */
export function buildPromptPayQrImageUrl(target: string, amountThb: number): {
  payload: string;
  imageUrl: string;
} {
  const payload = buildPromptPayPayload(target, amountThb);
  // Use qrserver.com — free, reliable, no API key
  const encoded = encodeURIComponent(payload);
  const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=400x400&margin=10`;
  return { payload, imageUrl };
}
