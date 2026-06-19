export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
        const { entry, mood } = req.body;
        if (!entry) return res.status(400).json({ error: 'Entry text is required' });

      const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

      const prompt = `You are a warm, empathetic journaling companion. A user has written the following journal entry${mood ? ` while feeling ${mood}` : ''}:

      "${entry}"

      Please provide a thoughtful, supportive reflection (3-4 sentences) that:
      - Acknowledges their feelings without judgment
      - Highlights something meaningful or insightful from what they wrote
      - Offers a gentle question or thought to deepen their self-understanding
      - Feels personal and human, not generic

      Keep your tone warm and conversational.`;

      const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                              contents: [{ parts: [{ text: prompt }] }],
                              generationConfig: { temperature: 0.8, maxOutputTokens: 300 }
                  })
        }
            );

      if (!response.ok) {
              const err = await response.text();
              console.error('Gemini error:', err);
              return res.status(500).json({ error: 'AI service error', details: err });
      }

      const data = await response.json();
        const reflection = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!reflection) return res.status(500).json({ error: 'Empty response from AI' });

      return res.status(200).json({ reflection });
  } catch (err) {
        console.error('reflect error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
