export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { entries } = req.body;
    if (!entries?.length) return res.status(400).json({ error: 'No entries provided' });

    const text = entries
      .map(e => `Date: ${e.date}\nMood: ${e.mood || 'not set'}\nTags: ${(e.tags||[]).join(', ')||'none'}\nTitle: ${e.title||'Untitled'}\n\n${e.body||''}`)
      .join('\n\n---\n\n');

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a thoughtful, empathetic journal companion helping people understand their own patterns through writing.

Be warm but honest. Use second person naturally. Reference specific content from their actual entries.

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

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.error?.message || `AI error ${aiRes.status}` });
    }

    const data = await aiRes.json();
    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!insight) return res.status(500).json({ error: 'No AI response generated' });

    return res.status(200).json({ insight });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
