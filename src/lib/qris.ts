/**
 * QRIS (Quick Response Code Indonesian Standard) Parser & Generator
 * Converts static QRIS to dynamic QRIS with embedded amount
 * 
 * EMV QR Code Format: [Tag ID (2)][Length (2)][Value (variable)]
 * 
 * Key Tags:
 * - 00: Payload Format Indicator
 * - 01: Point of Initiation Method (11=static, 12=dynamic)
 * - 26-51: Merchant Account Information
 * - 52: Merchant Category Code
 * - 53: Transaction Currency (360 = IDR)
 * - 54: Transaction Amount
 * - 55: Tip or Convenience Indicator
 * - 56: Value of Convenience Fee Fixed
 * - 57: Value of Convenience Fee Percentage
 * - 58: Country Code
 * - 59: Merchant Name
 * - 60: Merchant City
 * - 61: Postal Code
 * - 62: Additional Data Field Template
 * - 63: CRC (CRC-16/CCITT-FALSE)
 */

export interface QRISData {
  raw: string;
  payloadFormatIndicator: string;
  pointOfInitiation: 'static' | 'dynamic';
  merchantAccountInfo: string;
  merchantCategoryCode: string;
  transactionCurrency: string;
  transactionAmount?: string;
  tipIndicator?: string;
  convenienceFeeFixed?: string;
  convenienceFeePercent?: string;
  countryCode: string;
  merchantName: string;
  merchantCity: string;
  postalCode?: string;
  additionalData?: string;
  crc: string;
}

export interface ParsedTag {
  id: string;
  length: number;
  value: string;
}

// CRC-16/CCITT-FALSE lookup table
const CRC_TABLE = [
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
  0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
  0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
  0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
  0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
  0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
  0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
  0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
  0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
  0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
  0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
  0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
  0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
  0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
  0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
  0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
  0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
  0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
  0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
  0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
  0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
  0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
  0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
  0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
  0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
  0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
  0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
  0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
  0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
];

/**
 * Calculate CRC-16/CCITT-FALSE checksum
 */
export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    const tableIndex = ((crc >> 8) ^ byte) & 0xff;
    crc = (CRC_TABLE[tableIndex] ^ (crc << 8)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parse QRIS string into individual tags
 */
export function parseQRIS(qrisString: string): Map<string, ParsedTag> {
  const tags = new Map<string, ParsedTag>();
  let position = 0;

  while (position < qrisString.length - 4) { // -4 to exclude CRC
    const id = qrisString.substring(position, position + 2);
    const length = parseInt(qrisString.substring(position + 2, position + 4), 10);
    
    if (isNaN(length) || length < 0) break;
    
    const value = qrisString.substring(position + 4, position + 4 + length);
    
    tags.set(id, { id, length, value });
    position += 4 + length;
  }

  // Parse CRC separately
  if (position + 4 <= qrisString.length) {
    const crcId = qrisString.substring(position, position + 2);
    const crcLength = parseInt(qrisString.substring(position + 2, position + 4), 10);
    const crcValue = qrisString.substring(position + 4, position + 4 + crcLength);
    tags.set(crcId, { id: crcId, length: crcLength, value: crcValue });
  }

  return tags;
}

/**
 * Build tag string from id and value
 */
function buildTag(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Extract merchant name from QRIS
 */
export function getMerchantName(qrisString: string): string {
  const tags = parseQRIS(qrisString);
  return tags.get('59')?.value || 'Merchant';
}

/**
 * Validate QRIS string format and CRC
 */
export function validateQRIS(qrisString: string): { valid: boolean; error?: string } {
  if (!qrisString || qrisString.length < 20) {
    return { valid: false, error: 'String QRIS terlalu pendek' };
  }

  // Check if starts with payload format indicator
  if (!qrisString.startsWith('0002')) {
    return { valid: false, error: 'Format QRIS tidak valid (harus dimulai dengan 0002)' };
  }

  // Parse and validate CRC
  const tags = parseQRIS(qrisString);
  const crcTag = tags.get('63');
  
  if (!crcTag) {
    return { valid: false, error: 'CRC tidak ditemukan' };
  }

  // Calculate expected CRC (exclude current CRC value, include "6304")
  const dataWithoutCRC = qrisString.substring(0, qrisString.length - 4);
  const expectedCRC = calculateCRC16(dataWithoutCRC);

  if (crcTag.value !== expectedCRC) {
    return { valid: false, error: `CRC tidak valid. Expected: ${expectedCRC}, Got: ${crcTag.value}` };
  }

  return { valid: true };
}

/**
 * Check if QRIS is static or dynamic
 */
export function isStaticQRIS(qrisString: string): boolean {
  const tags = parseQRIS(qrisString);
  const poi = tags.get('01');
  return poi?.value === '11';
}

/**
 * Convert static QRIS to dynamic QRIS with amount
 */
export function convertToDynamicQRIS(
  staticQRIS: string,
  amount: number,
  options?: {
    tipIndicator?: '01' | '02' | '03'; // 01=prompt, 02=fixed, 03=percentage
    tipFixed?: number;
    tipPercent?: number;
  }
): string {
  const tags = parseQRIS(staticQRIS);
  
  // Build new QRIS string in correct order
  let result = '';

  // Tag 00: Payload Format Indicator (always "01")
  result += buildTag('00', '01');

  // Tag 01: Point of Initiation Method - change to dynamic (12)
  result += buildTag('01', '12');

  // Tags 02-25: Reserved (skip for QRIS)
  
  // Tags 26-51: Merchant Account Information (preserve from original)
  for (let i = 26; i <= 51; i++) {
    const tagId = i.toString().padStart(2, '0');
    const tag = tags.get(tagId);
    if (tag) {
      result += buildTag(tagId, tag.value);
    }
  }

  // Tag 52: Merchant Category Code
  const mcc = tags.get('52');
  if (mcc) {
    result += buildTag('52', mcc.value);
  }

  // Tag 53: Transaction Currency (360 = IDR)
  const currency = tags.get('53');
  result += buildTag('53', currency?.value || '360');

  // Tag 54: Transaction Amount (inject the amount)
  const amountStr = amount.toString();
  result += buildTag('54', amountStr);

  // Tag 55-57: Tip/Fee (optional)
  if (options?.tipIndicator) {
    result += buildTag('55', options.tipIndicator);
    
    if (options.tipIndicator === '02' && options.tipFixed) {
      result += buildTag('56', options.tipFixed.toString());
    } else if (options.tipIndicator === '03' && options.tipPercent) {
      result += buildTag('57', options.tipPercent.toString());
    }
  }

  // Tag 58: Country Code
  const country = tags.get('58');
  result += buildTag('58', country?.value || 'ID');

  // Tag 59: Merchant Name
  const merchantName = tags.get('59');
  if (merchantName) {
    result += buildTag('59', merchantName.value);
  }

  // Tag 60: Merchant City
  const merchantCity = tags.get('60');
  if (merchantCity) {
    result += buildTag('60', merchantCity.value);
  }

  // Tag 61: Postal Code (optional)
  const postalCode = tags.get('61');
  if (postalCode) {
    result += buildTag('61', postalCode.value);
  }

  // Tag 62: Additional Data Field Template (optional)
  const additionalData = tags.get('62');
  if (additionalData) {
    result += buildTag('62', additionalData.value);
  }

  // Tag 63: CRC - add placeholder then calculate
  result += '6304';
  const crc = calculateCRC16(result);
  result += crc;

  return result;
}

/**
 * Parse QRIS and extract readable information
 */
export function parseQRISInfo(qrisString: string): QRISData | null {
  try {
    const tags = parseQRIS(qrisString);
    
    const poi = tags.get('01');
    let merchantAccountInfo = '';
    
    // Find merchant account info (tags 26-51)
    for (let i = 26; i <= 51; i++) {
      const tagId = i.toString().padStart(2, '0');
      const tag = tags.get(tagId);
      if (tag) {
        merchantAccountInfo = tag.value;
        break;
      }
    }

    return {
      raw: qrisString,
      payloadFormatIndicator: tags.get('00')?.value || '01',
      pointOfInitiation: poi?.value === '12' ? 'dynamic' : 'static',
      merchantAccountInfo,
      merchantCategoryCode: tags.get('52')?.value || '',
      transactionCurrency: tags.get('53')?.value || '360',
      transactionAmount: tags.get('54')?.value,
      tipIndicator: tags.get('55')?.value,
      convenienceFeeFixed: tags.get('56')?.value,
      convenienceFeePercent: tags.get('57')?.value,
      countryCode: tags.get('58')?.value || 'ID',
      merchantName: tags.get('59')?.value || 'Unknown',
      merchantCity: tags.get('60')?.value || '',
      postalCode: tags.get('61')?.value,
      additionalData: tags.get('62')?.value,
      crc: tags.get('63')?.value || '',
    };
  } catch {
    return null;
  }
}

/**
 * Format amount for display
 */
export function formatQRISAmount(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
