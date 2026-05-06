<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { goto } from '$app/navigation';

  let q = $state('');

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    await goto(`/search?q=${encodeURIComponent(q.trim())}`);
  }
</script>

<form {onsubmit} class="hidden sm:block w-64">
  <Input name="q" placeholder="Search…" bind:value={q} />
</form>
