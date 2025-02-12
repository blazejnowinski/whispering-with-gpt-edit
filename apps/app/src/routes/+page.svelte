<script lang="ts">
  import CancelOrEndRecordingSessionButton from '$lib/components/CancelOrEndRecordingSessionButton.svelte';
  import NavItems from '$lib/components/NavItems.svelte';
  import WhisperingButton from '$lib/components/WhisperingButton.svelte';
  import { ClipboardIcon } from '$lib/components/icons';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { createBlobUrlManager } from '$lib/utils/blobUrlManager';
  import { recorder } from '$lib/stores/recorder.svelte';
  import { type Recording, recordings } from '$lib/stores/recordings.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { clipboard } from '$lib/utils/clipboard';
  import { createRecordingViewTransitionName } from '$lib/utils/createRecordingViewTransitionName';
  import { Loader2Icon } from 'lucide-svelte';
  import { onDestroy } from 'svelte';
  import { processWithGpt } from '$lib/services/gpt/GptService';
  import { toast } from '$lib/utils/toast';

  let gptMessages: string[] = [];
  let isProcessing = false;

  async function handleProcessWithGpt(transcribedText: string) {
    console.log('handleProcessWithGpt called with text:', transcribedText);
    if (!transcribedText) {
      console.log('No transcribed text found');
      toast.error({
        title: 'No Text to Process',
        description: 'Please transcribe some text first'
      });
      return;
    }

    isProcessing = true;
    try {
      const prompt = settings.value['transcription.prompt'];
      console.log('Using prompt:', prompt);
      console.log('Calling processWithGpt...');
      const gptResponse = await processWithGpt(transcribedText, prompt || '');
      gptMessages = [...gptMessages, gptResponse];
      console.log('GPT response received:', gptResponse);
      toast.success({
        title: 'GPT Processing Complete',
        description: 'Response received from GPT'
      });
    } catch (error) {
      console.error('GPT processing error:', error);
      toast.error({
        title: 'GPT Processing Failed',
        description: error.message
      });
    } finally {
      isProcessing = false;
    }
  }

  const latestRecording = $derived<Recording>(
    recordings.value.at(-1) ?? {
      id: '',
      title: '',
      subtitle: '',
      timestamp: '',
      blob: new Blob(),
      transcribedText: '',
      transcriptionStatus: 'UNPROCESSED',
    },
  );

  const recorderStateAsIcon = $derived(
    recorder.recorderState === 'SESSION+RECORDING' ? '🔲' : '🎙️',
  );

  const blobUrlManager = createBlobUrlManager();

  const blobUrl = $derived.by(() => {
    if (!latestRecording.blob) return undefined;
    return blobUrlManager.createUrl(latestRecording.blob);
  });

  onDestroy(() => {
    blobUrlManager.revokeCurrentUrl();
  });
</script>

<svelte:head>
  <title>Whispering</title>
</svelte:head>

<main class="flex flex-1 flex-col items-center justify-center gap-4">
  <div class="xs:flex hidden flex-col items-center gap-4">
    <h1 class="scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl">
      Start recording
    </h1>
    <p class="text-muted-foreground text-center">
      Click the 🎙 button to start. Allow access to your microphone.
    </p>
  </div>

  <div class="relative">
    <WhisperingButton
      tooltipContent="Toggle recording"
      onclick={recorder.toggleRecordingWithToast}
      variant="ghost"
      class="h-full w-full transform items-center justify-center overflow-hidden duration-300 ease-in-out hover:scale-110 focus:scale-110"
    >
      <span
        style="filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5)); view-transition-name: microphone-icon;"
        class="text-[100px] leading-none"
      >
        {recorderStateAsIcon}
      </span>
    </WhisperingButton>
    <CancelOrEndRecordingSessionButton
      class="absolute -right-14 bottom-0 transform text-2xl hover:scale-110 focus:scale-110"
    />
  </div>

  <div class="xxs:flex hidden w-full max-w-80 flex-col items-center gap-2">
    <div class="flex w-full items-center gap-2">
      <Label for="transcribed-text" class="sr-only">Transcribed Text</Label>
      <Input
        id="transcribed-text"
        class="w-full"
        placeholder="Transcribed text will appear here..."
        style="view-transition-name: {createRecordingViewTransitionName({
          recordingId: latestRecording.id,
          propertyName: 'transcribedText',
        })}"
        readonly
        value={latestRecording.transcriptionStatus === 'TRANSCRIBING'
          ? '...'
          : latestRecording.transcribedText}
      />
      <WhisperingButton
        tooltipContent="Copy transcribed text"
        onclick={() =>
          clipboard.copyTextToClipboardWithToast({
            label: 'transcribed text',
            text: latestRecording.transcribedText,
          })}
        class="dark:bg-secondary dark:text-secondary-foreground px-4 py-2"
        style="view-transition-name: {createRecordingViewTransitionName({
          recordingId: latestRecording.id,
          propertyName: 'transcribedText',
        })}-copy-button"
      >
        {#if latestRecording.transcriptionStatus === 'TRANSCRIBING'}
          <Loader2Icon class="h-6 w-6 animate-spin" />
        {:else}
          <ClipboardIcon class="h-6 w-6" />
        {/if}
      </WhisperingButton>
    </div>

    <div class="flex w-full items-center gap-2 mt-4">
      <div class="relative w-full">
        <Input
          id="bot-input"
          class="w-full min-h-[40px] overflow-y-auto text-foreground"
          placeholder="Bot interaction text will appear here..."
          readonly
          value={gptMessages.length > 0 ? gptMessages[gptMessages.length - 1] : ''}
        />
        <div class="absolute top-2 right-2">
          <span class="text-lg">🤖</span>
        </div>
      </div>
      <WhisperingButton
        tooltipContent="Copy bot text"
        onclick={() => clipboard.copyTextToClipboardWithToast({
          label: 'bot response',
          text: gptMessages.length > 0 ? gptMessages[gptMessages.length - 1] : '',
        })}
        class="dark:bg-secondary dark:text-secondary-foreground px-4 py-2"
      >
        <ClipboardIcon class="h-6 w-6" />
      </WhisperingButton>
    </div>
    <WhisperingButton
      tooltipContent="Start bot interaction"
      onclick={() => handleProcessWithGpt(latestRecording.transcribedText)}
      variant="ghost"
      class="transform text-4xl hover:scale-110 focus:scale-110"
    >
      🤖
    </WhisperingButton>
    {#if blobUrl}
      <audio
        style="view-transition-name: {createRecordingViewTransitionName({
          recordingId: latestRecording.id,
          propertyName: 'blob',
        })}"
        src={blobUrl}
        controls
        class="h-8 w-full"
      ></audio>
    {/if}
  </div>

  <NavItems class="xs:flex -mb-2.5 -mt-1 hidden" />

  <div class="xs:flex hidden flex-col items-center gap-3">
    <p class="text-foreground/75 text-center text-sm">
      Click the microphone or press
      {' '}<WhisperingButton
        tooltipContent="Go to local shortcut in settings"
        href="/settings#local-shortcut"
        variant="link"
        size="inline"
      >
        <kbd
          class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-sm font-semibold"
        >
          {settings.value['shortcuts.currentLocalShortcut']}
        </kbd>
      </WhisperingButton>{' '}
      to start recording here.
    </p>
    {#if window.__TAURI_INTERNALS__}
      <p class="text-foreground/75 text-sm">
        Press
        {' '}<WhisperingButton
          tooltipContent="Go to global shortcut in settings"
          href="/settings#global-shortcut"
          variant="link"
          size="inline"
        >
          <kbd
            class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-sm font-semibold"
          >
            {settings.value['shortcuts.currentGlobalShortcut']}
          </kbd>
        </WhisperingButton>{' '}
        to start recording anywhere.
      </p>
    {/if}
    <p class="text-muted-foreground text-center text-sm font-light">
      Check out the {' '}<WhisperingButton
        tooltipContent="Check out the Chrome Extension"
        href="https://chromewebstore.google.com/detail/whispering/oilbfihknpdbpfkcncojikmooipnlglo"
        target="_blank"
        rel="noopener noreferrer"
        variant="link"
        size="inline"
      >
        extension
      </WhisperingButton>{' '}
      {#if !window.__TAURI_INTERNALS__}
        and {' '}<WhisperingButton
          tooltipContent="Check out the desktop app"
          href="https://github.com/braden-w/whispering/releases"
          target="_blank"
          rel="noopener noreferrer"
          variant="link"
          size="inline"
        >
          app
        </WhisperingButton>{' '}
      {/if} for more integrations!
    </p>
  </div>
</main>