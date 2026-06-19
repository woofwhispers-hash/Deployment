export default async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
          const { messages, systemPrompt } = req.body;
          if (!messages || !Array.isArray(messages)) {
                    return res.status(400).json({ error: 'messages array is required' });
          }

        const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

        const system = systemPrompt || `You are a compassionate journaling companion called "Think Out Loud".
        Your role is to:
        - Help users explore their thoughts and feelings through gentle questions
        - Offer empathetic reflections without judgment
        - Encourage deeper self-understanding
        - Keep responses concise (2-3 sentences) unless the user asks for more
        - Never give clinical advice or diagnoses
        - Be warm, genuine, and supportive`;

        const contents = [];
          contents.push({ role: 'user', parts: [{ text: `[System context]: ${system}` }] });
          contents.push({ role: 'model', parts: [{ text: `Understood. I'm here as your journaling companion.` }] });

        for (const msg of messages) {
                  const role = msg.role === 'assistant' ? 'model' : 'user';
                  contents.push({ role, parts: [{ text: msg.content }] });
        }

        const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                                      contents,
                                      generationConfig: { temperature: 0.8, maxOutputTokens: 400 }
                        })
            }
                );

        if (!response.ok) {
                  const err = await response.text();
                  console.error('Gemini chat error:', err);
                  return res.status(500).json({ error: 'AI service error', details: err });
        }

        const data = await response.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!reply) return res.status(500).json({ error: 'Empty response from AI' });

        return res.status(200).json({ reply });
  } catch (err) {
          console.error('chat error:', err);
          return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
