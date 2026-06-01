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
    const { messages, entryContext } = await req.json();
    if (!messages?.length) return new Response(JSON.stringify({ error: 'No messages' }), { status: 400, headers: cors });

    const ctxBlock = entryContext
      ? `\n\nThe user's journal entry being discussed:\nTitle: ${entryContext.title || 'Untitled'}\nDate: ${entryContext.date}\nMood: ${entryContext.mood || 'not set'}\nTags: ${(entryContext.tags || []).join(', ') || 'none'}\n\n${(entryContext.body || '').slice(0, 1000)}\n`
      : '';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `You are a compassionate, thoughtful journal companion helping people process their thoughts and emotions.${ctxBlock}

Guidelines:
- Listen actively and reflect back what you hear with empathy
- Ask one thoughtful open-ended question at a time — never multiple questions at once
- Help explore feelings without projecting emotions onto the person
- Be warm and conversational, never clinical or preachy
- Keep responses to 80-130 words unless real depth is needed
- Reference the journal entry specifically when relevant

Important: You are not a therapist. If someone expresses serious distress or crisis, gently encourage them to speak with a mental health professional or contact a crisis line.`,
        messages: messages.slice(-14),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || `AI error ${res.status}` }), { status: 500, headers: cors });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ reply: data.content?.[0]?.text || '' }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
