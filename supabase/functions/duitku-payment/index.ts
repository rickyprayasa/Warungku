import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Hello from duitku-payment edge function!")

import { Md5 } from "https://deno.land/std@0.160.0/hash/md5.ts"

// Utility function to compute MD5 natively with Deno std hash
async function generateHash(text: string) {
    return new Md5().update(text).toString();
}

serve(async (req) => {
    // Handle CORS preflight requests...
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url);
        const path = url.pathname.split('/').pop();
        // Initialize Supabase Client with service role to read settings and bypass RLS
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch Duitku Settings from the database
        const { data: settingsData, error: settingsError } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['duitku_enabled', 'duitku_merchant_code', 'duitku_api_key', 'duitku_sandbox_mode', 'duitku_callback_url', 'duitku_return_url']);

        if (settingsError) throw new Error('Gagal mengambil pengaturan Duitku');

        const settings = (settingsData || []).reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        if (settings.duitku_enabled !== 'true') {
            return new Response(
                JSON.stringify({ error: 'Pembayaran Duitku sedang dinonaktifkan' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const merchantCode = settings.duitku_merchant_code;
        const apiKey = settings.duitku_api_key;
        const isSandbox = settings.duitku_sandbox_mode === 'true';

        const baseUrl = isSandbox ? 'https://sandbox.duitku.com' : 'https://passport.duitku.com';

        // ---------------------------------------------------------
        // ROUTE: POST /create-invoice
        // ---------------------------------------------------------
        if (req.method === 'POST' && path === 'create-invoice') {
            const { plan_id, store_id, payment_method } = await req.json();

            if (!plan_id || !store_id) {
                return new Response(JSON.stringify({ error: 'plan_id & store_id required' }), { status: 400, headers: corsHeaders });
            }

            // Get store details
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('name')
                .eq('id', store_id)
                .single();

            if (storeError || !store) {
                console.error('Store lookup failed:', { store_id, error: storeError });
                throw new Error('Store not found: ' + (storeError?.message || 'Unknown ID'));
            }

            // Get the owner of the store
            const { data: storeOwner, error: ownerError } = await supabase
                .from('store_members')
                .select('user_id')
                .eq('store_id', store_id)
                .eq('role', 'owner')
                .limit(1)
                .single();

            let userEmail = 'admin@omzetin.web.id';

            if (storeOwner && !ownerError) {
                // Get user details for billing
                const { data: user } = await supabase.auth.admin.getUserById(storeOwner.user_id);
                if (user?.user?.email) {
                    userEmail = user.user.email;
                }
            }

            // Define plans directly or fetch from DB (Fetching is better, but hardcoding for simplicity given plan structure)
            const { data: plan, error: planError } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('id', plan_id)
                .single();

            if (planError || !plan) {
                console.error('Plan lookup failed:', { plan_id, error: planError });
                throw new Error('Plan not found: ' + (planError?.message || 'Unknown ID'));
            }

            const orderId = `UPG-${store_id.substring(0, 8)}-${Date.now()}`;
            const amount = plan.price;

            // Generate Signature
            const dataToHash = merchantCode + orderId + amount + apiKey;
            const signature = await generateHash(dataToHash);

            const payload = {
                merchantCode: merchantCode,
                paymentAmount: amount,
                paymentMethod: payment_method || "M2", // Default to Mandiri Virtual Account
                merchantOrderId: orderId,
                productDetails: `Upgrade Plan Omzetin - ${plan.name} (${store.name})`,
                additionalParam: `${store_id}|${plan_id}`,
                merchantUserInfo: userEmail,
                customerVaName: store.name,
                email: userEmail,
                phoneNumber: "",
                itemDetails: [{
                    name: `Plan ${plan.name}`,
                    price: amount,
                    quantity: 1
                }],
                callbackUrl: settings.duitku_callback_url || "https://omzetin.web.id/api/duitku/callback",
                returnUrl: settings.duitku_return_url || "https://omzetin.web.id/dashboard",
                signature: signature,
                expiryPeriod: 1440 // 24 hours
            };

            console.log('Sending request to Duitku:', payload);

            const response = await fetch(`${baseUrl}/webapi/api/merchant/v2/inquiry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('Duitku API Response:', result);

            if (result.statusCode !== "00") {
                return new Response(JSON.stringify({ error: result }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    paymentUrl: result.paymentUrl,
                    reference: result.reference
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

        }

        // ---------------------------------------------------------
        // ROUTE: POST /callback
        // ---------------------------------------------------------
        if (req.method === 'POST' && path === 'callback') {
            const formData = await req.formData();

            const merchantOrderId = formData.get('merchantOrderId') as string;
            const amount = formData.get('amount') as string;
            const resultCode = formData.get('resultCode') as string;
            const incomingSignature = formData.get('signature') as string;
            const reference = formData.get('reference') as string;
            const additionalParam = formData.get('additionalParam') as string; // store_id|plan_id

            // Validate Signature
            const expectedData = merchantCode + amount + merchantOrderId + apiKey;
            const expectedSignature = await generateHash(expectedData);

            if (incomingSignature !== expectedSignature) {
                console.error('Invalid signature.', { expected: expectedSignature, actual: incomingSignature });
                return new Response('Bad Signature', { status: 400 });
            }

            if (resultCode === '00' && additionalParam) {
                // Payment Success
                const [store_id, plan_id] = additionalParam.split('|');

                // Get plan duration
                const { data: plan } = await supabase
                    .from('subscription_plans')
                    .select('duration_days')
                    .eq('id', plan_id)
                    .single();

                const days = plan?.duration_days || 30;

                // Get current store info to calculate new expiry
                const { data: store } = await supabase
                    .from('stores')
                    .select('plan_expires_at')
                    .eq('id', store_id)
                    .single();

                let newExpiry = new Date();

                // If they already have an active plan, add to it. Otherwise start from today.
                if (store?.plan_expires_at) {
                    const currentExpiry = new Date(store.plan_expires_at);
                    if (currentExpiry > newExpiry) {
                        newExpiry = currentExpiry;
                    }
                }

                newExpiry.setDate(newExpiry.getDate() + days);

                // Update store plan & expiry
                const { error: updateError } = await supabase
                    .from('stores')
                    .update({
                        plan: 'pro', // Defaulting everything to 'pro' for now based on current logic, or use plan.name/id map
                        plan_expires_at: newExpiry.toISOString()
                    })
                    .eq('id', store_id);

                if (updateError) {
                    console.error('Failed to update store:', updateError);
                    return new Response('Internal Server Error', { status: 500 });
                }

                console.log(`Successfully upgraded store ${store_id} to PRO until ${newExpiry}`);

                return new Response('OK', { status: 200 });
            } else {
                console.log('Payment failed or pending:', resultCode);
                return new Response('OK', { status: 200 }); // Still return 200 to acknowledge receipt
            }
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal Edge Function Error',
                message: error.message || String(error),
                stack: error.stack
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
