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
    const { text } = await req.json();
    if (!text?.trim()) return new Response(JSON.stringify({ mood: 'neutral', confidence: 0 }), { headers: cors });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the emotional tone of this journal entry excerpt and respond with ONLY a JSON object.

Respond with exactly this format, nothing else:
{"mood": "MOOD_WORD", "confidence": 0.XX}

Where MOOD_WORD is one of: joyful, content, grateful, excited, calm, peaceful, reflective, confused, anxious, tired, sad, melancholy, frustrated, angry, neutral

Where confidence is between 0.0 and 1.0.

Journal text: "${text.slice(0, 400)}"`
            }]
          }],
          generationConfig: { maxOutputTokens: 50, temperature: 0.1 }
        })
      }
    );

    if (!res.ok) return new Response(JSON.stringify({ mood: 'neutral', confidence: 0 }), { headers: cors });

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify({
      mood: parsed.mood || 'neutral',
      confidence: parsed.confidence || 0
    }), { headers: cors });
  } catch (err) {
    // Silently fail — mood detection is non-critical
    return new Response(JSON.stringify({ mood: 'neutral', confidence: 0 }), { headers: cors });
  }
}
