<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		id,
		label,
		value,
		placeholder = '',
		disabled = false,
		description,
		...restProps
	}: HTMLTextareaAttributes & {
		label: string;
		value: string;
		placeholder?: string;
		disabled?: boolean;
		description?: string;
	} = $props();
</script>

<Label class="text-sm" for={id}>{label}</Label>
<Textarea {id} bind:value {placeholder} {disabled} {...restProps} />
{#if description}
	<div class="text-muted-foreground text-sm">{description}</div>
{/if}
