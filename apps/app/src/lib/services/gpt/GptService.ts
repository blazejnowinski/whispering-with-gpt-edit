
import { type HttpService } from '../http/HttpService';
import { settings } from '$lib/stores/settings.svelte';
import type { TranscriptionServiceResult } from '../transcription/TranscriptionService';
import { TranscriptionServiceErr, HttpServiceErrIntoTranscriptionServiceErr } from '../transcription/TranscriptionService';
import { Ok } from '@epicenterhq/result';

export type GptService = ReturnType<typeof createGptService>;

export function createGptService({ HttpService }: { HttpService: HttpService }) {
  const service = {
    process: async (text: string): Promise<TranscriptionServiceResult<string>> => {
      const apiKey = settings.value['transcription.openAi.apiKey'];
      
      if (!apiKey) {
        return TranscriptionServiceErr({
          title: 'OpenAI API Key not provided.',
          description: 'Please enter your OpenAI API key in the settings',
          action: {
            type: 'link',
            label: 'Go to settings',
            goto: '/settings/transcription',
          },
        });
      }

      const postResponseResult = await HttpService.post({
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: settings.value['transcription.chatGptPrompt'] || ''
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: parseFloat(settings.value['transcription.temperature'] || '0.7')
        }),
      });

      if (!postResponseResult.ok) {
        return HttpServiceErrIntoTranscriptionServiceErr(postResponseResult);
      }

      return Ok(postResponseResult.data.choices[0].message.content.trim());
    }
  };

  return service;
}

export default createGptService;
