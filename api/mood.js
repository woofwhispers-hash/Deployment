export default async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
          const { text } = req.body;
          if (!text) return res.status(400).json({ error: 'Text is required' });

        const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

        const prompt = `Analyze the emotional tone of this journal entry and respond with ONLY a JSON object — no explanation, no markdown, no code blocks.

        Journal entry:
        "${text.slice(0, 500)}"

        Return exactly this JSON structure:
        {
          "mood": "one of: happy, sad, anxious, excited, calm, frustrated, grateful, reflective, neutral",
            "confidence": 0.0 to 1.0,
              "emoji": "a single emoji matching the mood"
              }`;

        const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                                      contents: [{ parts: [{ text: prompt }] }],
                                      generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
                        })
            }
                );

        if (!response.ok) {
                  const err = await response.text();
                  console.error('Gemini mood error:', err);
                  return res.status(500).json({ error: 'AI service error' });
        }

        const data = await response.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = raw.replace(/```json|```/g, '').trim();
          try {
                    const parsed = JSON.parse(cleaned);
                    return res.status(200).json(parsed);
          } catch {
                    return res.status(200).json({ mood: 'neutral', confidence: 0.5, emoji: '📝' });
          }
  } catch (err) {
          console.error('mood error:', err);
          return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
