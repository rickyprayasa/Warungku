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

        // Neo-brutalism styled HTML email template — clean & professional
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Undangan Bergabung di Omzetin</title>
</head>
<body style="font-family: 'Courier New', Courier, monospace; background-color: #F5F5F0; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F5F0; padding: 30px 15px;">
        <tr>
            <td align="center">
                <!-- Main Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 4px solid #1A1A1A; box-shadow: 8px 8px 0px #1A1A1A;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color: rgb(243, 128, 32); padding: 24px 32px; text-align: center; border-bottom: 4px solid #1A1A1A;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <!-- Logo -->
                                        <img src="https://omzetin.web.id/omzetin.png" alt="Omzetin" width="64" height="64" style="display: block; margin: 0 auto 12px auto; width: 64px; height: 64px;" />
                                        <!-- Brand Name -->
                                        <h1 style="color: #1A1A1A; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; font-family: 'Cal Sans', Inter, system-ui, -apple-system, sans-serif; text-shadow: 2px 2px 0px rgba(0,0,0,0.15); -webkit-text-stroke: 1px #000000;">OMZETIN</h1>
                                        <p style="color: #1A1A1A; margin: 6px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.6; font-family: 'Cal Sans', Inter, system-ui, sans-serif;">Platform Manajemen Toko</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 32px 28px 32px;">
                            <!-- Badge -->
                            <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                                <tr>
                                    <td style="background-color: #FFF3E0; border: 3px solid #1A1A1A; padding: 5px 14px; box-shadow: 3px 3px 0px #1A1A1A;">
                                        <span style="font-size: 11px; font-weight: 900; color: #1A1A1A; text-transform: uppercase; letter-spacing: 1px;">UNDANGAN KOLABORASI</span>
                                    </td>
                                </tr>
                            </table>

                            <h2 style="color: #1A1A1A; margin: 0 0 16px 0; font-size: 22px; font-weight: 900; line-height: 1.3; text-transform: uppercase; font-family: 'Courier New', Courier, monospace;">
                                Anda Diundang Bergabung di Omzetin
                            </h2>

                            <p style="color: #444444; font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; font-family: 'Courier New', Courier, monospace;">
                                Halo, Anda telah diundang untuk bergabung di platform <strong style="color: #1A1A1A;">Omzetin</strong> dengan peran sebagai <strong style="color: #FF5500;">${roleDisplay}</strong>.
                            </p>

                            <p style="color: #444444; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0; font-family: 'Courier New', Courier, monospace;">
                                Omzetin membantu Anda mengelola produk, penjualan, keuangan, dan laporan bisnis — semua dalam satu dashboard.
                            </p>

                            ${password ? `
                            <!-- Credentials Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                                <tr>
                                    <td style="background-color: #FAFAFA; border: 3px solid #1A1A1A; padding: 0; box-shadow: 5px 5px 0px #1A1A1A;">
                                        <!-- Credentials Header -->
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background-color: #1A1A1A; padding: 10px 18px;">
                                                    <span style="color: #FF5500; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">DATA LOGIN ANDA</span>
                                                </td>
                                            </tr>
                                        </table>
                                        <!-- Credentials Body -->
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 18px 20px;">
                                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                        <tr>
                                                            <td style="padding: 0 0 12px 0;">
                                                                <span style="font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; font-family: 'Courier New', Courier, monospace;">Email</span><br/>
                                                                <span style="font-size: 15px; color: #1A1A1A; font-weight: 700; font-family: 'Courier New', Courier, monospace;">${email}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 0 0 0; border-top: 2px dashed #E0E0E0;">
                                                                <span style="font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; font-family: 'Courier New', Courier, monospace;">Password Sementara</span><br/>
                                                                <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 6px;">
                                                                    <tr>
                                                                        <td style="background-color: #1A1A1A; padding: 8px 16px;">
                                                                            <span style="font-size: 20px; color: #FF5500; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px;">${displayPassword}</span>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Notice -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 26px;">
                                <tr>
                                    <td style="background-color: #FEF2F2; border: 3px solid #DC2626; padding: 12px 16px; box-shadow: 3px 3px 0px #DC2626;">
                                        <p style="margin: 0; font-size: 12px; color: #991B1B; font-weight: 700; line-height: 1.5; font-family: 'Courier New', Courier, monospace;">
                                            PENTING: Demi keamanan, password di atas bersifat sementara. Anda akan diminta mengganti password saat pertama kali login.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}

                            <!-- CTA Button -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background-color: rgb(243, 128, 32); border: 4px solid #1A1A1A; box-shadow: 5px 5px 0px #1A1A1A;">
                                                    <a href="${appUrl}" style="display: inline-block; padding: 16px 40px; color: #1A1A1A; font-size: 15px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">MASUK SEKARANG</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                                <tr>
                                    <td style="border-top: 3px solid #E5E7EB;">&nbsp;</td>
                                </tr>
                            </table>

                            <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                Butuh bantuan? Balas email ini atau hubungi tim kami kapanpun.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1A1A1A; padding: 22px 32px; border-top: 4px solid #1A1A1A;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <p style="color: rgb(243, 128, 32); font-size: 16px; font-weight: 800; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 2px; font-family: 'Cal Sans', Inter, system-ui, -apple-system, sans-serif;">OMZETIN</p>
                                        <p style="color: #777777; font-size: 11px; margin: 0; line-height: 1.6; font-family: 'Courier New', Courier, monospace;">
                                            &copy; 2025 Omzetin by RSQUAREidea. All rights reserved.<br>
                                            Platform Manajemen Toko Modern
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Bottom note -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin-top: 14px;">
                    <tr>
                        <td align="center">
                            <p style="color: #BBBBBB; font-size: 10px; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                Email ini dikirim otomatis oleh Omzetin. Jika Anda tidak merasa mendaftar, abaikan email ini.
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
                subject: "Anda Diundang Bergabung di Omzetin",
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
