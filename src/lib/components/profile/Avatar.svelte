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
  <span class="rounded-full bg-muted text-muted-foreground inline-grid place-items-center font-display"
        style={`width: ${size}px; height: ${size}px; font-size: ${size / 2.5}px;`}>
    {initial}
  </span>
{/if}
