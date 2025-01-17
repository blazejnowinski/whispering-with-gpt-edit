
import { json } from '@sveltejs/kit';
import { OpenAI } from 'openai';
import type { RequestEvent } from './$types';

export async function POST(event: RequestEvent) {
  try {
    const { text, prompt, apiKey } = await event.request.json();
    
    if (!apiKey) {
      return json({ error: 'API key is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return json({ content: response.choices[0].message.content });
  } catch (error) {
    console.error('GPT API Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
