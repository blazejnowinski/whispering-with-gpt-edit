import {
	SUPPORTED_LANGUAGES_OPTIONS,
	type Settings,
	TRANSCRIPTION_SERVICE_OPTIONS,
	WHISPERING_SETTINGS_PATHNAME,
	WHISPERING_URL,
} from '@repo/shared';
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { Fragment } from 'react';
import { toast } from 'sonner';
import { Button } from '~components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~components/ui/card';
import { Input } from '~components/ui/input';
import { Label } from '~components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~components/ui/select';
import { Skeleton } from '~components/ui/skeleton';
import { Toaster } from '~components/ui/sonner';
import { Switch } from '~components/ui/switch';
import { app } from '~lib/app';
import './style.css';

const queryClient = new QueryClient();

function IndexPopup() {
	return (
		<QueryClientProvider client={queryClient}>
			<main className="flex min-h-screen items-center justify-center">
				<SettingsCard />
			</main>
			<Toaster />
		</QueryClientProvider>
	);
}

function SettingsCard() {
	const queryClient = useQueryClient();

	const {
		isPending: isSettingsPending,
		isError: isSettingsError,
		error: settingsError,
		data: settings,
	} = useQuery({
		queryKey: ['settings'],
		queryFn: async () => {
			const response = await app.getSettings();
			if (!response.ok) throw response.error;
			return response.data;
		},
	});

	const { mutate: setSettings } = useMutation({
		mutationFn: async (settings: Settings) => {
			const response = await app.setSettings(settings);
			if (!response.ok) throw response.error;
		},
		onSuccess: () => {
			toast.success('Settings updated!');
		},
		onMutate: async (newSettings) => {
			await queryClient.cancelQueries({ queryKey: ['settings'] });
			const previousSettingsSnapshot = queryClient.getQueryData([
				'settings',
			]) as Settings;
			queryClient.setQueryData(['settings'], newSettings);
			return { previousSettingsSnapshot, newSettings };
		},
		onError: (err, newSettings, context) => {
			if (!context) return;
			queryClient.setQueryData(['settings'], context.previousSettingsSnapshot);
			toast.error('Error updating settings', {
				description: err.message,
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ['settings'] });
		},
	});

	if (isSettingsPending) {
		return (
			<Card className="w-full max-w-xl">
				<CardHeader>
					<Skeleton className="h-8 w-[180px]" />
					<Skeleton className="mt-2 h-4 w-[250px]" />
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Switch skeletons */}
					{Array.from({ length: 3 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Use index as key for skeleton
						<div key={i} className="flex items-center gap-2">
							<Skeleton className="h-6 w-10" />
							<Skeleton className="h-4 w-48" />
						</div>
					))}

					{/* Select and Input skeletons */}
					{Array.from({ length: 4 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Use index as key for skeleton
						<div key={i} className="grid gap-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</CardContent>
				<CardFooter>
					<Skeleton className="h-10 w-full" />
				</CardFooter>
			</Card>
		);
	}

	if (isSettingsError) {
		return (
			<Card className="w-full max-w-xl">
				<CardHeader>
					<CardTitle className="text-xl ">Settings Error</CardTitle>
					<CardDescription>
						There was a problem loading your settings. Please try refreshing the
						page.
					</CardDescription>
				</CardHeader>
				<CardContent className="whitespace-pre-wrap font-mono text-destructive text-sm">
					{settingsError instanceof Error
						? settingsError.message
						: JSON.stringify(settingsError)}
				</CardContent>
				<CardFooter>
					<Button onClick={() => window.location.reload()} className="w-full">
						Try Again
					</Button>
				</CardFooter>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-xl">
			<CardHeader>
				<CardTitle className="text-xl">Settings</CardTitle>
				<CardDescription>
					Customize your Whispering experience. Synced with the{' '}
					<Button
						variant="link"
						size="inline"
						onClick={() =>
							chrome.tabs.create({
								url: `${WHISPERING_URL}${WHISPERING_SETTINGS_PATHNAME}` as const,
							})
						}
					>
						Whispering website
					</Button>
					!
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex items-center gap-2">
					<Switch
						id="play-sound-enabled"
						aria-labelledby="play-sound-enabled"
						checked={settings.isPlaySoundEnabled}
						onCheckedChange={(newValue) =>
							setSettings({ ...settings, isPlaySoundEnabled: newValue })
						}
					/>
					<Label htmlFor="play-sound-enabled">
						Play sound on toggle on and off
					</Label>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id="copy-to-clipboard"
						aria-labelledby="copy-to-clipboard"
						checked={settings.isCopyToClipboardEnabled}
						onCheckedChange={(newValue) =>
							setSettings({
								...settings,
								isCopyToClipboardEnabled: newValue,
							})
						}
					/>
					<Label htmlFor="copy-to-clipboard">
						Copy text to clipboard on successful transcription
					</Label>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id="paste-from-clipboard"
						aria-labelledby="paste-from-clipboard"
						checked={settings.isPasteContentsOnSuccessEnabled}
						onCheckedChange={(newValue) =>
							setSettings({
								...settings,
								isPasteContentsOnSuccessEnabled: newValue,
							})
						}
					/>
					<Label htmlFor="paste-from-clipboard">
						Paste contents from clipboard after successful transcription
					</Label>
				</div>

				<div className="grid-gap-2">
					<SettingsLabelSelect
						id="output-language"
						label="Output Language"
						options={SUPPORTED_LANGUAGES_OPTIONS}
						value={settings['transcription.outputLanguage']}
						onValueChange={(value) =>
							setSettings({
								...settings,
								'transcription.outputLanguage': value,
							})
						}
					/>
				</div>

				<div className="grid gap-2">
					<Label className="text-sm" htmlFor="global-shortcut">
						Global Shortcut
					</Label>
					<div className="relative">
						<Input
							id="global-shortcut"
							placeholder="Global Shortcut to toggle recording"
							type="text"
							autoComplete="off"
							disabled
						/>
						<Button
							className="absolute inset-0 backdrop-blur"
							variant="link"
							onClick={() =>
								chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
							}
						>
							Edit Global Shortcut in Extension Settings
						</Button>
					</div>
				</div>

				<div className="grid gap-2">
					<SettingsLabelSelect
						id="recording-retention-strategy"
						label="Auto Delete Recordings"
						options={[
							{ value: 'keep-forever', label: 'Keep All Recordings' },
							{ value: 'limit-count', label: 'Keep Limited Number' },
						]}
						value={settings.recordingRetentionStrategy}
						onValueChange={(value) =>
							setSettings({ ...settings, recordingRetentionStrategy: value })
						}
					/>
				</div>

				{settings.recordingRetentionStrategy === 'limit-count' && (
					<div className="grid gap-2">
						<SettingsLabelSelect
							id="max-recording-count"
							label="Maximum Recordings"
							options={[
								{ value: '5', label: '5 Recordings' },
								{ value: '10', label: '10 Recordings' },
								{ value: '25', label: '25 Recordings' },
								{ value: '50', label: '50 Recordings' },
								{ value: '100', label: '100 Recordings' },
							]}
							value={settings.maxRecordingCount}
							onValueChange={(value) =>
								setSettings({ ...settings, maxRecordingCount: value })
							}
						/>
					</div>
				)}

				<div className="grid-gap-2">
					<SettingsLabelSelect
						id="selected-transcription-service"
						label="Transcription Service"
						options={TRANSCRIPTION_SERVICE_OPTIONS}
						value={settings['transcription.selectedTranscriptionService']}
						onValueChange={(value) =>
							setSettings({
								...settings,
								'transcription.selectedTranscriptionService': value,
							})
						}
					/>
				</div>

				{settings['transcription.selectedTranscriptionService'] === 'OpenAI' ? (
					<div className="grid gap-2">
						<SettingsLabelInput
							id="openai-api-key"
							label="OpenAI API Key"
							value={settings['transcription.openAi.apiKey']}
							onChange={(value) =>
								setSettings({
									...settings,
									'transcription.openAi.apiKey': value,
								})
							}
							placeholder="Your OpenAI API Key"
							type="password"
						/>
						<div className="text-muted-foreground text-sm">
							You can find your OpenAI API key in your{' '}
							<Button
								variant="link"
								className="h-fit px-0.3 py-0.2"
								onClick={() =>
									chrome.tabs.create({
										url: 'https://platform.openai.com/api-keys',
									})
								}
							>
								OpenAI account settings
							</Button>
							. Make sure{' '}
							<Button
								variant="link"
								className="h-fit px-0.3 py-0.2"
								onClick={() =>
									chrome.tabs.create({
										url: 'https://platform.openai.com/settings/organization/billing/overview',
									})
								}
							>
								billing
							</Button>{' '}
							is enabled.
						</div>
					</div>
				) : settings['transcription.selectedTranscriptionService'] ===
					'Groq' ? (
					<div className="grid gap-2">
						<SettingsLabelInput
							id="groq-api-key"
							label="Groq API Key"
							value={settings['transcription.groq.apiKey']}
							onChange={(value) =>
								setSettings({
									...settings,
									'transcription.groq.apiKey': value,
								})
							}
							placeholder="Your Groq API Key"
							type="password"
						/>
						<div className="text-muted-foreground text-sm">
							You can find your Groq API key in your{' '}
							<Button
								variant="link"
								className="h-fit px-0.3 py-0.2"
								onClick={() =>
									chrome.tabs.create({ url: 'https://console.groq.com/keys' })
								}
							>
								Groq console
							</Button>
							.
						</div>
					</div>
				) : null}
			</CardContent>
			<CardFooter>
				<Button
					onClick={() => {
						if (
							settings['transcription.selectedTranscriptionService'] ===
								'OpenAI' &&
							!settings['transcription.openAi.apiKey']
						) {
							alert('Please enter an OpenAI API Key');
							return;
						}
						if (
							settings['transcription.selectedTranscriptionService'] ===
								'Groq' &&
							!settings['transcription.groq.apiKey']
						) {
							alert('Please enter a Groq API Key');
							return;
						}
						window.close();
					}}
					className="w-full"
					variant="secondary"
				>
					Submit
				</Button>
			</CardFooter>
		</Card>
	);
}

function SettingsLabelSelect<T extends string>({
	id,
	label,
	options,
	value,
	onValueChange,
	placeholder = 'Select an option',
	disabled = false,
}: {
	id: string;
	label: string;
	options: {
		value: string;
		label: string;
	}[];
	value: T;
	onValueChange: (value: T) => void;
	placeholder?: string;
	disabled?: boolean;
}) {
	return (
		<Fragment>
			<Label className="text-sm" htmlFor={id}>
				{label}
			</Label>
			<Select value={value} onValueChange={onValueChange} disabled={disabled}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Fragment>
	);
}

function SettingsLabelInput({
	id,
	label,
	value,
	onChange,
	placeholder = '',
	type = 'text',
	disabled = false,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: 'text' | 'password';
	disabled?: boolean;
}) {
	return (
		<Fragment>
			<Label className="text-sm" htmlFor={id}>
				{label}
			</Label>
			<Input
				id={id}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				type={type}
				disabled={disabled}
				autoComplete="off"
			/>
		</Fragment>
	);
}

export default IndexPopup;
