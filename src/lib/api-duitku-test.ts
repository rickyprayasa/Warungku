// API handler untuk testing koneksi Duitku
// File ini akan digunakan oleh API route untuk menguji kredensial Duitku

import { NextApiRequest, NextApiResponse } from 'next';

interface DuitkuTestRequest {
  merchantCode: string;
  apiKey: string;
  sandboxMode: boolean;
}

interface DuitkuTestResponse {
  success: boolean;
  message: string;
  timestamp?: string;
}

// Handler untuk testing koneksi Duitku
export async function testDuitkuConnection(data: DuitkuTestRequest): Promise<DuitkuTestResponse> {
  const { merchantCode, apiKey, sandboxMode } = data;

  // Validasi input
  if (!merchantCode || !apiKey) {
    return {
      success: false,
      message: 'Merchant Code dan API Key wajib diisi'
    };
  }

  try {
    // URL Duitku berdasarkan mode
    const baseUrl = sandboxMode 
      ? 'https://sandbox.duitku.com' 
      : 'https://passport.duitku.com';
    
    // Endpoint untuk inquiry pembayaran
    const inquiryUrl = `${baseUrl}/webapi/api/merchant/v2/inquiry`;
    
    // Data untuk inquiry (ini hanya untuk testing koneksi, bukan transaksi sebenarnya)
    const testAmount = 1000; // 1000 IDR
    const merchantOrderId = `TEST-${Date.now()}`;
    
    // Generate signature (ini hanya contoh, dalam implementasi sebenarnya harus dihitung dengan benar)
    // Format signature: MD5(merchantCode + merchantOrderId + amount + apiKey)
    const crypto = require('crypto');
    const signatureString = merchantCode + merchantOrderId + testAmount + apiKey;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    // Payload untuk inquiry
    const payload = {
      merchantCode,
      paymentAmount: testAmount,
      paymentMethod: 'VC', // Virtual Account
      merchantOrderId,
      productDetails: 'Test Connection',
      email: 'test@example.com',
      phoneNumber: '081234567890',
      itemDetails: [
        {
          name: 'Test Connection',
          price: testAmount,
          quantity: 1
        }
      ],
      callbackUrl: `${process.env.SUPABASE_URL}/functions/v1/duitku-payment/callback`,
      returnUrl: `${process.env.SUPABASE_URL}/dashboard`,
      signature,
      expiryPeriod: 5 // 5 menit untuk testing
    };

    // Melakukan request ke Duitku
    const response = await fetch(inquiryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.statusCode === '00') {
      return {
        success: true,
        message: 'Koneksi ke Duitku berhasil! API credentials valid.',
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        message: `Gagal terhubung ke Duitku: ${result.statusMessage || 'Unknown error'}`
      };
    }
  } catch (error: any) {
    console.error('Error testing Duitku connection:', error);
    return {
      success: false,
      message: `Terjadi kesalahan saat testing koneksi: ${error.message || 'Unknown error'}`
    };
  }
}