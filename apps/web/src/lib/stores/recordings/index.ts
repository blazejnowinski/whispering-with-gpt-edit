import { RecordingsDb, type Recording, RecordingNotFound } from '@repo/recorder';
import { transcribeAudioWithWhisperApi } from '@repo/recorder/whisper';
import { Data, Effect } from 'effect';
import { get, writable } from 'svelte/store';
import { apiKey } from '../apiKey';

export function createRecordings() {
	const { subscribe, set, update } = writable<Recording[]>([]);
	const editRecording = (id: string, recording: Recording) =>
		Effect.gen(function* (_) {
			const recordingsDb = yield* _(RecordingsDb);
			yield* _(recordingsDb.editRecording(id, recording));
			update((recordings) => {
				const index = recordings.findIndex((recording) => recording.id === id);
				if (index === -1) return recordings;
				recordings[index] = recording;
				return recordings;
			});
		});
	return {
		subscribe,
		sync: Effect.gen(function* (_) {
			const recordingsDb = yield* _(RecordingsDb);
			const recordings = yield* _(recordingsDb.getAllRecordings);
			set(recordings);
		}),
		addRecording: (recording: Recording) =>
			Effect.gen(function* (_) {
				const recordingsDb = yield* _(RecordingsDb);
				yield* _(recordingsDb.addRecording(recording));
				update((recordings) => [...recordings, recording]);
			}),
		editRecording,
		deleteRecording: (id: string) =>
			Effect.gen(function* (_) {
				const recordingsDb = yield* _(RecordingsDb);
				yield* _(recordingsDb.deleteRecording(id));
				update((recordings) => recordings.filter((recording) => recording.id !== id));
			}),
		transcribeRecording: (id: string) =>
			Effect.gen(function* (_) {
				const $apiKey = get(apiKey);
				const recordingsDb = yield* _(RecordingsDb);
				const recording = yield* _(recordingsDb.getRecording(id));
				if (!recording) return yield* _(new RecordingNotFound({ id }));
				yield* _(editRecording(id, { ...recording, state: 'TRANSCRIBING' }));
				const transcription = yield* _(transcribeAudioWithWhisperApi(recording.blob, $apiKey));
				yield* _(editRecording(id, { ...recording, state: 'DONE' }));
				yield* _(editRecording(id, { ...recording, transcription }));
			})
	};
}
