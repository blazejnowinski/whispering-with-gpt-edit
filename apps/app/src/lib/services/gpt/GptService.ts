
import { type HttpService } from '../http/HttpService';
import { settings } from '$lib/stores/settings.svelte';
import type { TranscriptionServiceResult } from '../transcription/TranscriptionService';
import { TranscriptionServiceErr, HttpServiceErrIntoTranscriptionServiceErr } from '../transcription/TranscriptionService';
import { Ok } from '@epicenterhq/result';

export function createGptService({ HttpService }: { HttpService: HttpService }) {
  return {
    process: async (text: string): Promise<TranscriptionServiceResult<string>> => {
      if (!settings.value['transcription.openAi.apiKey']) {
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
          'Authorization': `Bearer ${settings.value['transcription.openAi.apiKey']}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: settings.value['transcription.chatGptPrompt']
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: parseFloat(settings.value['transcription.temperature'])
        },
      });

      if (!postResponseResult.ok) {
        return HttpServiceErrIntoTranscriptionServiceErr(postResponseResult);
      }

      return Ok(postResponseResult.data.choices[0].message.content.trim());
    },
  };
}
