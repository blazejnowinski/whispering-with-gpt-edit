
import type { HttpService } from '../http/HttpService';
import { z } from 'zod';
import { settings } from '$lib/stores/settings.svelte.js';
import { HttpServiceErrIntoTranscriptionServiceErr, TranscriptionServiceErr } from '../transcription/TranscriptionService';

const gptResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string()
    })
  }))
});

export async function processWithGpt(text: string, prompt: string): Promise<string> {
  console.log('processWithGpt called with text length:', text.length);
  const apiKey = settings.value['transcription.openAi.apiKey'];
  console.log('API key present:', !!apiKey);
  
  if (!apiKey.startsWith('sk-')) {
    throw TranscriptionServiceErr({
      title: 'Invalid OpenAI API Key',
      description: 'The OpenAI API Key must start with "sk-"',
      action: {
        type: 'link',
        label: 'Update OpenAI API Key',
        goto: '/settings/transcription',
      },
    });
  }

  const messages = [
    { role: 'system', content: prompt },
    { role: 'user', content: text }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw TranscriptionServiceErr({
      title: 'GPT Processing Failed',
      description: `Failed to process text with GPT-4O mini: ${response.statusText}`,
      action: { type: 'more-details', error: await response.text() }
    });
  }

  const data = await response.json();
  const result = gptResponseSchema.safeParse(data);

  if (!result.success) {
    throw TranscriptionServiceErr({
      title: 'Invalid GPT Response',
      description: 'Received unexpected response format from OpenAI',
      action: { type: 'more-details', error: result.error }
    });
  }

  return result.data.choices[0].message.content;
}
