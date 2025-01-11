
<script lang="ts">
  import { createPersistedState } from '$lib/utils/createPersistedState.svelte';
  import type { GptMessage } from '$lib/services/gpt/GptService';

  let { messages } = $props<{ messages: GptMessage[] }>();
  
  const lastMessage = $derived(messages[messages.length - 1]);
</script>

<div class="chat-output">
  {#if lastMessage && lastMessage.role === 'assistant'}
    <div class="bot-message">
      <div class="bot-icon">🤖</div>
      <div class="message-content">
        {lastMessage.content}
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-output {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background: var(--background-secondary);
  }

  .bot-message {
    display: flex;
    align-items: start;
    gap: 0.5rem;
  }

  .bot-icon {
    font-size: 1.5rem;
  }

  .message-content {
    flex: 1;
    line-height: 1.5;
  }
</style>
