<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    chip,
    enabled,
    hasBets,
    canRepeat,
    onchip,
    onundo,
    onclear,
    onrepeat,
  }: {
    chip: number;
    enabled: boolean;
    hasBets: boolean;
    canRepeat: boolean;
    onchip: (value: number) => void;
    onundo: () => void;
    onclear: () => void;
    onrepeat: () => void;
  } = $props();
</script>

<div class="chip-tray">
  <div class="chips" role="group" aria-label="Chip value">
    {#each [10, 50, 100, 500, 1000] as value}<button
        class:selected={chip === value}
        class="chip"
        disabled={!enabled}
        aria-label={`${value} coin chip`}
        aria-pressed={chip === value}
        onclick={() => onchip(value)}><span>{value === 1000 ? '1K' : value}</span></button
      >{/each}
  </div>
  <div class="bet-tools">
    <button
      class="icon-button"
      aria-label="Undo last chip"
      title="Undo last chip"
      disabled={!enabled || !hasBets}
      onclick={onundo}><Icon name="undo" size={18} /></button
    ><button
      class="icon-button"
      aria-label="Clear bets"
      title="Clear bets"
      disabled={!enabled || !hasBets}
      onclick={onclear}><Icon name="trash" size={18} /></button
    ><button
      class="icon-button"
      aria-label="Repeat last bets"
      title="Repeat last bets"
      disabled={!enabled || !canRepeat}
      onclick={onrepeat}><Icon name="repeat" size={18} /></button
    >
  </div>
</div>
