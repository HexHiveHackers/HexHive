<script lang="ts">
  let { children } = $props();
</script>

<main class="min-h-svh grid place-items-center px-4 py-16 bg-background">
  <div class="w-full max-w-sm">
    {@render children()}
  </div>
</main>
