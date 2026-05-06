<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	let { data } = $props();
	const route = (t: string) => (t === 'romhack' ? 'romhacks' : `${t}s`);
</script>

<section class="mx-auto max-w-4xl px-4 py-10">
	<h1 class="font-display text-2xl mb-6">Moderation queue</h1>
	{#if data.flags.length === 0}
		<p class="text-sm text-muted-foreground">No open flags.</p>
	{:else}
		<ul class="grid gap-3">
			{#each data.flags as f}
				<li class="border rounded-lg p-4 grid gap-2">
					<div class="flex items-center justify-between">
						<a href={`/${route(f.listingType)}/${f.listingSlug}`} class="font-medium hover:underline">
							{f.listingTitle}
						</a>
						<Badge variant="outline">{f.kind}</Badge>
					</div>
					{#if f.reason}<p class="text-sm whitespace-pre-line">{f.reason}</p>{/if}
					<div class="flex gap-2">
						<form method="post" action="?/dismiss">
							<input type="hidden" name="flagId" value={f.id} />
							<Button size="sm" variant="ghost" type="submit">Dismiss</Button>
						</form>
						<form method="post" action="?/mature">
							<input type="hidden" name="flagId" value={f.id} />
							<Button size="sm" variant="outline" type="submit">Mark mature</Button>
						</form>
						<form method="post" action="?/hide">
							<input type="hidden" name="flagId" value={f.id} />
							<Button size="sm" variant="destructive" type="submit">Hide listing</Button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
