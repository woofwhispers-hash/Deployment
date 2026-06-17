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
    const { messages, entryContext, recentEntries } = await req.json();
    if (!messages?.length) return new Response(JSON.stringify({ error: 'No messages' }), { status: 400, headers: cors });

    let contextBlock = '';
    if (entryContext) {
      contextBlock = `\n\nThe user's journal entry being discussed:\nTitle: ${entryContext.title || 'Untitled'}\nDate: ${entryContext.date}\nMood: ${entryContext.mood || 'not set'}\nTags: ${(entryContext.tags || []).join(', ') || 'none'}\n\n${(entryContext.body || '').slice(0, 1000)}\n`;
    } else if (recentEntries?.length) {
      contextBlock = `\n\nThe user's recent journal entries for context:\n` +
        recentEntries.map(e => `[${e.date}] ${e.title || 'Untitled'} (mood: ${e.mood || 'not set'}): ${(e.body || '').slice(0, 200)}`).join('\n');
    }

    const systemPrompt = `You are a compassionate, thoughtful journal companion helping people process their thoughts and emotions.${contextBlock}

Guidelines:
- Listen actively and reflect back what you hear with empathy
- Ask one thoughtful open-ended question at a time — never multiple questions at once
- Help explore feelings without projecting emotions onto the person
- Be warm and conversational, never clinical or preachy
- Keep responses to 80-130 words unless real depth is needed
- Reference the journal entry specifically when relevant

Important: You are not a therapist. If someone expresses serious distress, gently encourage them to speak with a mental health professional.`;

    // Build conversation history for Gemini
    const geminiContents = [];
    // Add system as first user message
    geminiContents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    geminiContents.push({ role: 'model', parts: [{ text: 'Understood. I\'m here as your thoughtful journal companion, ready to listen and explore your thoughts with you.' }] });

    // Add conversation history (last 12 messages)
    const recentMessages = messages.slice(-12);
    for (const m of recentMessages) {
      geminiContents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const res = await fetch(
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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || `AI error ${res.status}` }), { status: 500, headers: cors });
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!reply) throw new Error('No AI response');

    return new Response(JSON.stringify({ reply }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
