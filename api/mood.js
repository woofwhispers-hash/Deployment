export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ mood: 'neutral', confidence: 0 });

  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(200).json({ mood: 'neutral', confidence: 0 });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(200).json({ mood: 'neutral', confidence: 0 });

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the emotional tone of this journal text and respond with ONLY valid JSON, nothing else.

Format: {"mood": "MOOD", "confidence": 0.XX}

MOOD must be one of: joyful, content, grateful, excited, calm, peaceful, reflective, confused, anxious, tired, sad, melancholy, frustrated, angry, neutral

confidence is 0.0 to 1.0

Text: "${text.slice(0, 400)}"`
            }]
          }],
          generationConfig: { maxOutputTokens: 60, temperature: 0.1 }
        })
      }
    );

    if (!aiRes.ok) return res.status(200).json({ mood: 'neutral', confidence: 0 });

    const data = await aiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({
      mood: parsed.mood || 'neutral',
      confidence: parsed.confidence || 0
    });
  } catch {
    return res.status(200).json({ mood: 'neutral', confidence: 0 });
  }
}
