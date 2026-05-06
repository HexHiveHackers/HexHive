<script lang="ts">
  let { showing }: { showing: boolean } = $props();
</script>

<label class="flex items-center gap-2 text-sm text-muted-foreground">
  <input type="checkbox" name="mature" value="show" checked={showing}
         onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.submit()} />
  Show mature
</label>
