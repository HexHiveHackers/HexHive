<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  let { form } = $props();
</script>

<section class="mx-auto max-w-md px-4 py-16">
  <h1 class="font-display text-2xl mb-6">Pick a username</h1>
  <p class="text-sm text-muted-foreground mb-6">
    Used in your profile URL: <code>/u/your-username</code>. Letters, numbers, dots, dashes,
    underscores, and pluses only.
  </p>
  <form method="post" class="grid gap-4">
    <div class="grid gap-1.5">
      <Label for="username">Username</Label>
      <Input id="username" name="username" required />
    </div>
    {#if form?.error}<p class="text-sm text-destructive">{form.error}</p>{/if}
    <Button type="submit">Save</Button>
  </form>
</section>
