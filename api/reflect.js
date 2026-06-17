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
    const { entries } = await req.json();
    if (!entries?.length) return new Response(JSON.stringify({ error: 'No entries provided' }), { status: 400, headers: cors });

    const text = entries
      .map(e => `Date: ${e.date}\nMood: ${e.mood || 'not set'}\nTags: ${(e.tags || []).join(', ') || 'none'}\nTitle: ${e.title || 'Untitled'}\n\n${e.body || ''}`)
      .join('\n\n---\n\n');

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a thoughtful, empathetic journal companion helping people understand their own patterns and growth through writing.

Be warm but honest. Use second person naturally. Reference specific content from their actual entries — no generic platitudes.

Write in flowing paragraphs (no bullet points, no headers):
1. One sentence naming the overall emotional theme you noticed
2. Two or three specific patterns with evidence from their actual writing
3. Any emotional shift or growth you can see across entries
4. One open, curious question to prompt deeper reflection

Keep to 220-280 words total.

Journal entries to reflect on:

${text}

Please reflect on these journal entries.`
            }]
          }],
          generationConfig: { maxOutputTokens: 700, temperature: 0.72 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || `AI error ${res.status}` }), { status: 500, headers: cors });
    }

    const data = await res.json();
    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!insight) throw new Error('No AI response');

    return new Response(JSON.stringify({ insight }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
