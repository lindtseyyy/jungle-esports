<script lang="ts">
  import Icon from './Icon.svelte';
  import { ANIMALS, type AnimalId } from '../engine/config';
  import { oddsFor, winProbability } from '../engine/odds';
  import type { BetType } from '../engine/bets';
  let {
    balance,
    weights,
    stake,
    chip,
    enabled,
    onchip,
    onbet,
    onstart,
    onundo,
    onclear,
  }: {
    balance: number;
    weights: number[];
    stake: number;
    chip: number;
    enabled: boolean;
    onchip: (value: number) => void;
    onbet: (type: BetType, picks: AnimalId[]) => void;
    onstart: () => void;
    onundo: () => void;
    onclear: () => void;
  } = $props();
  import AnimalHead from './AnimalHead.svelte';
</script>

<div class="stage-hud" data-testid="stage-betting">
  <div class="hud-heading">
    <img src={`${import.meta.env.BASE_URL}assets/coin.svg`} alt="Wallet" /><span
      >{(balance / 100).toLocaleString()}</span
    >
  </div>
  <div class="hud-modes"><span>Winner</span></div>
  <div class="hud-odds">
    {#each ANIMALS as a}<button
        disabled={!enabled}
        style={`--animal-color:${a.color}`}
        aria-label={`Overlay $Winner ${a.species}`}
        onclick={() => onbet('win', [a.id])}
        ><AnimalHead animal={a.id} /><strong>{a.species}</strong><span
          >×{oddsFor(winProbability(weights, a.id)).toFixed(2)}</span
        ></button
      >{/each}
  </div>
  <div class="hud-tools">
    <div class="hud-chips">
      {#each [10, 50, 100, 500, 1000] as value}<button
          class:active={chip === value}
          disabled={!enabled}
          aria-label={`Overlay ${value} coin chip`}
          onclick={() => onchip(value)}>{value}</button
        >{/each}
    </div>
    <span aria-label="Stake">{stake.toLocaleString()}</span><button
      disabled={!enabled || !stake}
      aria-label="Undo last chip"
      title="Undo last chip"
      onclick={onundo}><Icon name="undo" size={16} /></button
    ><button
      disabled={!enabled || !stake}
      aria-label="Clear bets"
      title="Clear bets"
      onclick={onclear}><Icon name="trash" size={16} /></button
    ><button class="primary-button" disabled={!enabled} onclick={onstart}
      ><Icon name="play" size={16} />Start</button
    >
  </div>
</div>
