<script lang="ts">
  import { untrack } from 'svelte';
  let {
    balance,
    animate = false,
    onrefill,
    canRefill,
  }: { balance: number; animate?: boolean; onrefill: () => void; canRefill: boolean } = $props();
  let shown = $state(untrack(() => balance));
  $effect(() => {
    const target = balance,
      from = untrack(() => shown);
    if (!animate || target <= from) {
      shown = target;
      return;
    }
    const start = performance.now();
    let frame = 0;
    const count = (now: number) => {
      const progress = Math.min(1, (now - start) / 850);
      shown = Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(count);
    };
    frame = requestAnimationFrame(count);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="wallet">
  <img src={`${import.meta.env.BASE_URL}assets/coin.svg`} alt="" />
  <div>
    <strong data-testid="wallet"
      >{(shown / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong
    >
  </div>
  {#if balance < 100000}<button
      disabled={!canRefill}
      onclick={onrefill}
      title="Free daily refill"
      aria-label="Free daily refill">＋</button
    >{:else}<span class="wallet-plus" title="Virtual coin wallet">✦</span>{/if}
</div>
