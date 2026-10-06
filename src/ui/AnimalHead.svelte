<script lang="ts">
  import type { AnimalId } from '../engine/config';
  let { animal, alt = '' }: { animal: AnimalId; alt?: string } = $props();
  let fallback = $state(false);
  const base = $derived(`${import.meta.env.BASE_URL}assets/portrait-${animal}`);
</script>

<picture class="animal-head">
  {#if !fallback}<source type="image/webp" srcset={`${base}@1x.webp 1x, ${base}@2x.webp 2x`} />{/if}
  <img
    src={`${base}@1x.png`}
    srcset={`${base}@1x.png 1x, ${base}@2x.png 2x`}
    {alt}
    onerror={() => (fallback = true)}
  />
</picture>
