export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, entryContext, recentEntries } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' });

    let contextBlock = '';
    if (entryContext) {
      contextBlock = `\n\nJournal entry being discussed:\nTitle: ${entryContext.title||'Untitled'}\nDate: ${entryContext.date}\nMood: ${entryContext.mood||'not set'}\nTags: ${(entryContext.tags||[]).join(', ')||'none'}\n\n${(entryContext.body||'').slice(0,1000)}\n`;
    } else if (recentEntries?.length) {
      contextBlock = `\n\nUser's recent journal entries:\n` +
        recentEntries.map(e => `[${e.date}] ${e.title||'Untitled'} (mood: ${e.mood||'not set'}): ${(e.body||'').slice(0,200)}`).join('\n');
    }

    const systemPrompt = `You are a compassionate, thoughtful journal companion helping people process their thoughts and emotions.${contextBlock}

Guidelines:
- Listen actively and reflect back what you hear with empathy
- Ask one thoughtful open-ended question at a time
- Help explore feelings without projecting emotions
- Be warm and conversational, never clinical or preachy
- Keep responses to 80-130 words unless real depth is needed
- Reference the journal entry specifically when relevant
- You are not a therapist — if someone expresses serious distress, gently encourage professional support`;

    const geminiContents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I\'m here as your thoughtful journal companion, ready to listen and explore your thoughts with you.' }] }
    ];

    const recentMsgs = messages.slice(-12);
    for (const m of recentMsgs) {
      geminiContents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 300, temperature: 0.8 }
        })
      }
    );

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.error?.message || `AI error ${aiRes.status}` });
    }

    const data = await aiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!reply) return res.status(500).json({ error: 'No AI response generated' });

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
