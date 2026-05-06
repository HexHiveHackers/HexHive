<script lang="ts">
  type Type = 'romhack' | 'sprite' | 'sound' | 'script';
  let { type }: { type: Type } = $props();

  const styles: Record<Type, string> = {
    romhack: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    sprite: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/40',
    sound: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    script: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40'
  };
</script>

<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-display uppercase tracking-wider border rounded {styles[type]}">
  {type}
</span>
