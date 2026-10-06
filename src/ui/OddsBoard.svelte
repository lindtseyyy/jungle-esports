<script lang="ts">
  import { ANIMALS, CHALLENGES, type AnimalId, type Form } from '../engine/config';
  import { winProbability, oddsFor } from '../engine/odds';
  import { type BetType, type Bet } from '../engine/bets';
  let {
    weights,
    forms,
    home,
    enabled,
    bets,
    onbet,
  }: {
    weights: number[];
    forms: Form[];
    home: AnimalId;
    enabled: boolean;
    bets: Bet[];
    onbet: (type: BetType, picks: AnimalId[]) => void;
  } = $props();
  import AnimalHead from './AnimalHead.svelte';
  const asset = import.meta.env.BASE_URL + 'assets/';
  const amount = (id: AnimalId) =>
    bets.filter((b) => b.picks.includes(id)).reduce((s, b) => s + b.stake, 0);
</script>

<div class="odds-board">
  {#each ANIMALS as animal}
    <article
      class:home={animal.id === home}
      class:backed={amount(animal.id) > 0}
      class="animal-card"
      style={`--animal-color:${animal.color}`}
    >
      <div class="card-top">
        {#if animal.id === home}<span
            class="terrain-tag"
            title={CHALLENGES[home].name}
            aria-label={`Home terrain: ${CHALLENGES[home].name}`}>{CHALLENGES[home].icon}</span
          >{/if}<img
          class="form-icon"
          src={`${asset}${forms[animal.id].toLowerCase()}.svg`}
          alt={`${forms[animal.id]} form`}
          title={`${forms[animal.id]} form`}
        />
      </div>
      <button
        class="portrait-button"
        aria-label={`Bet Winner on ${animal.species}`}
        disabled={!enabled}
        onclick={() => onbet('win', [animal.id])}
        ><div class="portrait-ring"><AnimalHead animal={animal.id} /></div>
        <strong>{animal.species}</strong></button
      >
      <div class="odds-buttons">
        <button
          class="active"
          disabled={!enabled}
          aria-label={`Winner ${animal.species} at ${oddsFor(winProbability(weights, animal.id)).toFixed(2)}`}
          onclick={() => onbet('win', [animal.id])}
          ><span>WINNER</span><b>×{oddsFor(winProbability(weights, animal.id)).toFixed(2)}</b
          ></button
        >
      </div>
      <div class="backed-amount">
        {#if amount(animal.id) > 0}<span aria-label={`${amount(animal.id)} coins placed`}
            >{amount(animal.id).toLocaleString()}</span
          >{/if}
      </div>
    </article>
  {/each}
</div>
