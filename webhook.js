export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = { 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature using Web Crypto (edge-compatible)
    if (secret && signature) {
      const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (expected !== signature)
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: cors });
    }

    const event = JSON.parse(body);
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (['subscription.activated', 'payment.captured'].includes(event.event)) {
      const entity = event.payload?.payment?.entity || event.payload?.subscription?.entity;
      const userId = entity?.notes?.user_id;
      if (userId) {
        const exp = new Date();
        exp.setMonth(exp.getMonth() + (entity?.notes?.plan === 'yearly' ? 12 : 1));
        await sb.from('profiles').upsert({
          id: userId, is_pro: true, pro_expires_at: exp.toISOString(),
          subscription_id: entity?.id, plan: entity?.notes?.plan || 'monthly',
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (['subscription.cancelled', 'subscription.expired'].includes(event.event)) {
      const userId = event.payload?.subscription?.entity?.notes?.user_id;
      if (userId) {
        await sb.from('profiles').update({
          is_pro: false, pro_expires_at: null, updated_at: new Date().toISOString(),
        }).eq('id', userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
