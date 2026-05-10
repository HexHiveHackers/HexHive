<script lang="ts">
  import { SiDiscord } from '@icons-pack/svelte-simple-icons';

  const year = new Date().getFullYear();
  const DISCORD_URL = 'https://discord.gg/YSVdnqjHE';
</script>

<footer class="border-t mt-16">
  <div class="mx-auto max-w-3xl px-4 py-10 text-xs text-muted-foreground space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <p class="font-display tracking-wider text-foreground">© {year} HexHive</p>
      <nav class="flex items-center gap-4">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 transition-colors hover:text-[#5865F2]"
          aria-label="Join HexHive on Discord"
        >
          <SiDiscord size={14} title="Join HexHive on Discord" />
          Discord
        </a>
        <a href="/privacy" class="hover:text-foreground hover:underline">Privacy</a>
        <a href="/terms" class="hover:text-foreground hover:underline">Terms</a>
      </nav>
    </div>

    <p>
      Pokémon, Nintendo, Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS are trademarks
      of their respective owners. HexHive is an independent fan project and is not affiliated with,
      endorsed, or sponsored by Nintendo, The Pokémon Company, or GAME FREAK. Please support them by
      purchasing their most recent games.
    </p>

    <p>
      We host patch files and other ROM-hack assets, never the underlying ROMs themselves. Bring
      your own legally-obtained ROM, then apply patches with the tools of your choice on your own
      device.
    </p>

    <p>
      Some hardware-glyph icons by
      <a
        href="https://icons8.com"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-foreground hover:underline"
      >Icons8</a>.
    </p>
  </div>
</footer>
