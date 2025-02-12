


<script lang="ts">
	import CopyableCode from '$lib/components/CopyableCode.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { settings } from '$lib/stores/settings.svelte';
	import {
		SUPPORTED_LANGUAGES_OPTIONS,
		TRANSCRIPTION_SERVICE_OPTIONS,
		WHISPERING_URL,
	} from '@repo/shared';
	import SettingsLabelInput from '../SettingsLabelInput.svelte';
	import SettingsLabelSelect from '../SettingsLabelSelect.svelte';
	import SettingsLabelTextarea from '../SettingsLabelTextarea.svelte';
</script>

<svelte:head>
	<title>Transcription Settings - Whispering</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Transcription</h3>
		<p class="text-muted-foreground text-sm">
			Configure your Whispering transcription preferences.
		</p>
	</div>
	<Separator />

	<div class="grid gap-2">
		<SettingsLabelSelect
			id="selected-transcription-service"
			label="Transcription Service"
			items={TRANSCRIPTION_SERVICE_OPTIONS}
			selected={settings.value['transcription.selectedTranscriptionService']}
			onSelectedChange={(selected) => {
				if (!selected) return;
				settings.value = {
					...settings.value,
					'transcription.selectedTranscriptionService': selected,
				};
			}}
			placeholder="Select a transcription service"
		/>
	</div>
	{#if settings.value['transcription.selectedTranscriptionService'] === 'OpenAI'}
		<div class="grid gap-2">
			<SettingsLabelInput
				id="openai-api-key"
				label="OpenAI API Key"
				type="password"
				placeholder="Your OpenAI API Key"
				value={settings.value['transcription.openAi.apiKey']}
				oninput={({ currentTarget: { value } }) => {
					settings.value = {
						...settings.value,
						'transcription.openAi.apiKey': value,
					};
				}}
			/>
			<div class="text-muted-foreground text-sm">
				You can find your API key in your <Button
					variant="link"
					class="px-0.3 py-0.2 h-fit"
					href="https://platform.openai.com/api-keys"
					target="_blank"
					rel="noopener noreferrer"
				>
					account settings
				</Button>. Make sure <Button
					variant="link"
					class="px-0.3 py-0.2 h-fit"
					href="https://platform.openai.com/settings/organization/billing/overview"
					target="_blank"
					rel="noopener noreferrer"
				>
					billing
				</Button>
				is enabled.
			</div>
		</div>
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'Groq'}
		<div class="grid gap-2">
			<SettingsLabelInput
				id="groq-api-key"
				label="Groq API Key"
				type="password"
				placeholder="Your Groq API Key"
				value={settings.value['transcription.groq.apiKey']}
				oninput={({ currentTarget: { value } }) => {
					settings.value = {
						...settings.value,
						'transcription.groq.apiKey': value,
					};
				}}
			/>
			<div class="text-muted-foreground text-sm">
				You can find your Groq API key in your <Button
					variant="link"
					class="px-0.3 py-0.2 h-fit"
					href="https://console.groq.com/keys"
					target="_blank"
					rel="noopener noreferrer"
				>
					Groq console
				</Button>.
			</div>
		</div>
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'faster-whisper-server'}
		<Card.Root class="w-full">
			<Card.Header>
				<Card.Title class="text-xl">
					How to setup local Whisper API with
					<code
						class="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono font-semibold"
					>
						faster-whisper-server
					</code>
				</Card.Title>
				<Card.Description class="leading-7">
					<p>
						Ensure Docker or an equivalent (e.g., Orbstack) is installed on your
						computer.
					</p>
					<p>Then run the following command in terminal:</p>
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Tabs.Root value="cpu-mode">
					<Tabs.List
						class="w-full justify-start rounded-none border-b bg-transparent p-0"
					>
						<Tabs.Trigger
							value="cpu-mode"
							class="text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold shadow-none transition-none data-[state=active]:shadow-none"
						>
							CPU Mode
						</Tabs.Trigger>
						<Tabs.Trigger
							value="gpu-mode"
							class="text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold shadow-none transition-none data-[state=active]:shadow-none"
						>
							GPU Mode
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="cpu-mode">
						<p class="text-muted-foreground pb-4">
							For computers without CUDA support:
						</p>
						<CopyableCode
							codeText={`docker run -e ALLOW_ORIGINS='["${WHISPERING_URL}"]' --publish 8000:8000 --volume ~/.cache/huggingface:/root/.cache/huggingface fedirz/faster-whisper-server:latest-cpu`}
						/>
					</Tabs.Content>
					<Tabs.Content value="gpu-mode">
						<p class="text-muted-foreground pb-4">
							For computers with CUDA support:
						</p>
						<CopyableCode
							codeText={`docker run -e ALLOW_ORIGINS='["${WHISPERING_URL}"]' --gpus=all --publish 8000:8000 --volume ~/.cache/huggingface:/root/.cache/huggingface fedirz/faster-whisper-server:latest-cuda`}
						/>
					</Tabs.Content>
				</Tabs.Root>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-2">
			<SettingsLabelInput
				id="faster-whisper-server-url"
				label="faster-whisper-server URL"
				placeholder="Your faster-whisper-server URL"
				value={settings.value['transcription.fasterWhisperServer.serverUrl']}
				oninput={({ currentTarget: { value } }) => {
					settings.value = {
						...settings.value,
						'transcription.fasterWhisperServer.serverUrl': value,
					};
				}}
			/>
		</div>
		<div class="grid gap-2">
			<SettingsLabelInput
				id="faster-whisper-server-model"
				label="faster-whisper-server Model"
				placeholder="Your faster-whisper-server Model"
				value={settings.value['transcription.fasterWhisperServer.serverModel']}
				oninput={({ currentTarget: { value } }) => {
					settings.value = {
						...settings.value,
						'transcription.fasterWhisperServer.serverModel': value,
					};
				}}
			/>
		</div>
	{/if}
	<div class="grid gap-2">
		<SettingsLabelSelect
			id="output-language"
			label="Output Language"
			items={SUPPORTED_LANGUAGES_OPTIONS}
			selected={settings.value['transcription.outputLanguage']}
			onSelectedChange={(selected) => {
				if (!selected) return;
				settings.value = {
					...settings.value,
					'transcription.outputLanguage': selected,
				};
			}}
			placeholder="Select a language"
		/>
	</div>

	<div class="grid gap-2">
		<SettingsLabelInput
			id="temperature"
			label="Temperature"
			type="number"
			min="0"
			max="1"
			step="0.1"
			placeholder="0"
			value={settings.value['transcription.temperature']}
			oninput={({ currentTarget: { value } }) => {
				settings.value = {
					...settings.value,
					'transcription.temperature': value,
				};
			}}
		/>
		<div class="text-muted-foreground text-sm">
			Controls randomness in the model's output. 0 is focused and deterministic,
			1 is more creative.
		</div>
	</div>

	<div class="grid gap-2">
		<SettingsLabelTextarea
			id="transcription-prompt"
			label="System Prompt"
			placeholder="Optional system prompt to guide the transcription"
			value={settings.value['transcription.prompt']}
			oninput={({ currentTarget: { value } }) => {
				settings.value = {
					...settings.value,
					'transcription.prompt': value,
				};
			}}
			description="Custom instructions to guide the transcription process. Leave empty for default behavior."
		/>
	</div>

	<div class="grid gap-2">
		<SettingsLabelTextarea
			id="chatgpt-prompt"
			label="ChatGPT Prompt"
			placeholder="Optional prompt for ChatGPT processing"
			value={settings.value['transcription.chatGptPrompt']}
			oninput={({ currentTarget: { value } }) => {
				settings.value = {
					...settings.value,
					'transcription.chatGptPrompt': value,
				};
			}}
			description="Custom instructions for ChatGPT to process the transcription. Leave empty for no ChatGPT processing."
		/>
	</div>
</div>
