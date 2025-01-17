import type { HttpService } from '../http/HttpService';
import { z } from 'zod';
import { settings } from '$lib/stores/settings.svelte.js';
import { HttpServiceErrIntoTranscriptionServiceErr, TranscriptionServiceErr } from '../transcription/TranscriptionService';

const gptResponseSchema = z.object({
  content: z.string()
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

  const systemPrompt = prompt || settings.value['transcription.chatGptPrompt'] || 'You are a helpful assistant. Please respond in the same language as the user\'s input.';

  const response = await fetch(`/api/gpt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      prompt: systemPrompt,
      apiKey
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GPT Processing Error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw TranscriptionServiceErr({
      title: 'GPT Processing Failed',
      description: `Failed to process text with GPT (${response.status}): ${errorText || response.statusText}`,
      action: { type: 'more-details', error: errorText }
    });
  }

  const data = await response.json();
  const result = gptResponseSchema.safeParse(data);

  if (!result.success) {
    throw TranscriptionServiceErr({
      title: 'Invalid GPT Response',
      description: 'Received unexpected response format from server',
      action: { type: 'more-details', error: result.error }
    });
  }

  return result.data.content;
}