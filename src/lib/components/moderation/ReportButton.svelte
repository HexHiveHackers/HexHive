<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let { listingId }: { listingId: string } = $props();

	let open = $state(false);
	let kind = $state<'mature' | 'spam' | 'illegal' | 'other'>('mature');
	let reason = $state('');
	let busy = $state(false);
	let err = $state<string | null>(null);
	let ok = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		err = null;
		try {
			const res = await fetch('/api/flags', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ listingId, kind, reason: reason || undefined })
			});
			if (!res.ok) throw new Error(await res.text());
			ok = true;
			open = false;
		} catch (e: unknown) {
			err = e instanceof Error ? e.message : 'Report failed';
		} finally {
			busy = false;
		}
	}
</script>

<Button size="sm" variant="ghost" onclick={() => (open = !open)}>Report</Button>
{#if ok}<span class="ml-2 text-xs text-emerald-700 dark:text-emerald-300">Thanks, we'll review.</span>{/if}

{#if open}
	<form onsubmit={submit} class="mt-3 grid gap-2 border rounded p-3 bg-background">
		<select bind:value={kind} class="border rounded-md px-2 py-1 text-sm">
			<option value="mature">Mature content</option>
			<option value="spam">Spam</option>
			<option value="illegal">Illegal</option>
			<option value="other">Other</option>
		</select>
		<textarea
			bind:value={reason}
			rows="3"
			placeholder="Optional details"
			class="border rounded-md px-2 py-1 text-sm"
		></textarea>
		{#if err}<p class="text-xs text-destructive">{err}</p>{/if}
		<Button size="sm" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>
	</form>
{/if}
