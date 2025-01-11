import { settings } from '$lib/stores/settings.svelte.js';
import { getExtensionFromAudioBlob } from '$lib/utils';
import { Ok } from '@epicenterhq/result';
import type { HttpService } from '../http/HttpService';
import {
	HttpServiceErrIntoTranscriptionServiceErr,
	type TranscriptionService,
	TranscriptionServiceErr,
} from './TranscriptionService';
import { whisperApiResponseSchema } from './schemas';

const MAX_FILE_SIZE_MB = 25 as const;

export function createTranscriptionServiceWhisper({
	HttpService,
}: {
	HttpService: HttpService;
}): TranscriptionService {
	return {
		transcribe: async (audioBlob, options) => {
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

			if (!settings.value['transcription.openAi.apiKey'].startsWith('sk-')) {
				return TranscriptionServiceErr({
					title: 'Invalid OpenAI API Key',
					description: 'The OpenAI API Key must start with "sk-"',
					action: {
						type: 'link',
						label: 'Update OpenAI API Key',
						goto: '/settings/transcription',
					},
				});
			}
			const blobSizeInMb = audioBlob.size / (1024 * 1024);
			if (blobSizeInMb > MAX_FILE_SIZE_MB) {
				return TranscriptionServiceErr({
					title: `The file size (${blobSizeInMb}MB) is too large`,
					description: `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
				});
			}
			const formData = new FormData();
			formData.append(
				'file',
				audioBlob,
				`recording.${getExtensionFromAudioBlob(audioBlob)}`,
			);
			formData.append('model', 'whisper-1');
			if (options.outputLanguage !== 'auto') {
				formData.append('language', options.outputLanguage);
			}
			if (options.prompt) formData.append('prompt', options.prompt);
			if (options.temperature)
				formData.append('temperature', options.temperature);

			const postResponseResult = await HttpService.post({
				formData,
				url: 'https://api.openai.com/v1/audio/transcriptions',
				headers: {
					'Authorization': `Bearer ${settings.value['transcription.openAi.apiKey']}`,
					// Don't set Content-Type for FormData, browser will set correct boundary
				},
				schema: whisperApiResponseSchema,
			});
			if (!postResponseResult.ok) {
				return HttpServiceErrIntoTranscriptionServiceErr(postResponseResult);
			}
			const whisperApiResponse = postResponseResult.data;
			if ('error' in whisperApiResponse) {
				return TranscriptionServiceErr({
					title: 'Server error from Whisper API',
					description: 'This is likely a problem with OpenAI, not you.',
					action: {
						type: 'more-details',
						error: whisperApiResponse.error.message,
					},
				});
			}

			const transcribedText = whisperApiResponse.text.trim();

			// Second API call to GPT for processing
			const gptPayload = {
				model: 'gpt-3.5-turbo',
				messages: [
					{
						role: 'system',
						content: options.prompt || 'Process this text and improve its clarity and coherence.'
					},
					{
						role: 'user',
						content: transcribedText
					}
				],
				temperature: parseFloat(options.temperature) || 0.7
			};

			const gptResult = await HttpService.post({
				url: 'https://api.openai.com/v1/chat/completions',
				headers: {
					'Authorization': `Bearer ${settings.value['transcription.openAi.apiKey']}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(gptPayload),
			});

			if (!gptResult.ok) {
				return TranscriptionServiceErr({
					title: 'GPT Processing Error',
					description: `Failed to process text with GPT: ${gptResult.error}`,
					action: { type: 'more-details', error: gptResult.error },
				});
			}

			const processedText = gptResult.data.choices[0].message.content.trim();
			return Ok(processedText);
		},
	};
}