<script lang="ts">
  import { ANIMALS, type AnimalId } from '../engine/config';
  import { oddsFor, winProbability } from '../engine/odds';
  import { betWins, type Bet } from '../engine/bets';
  import { standingSheetFor } from '../render/rig/standingSprites';
  let {
    crossed,
    order,
    weights,
    bets,
    settled,
    payout,
    stake,
    podium,
    replaying,
    reducedMotion,
  }: {
    crossed: AnimalId[];
    order: AnimalId[];
    weights: number[];
    bets: Bet[];
    settled: boolean;
    payout: number;
    stake: number;
    podium: boolean;
    replaying: boolean;
    reducedMotion: boolean;
  } = $props();
  const placements = $derived(podium ? order : crossed);
  let count = $state(0);
  let standingPNG = $state(false);
  $effect(() => {
    const target = payout;
    if (!settled) {
      count = 0;
      return;
    }
    if (reducedMotion) {
      count = target;
      return;
    }
    const start = performance.now();
    let frame: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      count = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  });
  const fmt = (value: number) =>
    (value / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
</script>

{#if crossed.length}
  {#if !podium}<div class="winner-card" data-testid="winner-card" role="status">
      <picture>
        {#if !standingPNG}
          <source
            type="image/webp"
            srcset={`${import.meta.env.BASE_URL}assets/${standingSheetFor(crossed[0])}@1x.webp 1x, ${import.meta.env.BASE_URL}assets/${standingSheetFor(crossed[0])}@2x.webp 2x`}
          />
        {/if}
        <img
          src={`${import.meta.env.BASE_URL}assets/${standingSheetFor(crossed[0])}@1x.png`}
          srcset={`${import.meta.env.BASE_URL}assets/${standingSheetFor(crossed[0])}@1x.png 1x, ${import.meta.env.BASE_URL}assets/${standingSheetFor(crossed[0])}@2x.png 2x`}
          alt={`${ANIMALS[crossed[0]].species} standing`}
          onerror={() => (standingPNG = true)}
        />
      </picture>
      <div>
        <strong>{ANIMALS[crossed[0]].species}</strong><small
          >Win ×{oddsFor(winProbability(weights, crossed[0])).toFixed(2)}</small
        >
      </div>
      {#if settled && !replaying}<div class="winner-payout">
          <strong aria-label="Net return"
            >{count - stake * 100 >= 0 ? '+' : '−'}{fmt(Math.abs(count - stake * 100))}</strong
          >
        </div>{/if}
    </div>{/if}
  <div class:ceremony={podium} class="live-results">
    <ol class="placing-strip" aria-label="Live placings">
      {#each [0, 1, 2, 3, 4] as rank}<li class:crossed={placements[rank] !== undefined}>
          <b>{rank + 1}</b><span
            >{placements[rank] === undefined ? '—' : ANIMALS[placements[rank]].species}</span
          >
        </li>{/each}
    </ol>
    {#if !replaying}<div class="bet-results" aria-label="Bet results">
        {#each bets as bet, i}{#if bet.type === 'win' || settled}<span
              class:won={betWins(bet, order)}
              data-testid={`bet-result-${i}`}
              >{bet.picks.map((id) => ANIMALS[id].species).join(' + ')} · {bet.type === 'place'
                ? 'Top 2'
                : bet.type} <b>{betWins(bet, order) ? 'WON' : 'LOST'}</b></span
            >{/if}{/each}
      </div>{/if}
    {#if podium}<div class="round-result" role="status">
        {#if replaying}<span>Replay</span>{:else}<strong aria-label="Net return"
            >{payout - stake * 100 >= 0 ? '+' : '−'}{fmt(Math.abs(payout - stake * 100))}</strong
          >{/if}
      </div>{/if}
  </div>
{/if}
