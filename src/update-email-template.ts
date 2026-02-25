// Script to update Supabase Auth email templates via Management API
// Updates the "password changed" notification email with neo-brutalism design

const SUPABASE_PROJECT_REF = 'ysujcewkfhbenxtaguuw';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

if (!SUPABASE_ACCESS_TOKEN) {
    console.error('Missing SUPABASE_ACCESS_TOKEN env variable');
    process.exit(1);
}

const passwordChangedTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Berhasil Diubah - Omzetin</title>
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
                        <td style="padding: 36px 32px 28px 32px;">
                            <!-- Badge -->
                            <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                                <tr>
                                    <td style="background-color: #E8F5E9; border: 3px solid #1A1A1A; padding: 5px 14px; box-shadow: 3px 3px 0px #1A1A1A;">
                                        <span style="font-size: 11px; font-weight: 900; color: #2E7D32; text-transform: uppercase; letter-spacing: 1px;">NOTIFIKASI KEAMANAN</span>
                                    </td>
                                </tr>
                            </table>

                            <h2 style="color: #1A1A1A; margin: 0 0 16px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-family: 'Courier New', Courier, monospace;">
                                Password Berhasil Diubah
                            </h2>

                            <p style="color: #333333; font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; font-family: 'Courier New', Courier, monospace;">
                                Halo, ini adalah konfirmasi bahwa password akun <strong>Omzetin</strong> Anda telah berhasil diubah.
                            </p>

                            <!-- Info Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                                <tr>
                                    <td style="background-color: #F5F5F5; border: 3px solid #1A1A1A; padding: 18px 20px; box-shadow: 3px 3px 0px #1A1A1A;">
                                        <p style="color: #1A1A1A; font-size: 13px; line-height: 1.6; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                            Jika Anda yang melakukan perubahan ini, tidak ada tindakan lebih lanjut yang diperlukan.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Warning Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                                <tr>
                                    <td style="background-color: #FFF3E0; border: 3px solid #E65100; padding: 16px 20px; box-shadow: 3px 3px 0px #E65100;">
                                        <p style="color: #E65100; font-size: 12px; font-weight: 700; line-height: 1.6; margin: 0; font-family: 'Courier New', Courier, monospace;">
                                            Jika Anda TIDAK merasa mengubah password, segera hubungi tim support kami untuk mengamankan akun Anda.
                                        </p>
                                    </td>
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
                                Email ini dikirim otomatis oleh Omzetin. Jika Anda tidak merasa mengubah password, segera hubungi tim support.
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
    console.log('Updating Supabase Auth email template for password change...');

    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            mailer_templates_change_email_content: passwordChangedTemplate,
            mailer_subjects_change_email: 'Password Anda Telah Diubah - Omzetin',
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Failed to update template:', response.status, errText);

        // Try alternative keys
        console.log('\nTrying alternative API keys...');
        const response2 = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password_change_email_template: passwordChangedTemplate,
            }),
        });

        if (!response2.ok) {
            const errText2 = await response2.text();
            console.error('Alternative also failed:', response2.status, errText2);
        } else {
            const data2 = await response2.json();
            console.log('✅ Updated via alternative key!', data2);
        }
    } else {
        const data = await response.json();
        console.log('✅ Template updated successfully!');
    }

    // Also try to get available config keys
    console.log('\nFetching current auth config to find correct keys...');
    const getResponse = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
    });

    if (getResponse.ok) {
        const config = await getResponse.json();
        // Find keys related to email templates
        const emailKeys = Object.keys(config).filter(k =>
            k.toLowerCase().includes('mail') || k.toLowerCase().includes('email') || k.toLowerCase().includes('template') || k.toLowerCase().includes('subject')
        );
        console.log('Email-related config keys:', emailKeys);
        console.log('\nCurrent values:');
        emailKeys.forEach(k => {
            const val = config[k];
            if (typeof val === 'string' && val.length > 100) {
                console.log(`  ${k}: [HTML template, ${val.length} chars]`);
            } else {
                console.log(`  ${k}:`, val);
            }
        });
    }
}

updateEmailTemplate();
