export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  try {
    const { razorpay_payment_id, user_id, plan } = await req.json();
    if (!razorpay_payment_id || !user_id)
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });

    // 1. Verify with Razorpay API — confirms payment is real and captured
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: 'Basic ' + btoa(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`) },
    });
    if (!rzpRes.ok) return new Response(JSON.stringify({ error: 'Could not verify with Razorpay' }), { status: 400, headers: cors });

    const payment = await rzpRes.json();
    if (payment.status !== 'captured')
      return new Response(JSON.stringify({ error: `Payment status: ${payment.status} — expected captured` }), { status: 400, headers: cors });

    // 2. Update Supabase with service role key (bypasses RLS — only safe server-side)
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (plan === 'yearly' ? 12 : 1));

    const { error: dbErr } = await sb.from('profiles').upsert({
      id: user_id,
      is_pro: true,
      pro_expires_at: expiresAt.toISOString(),
      payment_id: razorpay_payment_id,
      plan: plan || 'monthly',
      updated_at: new Date().toISOString(),
    });

    if (dbErr) return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: cors });

    return new Response(JSON.stringify({ success: true, expires_at: expiresAt.toISOString() }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
