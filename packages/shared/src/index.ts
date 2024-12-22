import { type Result, Err, tryAsync, trySync } from '@epicenterhq/result';
import { z } from 'zod';
import { notificationOptionsSchema } from './services/NotificationService.js';
import {
	SUPPORTED_LANGUAGES,
	TRANSCRIPTION_SERVICES,
} from './services/index.js';
export { Err, Ok } from '@epicenterhq/result';
import type { NotificationOptions } from './services/NotificationService.js';

export const WHISPERING_URL =
	process.env.NODE_ENV === 'production'
		? 'https://whispering.bradenwong.com'
		: 'http://localhost:5173';

export const WHISPERING_URL_WILDCARD = `${WHISPERING_URL}/*` as const;

export const WHISPERING_RECORDINGS_PATHNAME = '/recordings' as const;

export const BITRATE_VALUES_KBPS = [
	'64',
	'96',
	'128',
	'192',
	'256',
	'320',
] as const;
export const BITRATE_OPTIONS = BITRATE_VALUES_KBPS.map((bitrate) => ({
	label: `${bitrate} kbps`,
	value: bitrate,
}));
export const DEFAULT_BITRATE_KBPS =
	'64' as const satisfies (typeof BITRATE_VALUES_KBPS)[number];

const ALWAYS_ON_TOP_VALUES = [
	'Always',
	'Never',
	'When Recording',
	'When Recording and Transcribing',
] as const;
export const ALWAYS_ON_TOP_OPTIONS = ALWAYS_ON_TOP_VALUES.map((option) => ({
	label: option,
	value: option,
}));

export const settingsSchema = z.object({
	isPlaySoundEnabled: z.boolean(),
	isCopyToClipboardEnabled: z.boolean(),
	isPasteContentsOnSuccessEnabled: z.boolean(),
	isFasterRerecordEnabled: z.boolean(),
	alwaysOnTop: z.enum(ALWAYS_ON_TOP_VALUES),

	selectedAudioInputDeviceId: z.string(),
	bitrateKbps: z
		.enum(BITRATE_VALUES_KBPS)
		.optional()
		.default(DEFAULT_BITRATE_KBPS),

	selectedTranscriptionService: z.enum(TRANSCRIPTION_SERVICES),
	openAiApiKey: z.string(),
	groqApiKey: z.string(),
	fasterWhisperServerUrl: z.string(),
	fasterWhisperServerModel: z.string(),
	outputLanguage: z.enum(SUPPORTED_LANGUAGES),

	currentLocalShortcut: z.string(),
	currentGlobalShortcut: z.string(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const getDefaultSettings = (platform: 'app' | 'extension') =>
	({
		isPlaySoundEnabled: true,
		isCopyToClipboardEnabled: true,
		isPasteContentsOnSuccessEnabled: true,
		isFasterRerecordEnabled: false,
		alwaysOnTop: 'When Recording',

		selectedAudioInputDeviceId: 'default',
		bitrateKbps: DEFAULT_BITRATE_KBPS,

		selectedTranscriptionService: 'OpenAI',
		openAiApiKey: '',
		groqApiKey: '',
		fasterWhisperServerUrl: 'http://localhost:8000',
		fasterWhisperServerModel: 'Systran/faster-whisper-medium.en',
		outputLanguage: 'auto',

		currentLocalShortcut: 'space',
		currentGlobalShortcut: platform === 'app' ? 'CommandOrControl+Shift+;' : '',
	}) satisfies Settings;

export type BubbleErrProperties<T extends string = string> = {
	_tag: T;
	message: string;
};

export type BubbleResult<T> = Result<T, BubbleErrProperties>;

export type BubbleErr = Err<BubbleErrProperties>;

export const BubbleErr = <E extends BubbleErrProperties>(error: E) =>
	Err(error);

export const trySyncBubble = <T>(
	opts: Parameters<typeof trySync<T, BubbleErrProperties>>[0],
): BubbleResult<T> => trySync(opts);

export const tryAsyncBubble = <T>(
	opts: Parameters<typeof tryAsync<T, BubbleErrProperties>>[0],
): Promise<BubbleResult<T>> => tryAsync(opts);

type WhisperingErrProperties = {
	_tag: 'WhisperingError';
	isWarning?: boolean;
} & NotificationOptions;

export type WhisperingErr = Err<WhisperingErrProperties>;

export type WhisperingResult<T> = Result<T, WhisperingErrProperties>;

export const WhisperingErr = <
	ErrProperties extends Omit<WhisperingErrProperties, '_tag'>,
>(
	error: ErrProperties,
): WhisperingErr => Err({ ...error, _tag: 'WhisperingError' });

export const trySyncWhispering = <T>(
	opts: Parameters<typeof trySync<T, WhisperingErrProperties>>[0],
): WhisperingResult<T> => trySync(opts);

export const tryAsyncWhispering = <T>(
	opts: Parameters<typeof tryAsync<T, WhisperingErrProperties>>[0],
): Promise<WhisperingResult<T>> => tryAsync(opts);

export const parseJson = (value: string) =>
	trySyncBubble({
		try: () => JSON.parse(value) as unknown,
		catch: (error) => ({
			_tag: 'ParseJsonError',
			message: error instanceof Error ? error.message : 'Unexpected JSON input',
		}),
	});

export const recordingStateSchema = z.enum([
	'IDLE',
	'SESSION',
	'SESSION+RECORDING',
]);

export type WhisperingRecordingState = z.infer<typeof recordingStateSchema>;

export const recorderStateToIcons = {
	IDLE: '🎙️',
	SESSION: '🎙️',
	'SESSION+RECORDING': '🔲',
} as const satisfies Record<WhisperingRecordingState, string>;

export const externalMessageSchema = z.discriminatedUnion('name', [
	z.object({
		name: z.literal('whispering-extension/notifyWhisperingTabReady'),
		body: z.object({}),
	}),
	z.object({
		name: z.literal('whispering-extension/playSound'),
		body: z.object({
			sound: z.enum(['start', 'stop', 'cancel']),
		}),
	}),
	z.object({
		name: z.literal('whispering-extension/setClipboardText'),
		body: z.object({
			transcribedText: z.string(),
		}),
	}),
	z.object({
		name: z.literal('whispering-extension/setRecorderState'),
		body: z.object({
			recorderState: recordingStateSchema,
		}),
	}),
	z.object({
		name: z.literal('whispering-extension/notifications/create'),
		body: z.object({
			notifyOptions: notificationOptionsSchema,
		}),
	}),
	z.object({
		name: z.literal('whispering-extension/notifications/clear'),
		body: z.object({
			notificationId: z.string(),
		}),
	}),
	z.object({
		name: z.literal('whispering-extension/writeTextToCursor'),
		body: z.object({
			transcribedText: z.string(),
		}),
	}),
]);

export type ExternalMessage = z.infer<typeof externalMessageSchema>;

export type ExternalMessageBody<T extends ExternalMessage['name']> = Extract<
	ExternalMessage,
	{ name: T }
>['body'];

export type ExternalMessageReturnType<T extends ExternalMessage['name']> = {
	'whispering-extension/notifyWhisperingTabReady': undefined;
	'whispering-extension/playSound': undefined;
	'whispering-extension/setClipboardText': string;
	'whispering-extension/setRecorderState': undefined;
	'whispering-extension/notifications/create': string;
	'whispering-extension/notifications/clear': undefined;
	'whispering-extension/writeTextToCursor': string;
}[T];

export * from './services/index.js';
