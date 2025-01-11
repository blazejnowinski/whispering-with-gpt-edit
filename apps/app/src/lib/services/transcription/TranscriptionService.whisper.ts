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
			const reader = new FileReader();
			reader.readAsArrayBuffer(audioBlob);
			await new Promise(resolve => reader.onload = resolve);
			const buffer = reader.result as ArrayBuffer;
			const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

			const requestBody = {
				model: 'whisper-1',
				audio: {
					type: 'audio/mp3', //Update with correct audio type if needed
					data: base64,
				},
        language: options.outputLanguage !== 'auto' ? options.outputLanguage : undefined,
        prompt: options.prompt,
        temperature: options.temperature,

			};


			// First API call - Transcribe with Whisper
			const transcriptionResult = await HttpService.post({
				url: 'https://api.openai.com/v1/audio/transcriptions',
				headers: {
					Authorization: `Bearer ${settings.value['transcription.openAi.apiKey']}`,
					'Content-Type': 'application/json',
				},
				schema: whisperApiResponseSchema,
				body: JSON.stringify(requestBody),
			});

			if (!transcriptionResult.ok) {
				return HttpServiceErrIntoTranscriptionServiceErr(transcriptionResult);
			}

			const whisperApiResponse = transcriptionResult.data;
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

			// Second API call - Process with GPT
			const gptResult = await HttpService.post({
				url: 'https://api.openai.com/v1/chat/completions',
				headers: {
					Authorization: `Bearer ${settings.value['transcription.openAi.apiKey']}`,
					'Content-Type': 'application/json',
				},
				body: {
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
				},
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