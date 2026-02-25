import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Hello from send-invite-email!")

interface InviteRequest {
    email: string;
    password?: string;
    role?: string;
    loginUrl?: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, role, loginUrl } = await req.json() as InviteRequest;

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email parameter is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const zeptoApiKey = Deno.env.get('ZEPTOMAIL_API_KEY');

        if (!zeptoApiKey) {
            console.warn('ZEPTOMAIL_API_KEY is not set. Simulating email send for testing.');
            return new Response(
                JSON.stringify({ success: true, simulated: true, message: 'Simulated email send as ZEPTOMAIL_API_KEY is missing.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const roleDisplay = role === 'admin' ? 'Admin' : role === 'owner' ? 'Owner' : 'Kasir/Staff';
        const appUrl = loginUrl || 'https://omzetin.web.id/login';
        const displayPassword = password || 'Password telah diatur sebelumnya';

        // Same HTML from the template with injected variables
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Undangan Bergabung ke Omzetin</title>
</head>
<body style="font-family: 'Courier New', Courier, monospace; background-color: #f4f4f5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 4px solid #000000; box-shadow: 8px 8px 0px #000000;">
                    <tr>
                        <td style="background-color: #FF5500; padding: 30px; text-align: center; border-bottom: 4px solid #000000;">
                            <h1 style="color: #000000; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">
                                OMZETIN</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px; font-size: 24px; font-weight: 700;">
                                Selamat Datang di Omzetin</h2>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Halo,</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Akun Anda telah berhasil didaftarkan di platform <strong>Omzetin</strong>. Mulai kelola bisnis dan toko Anda dengan lebih mudah dan efisien sekarang juga.
                            </p>
                            ${password ? `
                            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px; margin-bottom: 25px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Informasi Login Anda:</p>
                                <p style="margin: 0 0 5px 0;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 0;"><strong>Password Sementara:</strong> <span style="font-family: monospace; font-size: 18px; font-weight: bold; padding: 2px 6px; background: #e2e8f0;">${displayPassword}</span></p>
                            </div>
                            <p style="color: #ef4444; font-size: 14px; font-weight: bold; margin-bottom: 30px;">
                                Demi keamanan, Anda akan diminta untuk mengganti password sementara ini saat pertama kali login.
                            </p>` : ''}
                            <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center" style="background-color: #000000; border: 2px solid #000000;">
                                        <a href="${appUrl}" style="display: inline-block; padding: 14px 30px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; text-transform: uppercase;">Login Sekarang</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f4f4f5; padding: 20px; text-align: center; border-top: 4px solid #000000;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                &copy; 2024 Omzetin. All rights reserved.<br>
                                Platform Manajemen Toko Modern
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        const response = await fetch("https://api.zeptomail.com/v1.1/email", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": zeptoApiKey.startsWith("Zoho-enczapikey") ? zeptoApiKey : "Zoho-enczapikey " + zeptoApiKey
            },
            body: JSON.stringify({
                from: { address: "info@rsquareidea.my.id", name: "Omzetin" },
                to: [{ email_address: { address: email } }],
                subject: "Undangan Bergabung ke Omzetin",
                htmlbody: htmlBody,
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('ZeptoMail API Error:', response.status, errText);
            throw new Error(`Gagal mengirim email: ${response.status}`);
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Email berhasil dikirim' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
