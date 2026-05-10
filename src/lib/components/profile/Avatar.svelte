<script lang="ts">
  let { avatarKey, name, size = 48 }: {
    avatarKey: string | null;
    name: string;
    size?: number;
  } = $props();

  const initial = $derived((name || '?').trim().charAt(0).toUpperCase());
</script>

{#if avatarKey}
  <img src={`/api/avatars/${avatarKey.replace(/^avatars\//, '')}`}
       alt={name}
       width={size} height={size}
       class="rounded-full object-cover bg-muted"
       loading="lazy" />
{:else}
  <span class="bg-muted text-muted-foreground inline-grid place-items-center font-display"
        style={`width: ${size}px; height: ${size}px; font-size: ${size / 2.5}px; clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);`}>
    {initial}
  </span>
{/if}
