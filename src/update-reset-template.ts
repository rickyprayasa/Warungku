// Script to update Supabase Auth email templates via Management API
// Updates the "reset password" (recovery) email with neo-brutalism design

const SUPABASE_PROJECT_REF = 'ysujcewkfhbenxtaguuw';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

if (!SUPABASE_ACCESS_TOKEN) {
    console.error('Missing SUPABASE_ACCESS_TOKEN env variable');
    process.exit(1);
}

const resetPasswordTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Kata Sandi - Omzetin</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: 'Courier New', Courier, monospace;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F5F5; padding: 30px 10px;">
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
                                        <img src="https://ysujcewkfhbenxtaguuw.supabase.co/storage/v1/object/public/public-assets/omzetin-logo.png?v=2" alt="Omzetin" width="64" height="64" style="display: block; margin: 0 auto 12px auto; width: 64px; height: 64px;" />
                                        <h1 style="color: #FFFFFF; margin: 0; font-size: 34px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; font-family: Impact, 'Arial Black', 'Segoe UI Black', sans-serif; text-shadow: -1px -1px 0 #1A1A1A, 1px -1px 0 #1A1A1A, -1px 1px 0 #1A1A1A, 1px 1px 0 #1A1A1A, 3px 3px 0 #1A1A1A;">OMZETIN</h1>
                                        <p style="color: #1A1A1A; margin: 6px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.6; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Platform Manajemen Toko</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 32px 36px 32px;">
                            <h2 style="color: #1A1A1A; margin: 0 0 20px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-family: 'Courier New', Courier, monospace;">
                                Permintaan Reset Kata Sandi
                            </h2>

                            <p style="color: #333333; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0; font-family: 'Courier New', Courier, monospace;">
                                Halo,<br><br>Kami menerima permintaan untuk mereset kata sandi akun Omzetin Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background-color: #1A1A1A; border: 4px solid #1A1A1A; box-shadow: 5px 5px 0px #1A1A1A;">
                                                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; color: #FFFFFF; font-size: 15px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">RESET PASSWORD</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background-color: #F8F9FA; border: 3px solid #1A1A1A; padding: 16px 20px; box-shadow: 3px 3px 0px #1A1A1A;">
                                        <p style="color: #1A1A1A; font-size: 12px; line-height: 1.6; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                            Jika Anda <strong>tidak meminta</strong> reset kata sandi, jadikan email ini peringatan. Abaikan email ini dan akun Anda akan tetap aman.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1A1A1A; padding: 22px 32px; border-top: 4px solid #1A1A1A;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <p style="color: rgb(243, 128, 32); font-size: 18px; font-weight: 900; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 2px; font-family: Impact, 'Arial Black', 'Segoe UI Black', sans-serif;">OMZETIN</p>
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
                
                <!-- Disclaimer -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin-top: 14px;">
                    <tr>
                        <td align="center">
                            <p style="color: #BBBBBB; font-size: 10px; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                Email ini dikirim otomatis oleh sistem Omzetin.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

async function updateEmailTemplate() {
    console.log('Updating Supabase Auth email template for password reset (recovery)...');

    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            mailer_templates_recovery_content: resetPasswordTemplate,
            mailer_subjects_recovery: 'Reset Kata Sandi Anda - Omzetin',
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Failed to update template:', response.status, errText);
    } else {
        // const data = await response.json();
        console.log('✅ Recovery template updated successfully!');
    }
}

updateEmailTemplate();
