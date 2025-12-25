// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
// 1. supabase functions new duitku-payment
// 2. Copy this code to supabase/functions/duitku-payment/index.ts
// 3. Set secrets: supabase secrets set DUITKU_MERCHANT_CODE=... DUITKU_API_KEY=...
// 4. Deploy: supabase functions deploy duitku-payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const url = new URL(req.url)
        const path = url.pathname.split('/').pop() // 'create-invoice' or 'callback'

        // --- 1. CREATE INVOICE ---
        if (path === 'create-invoice') {
            const { plan_id, store_id, payment_method } = await req.json()

            // Get Plan Details
            const { data: plan, error: planError } = await supabaseClient
                .from('subscription_plans')
                .select('*')
                .eq('id', plan_id)
                .single()

            if (planError || !plan) throw new Error('Plan not found')

            // Get Store Details (for customer info)
            const { data: store, error: storeError } = await supabaseClient
                .from('stores')
                .select('*, store_members(user_id)') // Simplified, assuming we can get user email via store_members -> profiles if needed
                .eq('id', store_id)
                .single()

            if (storeError || !store) throw new Error('Store not found')

            // Config
            const merchantCode = Deno.env.get('DUITKU_MERCHANT_CODE') || 'DS12345' // Replace with your Merchant Code
            const apiKey = Deno.env.get('DUITKU_API_KEY') || 'YOUR_API_KEY' // Replace with your API Key
            const merchantOrderId = `INV-${Date.now()}-${store_id.substring(0, 8)}`
            const amount = plan.price
            const callbackUrl = `https://omzetin.web.id/functions/v1/duitku-payment/callback`
            // Validate origin header to prevent open redirect attacks
            const origin = req.headers.get('origin');
            const allowedOrigins = [
              'https://omzetin.web.id', // Production domain
              'https://omzetin-main-rsquare.pages.dev', // Cloudflare Pages deployment domain
              'http://localhost:3000', // For development
              'http://localhost:5173'  // For development
            ];

            // Only use the origin if it's in the allowed list
            let validatedOrigin = 'https://omzetin.web.id'; // Default to production domain
            if (origin && allowedOrigins.includes(origin)) {
              validatedOrigin = origin;
            }

            const returnUrl = `${validatedOrigin}/dashboard?tab=billing&status=success`

            // Generate Signature: MD5(merchantCode + merchantOrderId + amount + apiKey)
            // Note: Duitku V2 might use SHA256, check documentation. Assuming MD5 for legacy/standard V2.
            // Deno crypto MD5 implementation:
            const signatureString = merchantCode + merchantOrderId + amount + apiKey
            const signatureBuffer = await crypto.subtle.digest("MD5", new TextEncoder().encode(signatureString))
            const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

            // Payload for Duitku
            const payload = {
                merchantCode,
                paymentAmount: amount,
                paymentMethod: payment_method || 'VC', // Default to Credit Card or specific code
                merchantOrderId,
                productDetails: plan.name,
                email: 'customer@example.com', // Should fetch from store owner profile
                phoneNumber: '08123456789', // Should fetch from store owner profile
                itemDetails: [
                    {
                        name: plan.name,
                        price: amount,
                        quantity: 1
                    }
                ],
                callbackUrl,
                returnUrl,
                signature,
                expiryPeriod: 60 // 60 minutes
            }

            // Call Duitku API (Sandbox URL)
            // Change to production URL for live: https://passport.duitku.com/webapi/api/merchant/v2/inquiry
            const duitkuUrl = 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'

            const response = await fetch(duitkuUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const result = await response.json()

            if (result.statusCode !== '00') {
                throw new Error(`Duitku Error: ${result.statusMessage}`)
            }

            // Save Transaction to Database
            await supabaseClient.from('subscription_transactions').insert({
                store_id,
                plan_id,
                merchant_order_id: merchantOrderId,
                amount,
                payment_method,
                payment_url: result.paymentUrl,
                status: 'pending'
            })

            return new Response(JSON.stringify({ paymentUrl: result.paymentUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // --- 2. CALLBACK HANDLER ---
        if (path === 'callback') {
            // Duitku sends x-www-form-urlencoded usually
            const formData = await req.formData()
            const merchantCode = formData.get('merchantCode')
            const amount = formData.get('amount')
            const merchantOrderId = formData.get('merchantOrderId')
            const signature = formData.get('signature')
            const resultCode = formData.get('resultCode')
            const reference = formData.get('reference')

            // Verify Signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
            const apiKey = Deno.env.get('DUITKU_API_KEY') || 'YOUR_API_KEY'
            const calcString = merchantCode + amount + merchantOrderId + apiKey
            const calcBuffer = await crypto.subtle.digest("MD5", new TextEncoder().encode(calcString))
            const calcSignature = Array.from(new Uint8Array(calcBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

            if (signature !== calcSignature) {
                return new Response('Invalid Signature', { status: 400 })
            }

            if (resultCode === '00') {
                // Payment Success
                // 1. Update Transaction
                const { data: transaction } = await supabaseClient
                    .from('subscription_transactions')
                    .update({ status: 'success', reference_id: reference?.toString() })
                    .eq('merchant_order_id', merchantOrderId)
                    .select()
                    .single()

                if (transaction) {
                    // 2. Update Store Plan
                    // Get Plan duration
                    const { data: plan } = await supabaseClient
                        .from('subscription_plans')
                        .select('duration_days, name')
                        .eq('id', transaction.plan_id)
                        .single()

                    if (plan) {
                        const endDate = new Date()
                        endDate.setDate(endDate.getDate() + plan.duration_days)

                        await supabaseClient
                            .from('stores')
                            .update({
                                subscription_plan_id: transaction.plan_id,
                                subscription_status: 'active',
                                subscription_end_date: endDate.toISOString(),
                                plan: plan.name.toLowerCase().includes('pro') ? 'pro' : 'trial' // Map to existing plan enum
                            })
                            .eq('id', transaction.store_id)
                    }
                }
            } else {
                // Payment Failed
                await supabaseClient
                    .from('subscription_transactions')
                    .update({ status: 'failed' })
                    .eq('merchant_order_id', merchantOrderId)
            }

            return new Response('OK', { status: 200 })
        }

        throw new Error('Invalid endpoint')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
