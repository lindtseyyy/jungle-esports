<script lang="ts">
  import { ANIMALS } from '../engine/config';
  import type { RaceRecord } from '../engine/round';
  import Icon from './Icon.svelte';
  import AnimalHead from './AnimalHead.svelte';
  let {
    history,
    onreplay,
    canReplay,
  }: {
    history: RaceRecord[];
    onreplay: (record: RaceRecord) => void;
    canReplay: boolean;
  } = $props();
</script>

<nav
  style={`--history-count:${Math.min(history.length, 10)}`}
  class="history-column"
  aria-label="Recent champions"
  data-testid="history-column"
>
  <Icon name="history" size={16} />
  {#each history.slice(0, 10) as record, index}
    <button
      class:newest={index === 0}
      disabled={!canReplay}
      aria-label={`Replay race ${record.id}`}
      title={`Round ${record.id} · ${ANIMALS[record.order[0]].species}`}
      onclick={() => onreplay(record)}
    >
      <AnimalHead animal={record.order[0]} alt={ANIMALS[record.order[0]].species} />
      <span class="history-tooltip">Round {record.id} · {ANIMALS[record.order[0]].species}</span>
    </button>
  {/each}
</nav>
