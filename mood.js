export const config = { runtime: 'edge' };

const FALLBACK = { mood: 'neutral', confidence: 0.5, valence: 'neutral', energy: 'medium', emotions: [] };

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
    const { text } = await req.json();
    if (!text || text.trim().length < 20) return new Response(JSON.stringify(FALLBACK), { headers: cors });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: 'Respond ONLY with valid JSON. No explanation, no markdown, no extra text whatsoever.',
        messages: [{
          role: 'user',
          content: `Analyse the emotional tone of this text. Return ONLY this JSON object:
{"mood":"ONE_OF[joyful,content,calm,hopeful,grateful,excited,confused,anxious,tired,sad,frustrated,angry,neutral]","confidence":0.0,"valence":"positive|negative|neutral","energy":"high|medium|low","emotions":["word1","word2"]}

Text: "${text.slice(0, 500)}"`,
        }],
      }),
    });

    if (!res.ok) return new Response(JSON.stringify(FALLBACK), { headers: cors });
    const data = await res.json();
    let parsed = FALLBACK;
    try { parsed = JSON.parse(data.content?.[0]?.text?.trim() || '{}'); } catch {}
    return new Response(JSON.stringify(parsed), { headers: cors });
  } catch {
    return new Response(JSON.stringify(FALLBACK), { headers: cors });
  }
}
