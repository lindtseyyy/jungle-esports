<script lang="ts">
  import { ANIMALS } from '../engine/config';
  import type { Bet } from '../engine/bets';
  import type { Phase } from '../engine/round';
  import Icon from './Icon.svelte';
  import AnimalHead from './AnimalHead.svelte';
  let {
    bets,
    stake,
    maxReturn,
    phase,
    replaying,
    blocked,
    payout,
    onstart,
    onnext,
  }: {
    bets: Bet[];
    stake: number;
    maxReturn: number;
    phase: Phase;
    replaying: boolean;
    blocked: boolean;
    payout: number;
    onstart: () => void;
    onnext: () => void;
  } = $props();
  const names = { win: 'Winner', place: 'Top 2', exacta: 'Exacta', quinella: 'Quinella' };
  const fmt = (cents: number) =>
    (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const grouped = $derived(
    bets.reduce((rows: Bet[], bet) => {
      const prev = rows.find((b) => b.type === bet.type && b.picks.join() === bet.picks.join());
      if (prev) prev.stake += bet.stake;
      else rows.push({ ...bet, picks: [...bet.picks] });
      return rows;
    }, []),
  );
</script>

<aside class="bet-slip">
  <div class="slip-bets">
    {#if grouped.length === 0}<div class="empty-slip">
        <Icon name="slip" size={32} />
        <p>Tap odds to bet</p>
      </div>{:else}{#each grouped as bet}<div class="slip-bet">
          <div class="slip-bet-avatar" style={`--animal-color:${ANIMALS[bet.picks[0]].color}`}>
            <AnimalHead animal={bet.picks[0]} />
          </div>
          <div class="slip-bet-name">
            <strong
              >{bet.picks
                .map((i) => ANIMALS[i].species)
                .join(bet.type === 'exacta' ? ' → ' : ' + ')}</strong
            ><span>{names[bet.type]} <i>×{bet.odds.toFixed(2)}</i></span>
          </div>
          <b>{bet.stake.toLocaleString()}</b>
        </div>{/each}{/if}
  </div>
  <div class="slip-summary">
    <div>
      <span>Stake</span><b
        ><img
          src={`${import.meta.env.BASE_URL}assets/coin.svg`}
          alt=""
        />{stake.toLocaleString()}</b
      >
    </div>
    <div class="potential">
      <span>Max return</span><strong>{fmt(maxReturn)} </strong>
    </div>
  </div>
  {#if phase === 'betting'}<button
      class="primary-button race-button"
      disabled={replaying || blocked}
      onclick={onstart}><Icon name="play" size={18} />Start</button
    >
  {:else if phase === 'podium'}<div class="payout-box">
      <strong aria-label="Payout">+{fmt(payout)}</strong>
    </div>
    <button class="primary-button" disabled={replaying || blocked} onclick={onnext}
      >Next race <Icon name="arrow" size={19} /></button
    >{:else}<div class="race-in-progress" aria-label="Bets locked" title="Bets locked">
      <Icon name="lock" size={28} />
    </div>{/if}
</aside>
