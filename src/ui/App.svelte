<script lang="ts">
  import { onMount } from 'svelte';
  import { Game, type RaceRecord } from '../engine/round';
  import { ANIMALS, CHALLENGES, CONFIG, type AnimalId } from '../engine/config';
  import { type BetType } from '../engine/bets';
  import type { RenderOptions, RenderMetrics } from '../render/types';
  import Icon from './Icon.svelte';
  import StageHUD from './StageHUD.svelte';
  import OddsBoard from './OddsBoard.svelte';
  import ChipTray from './ChipTray.svelte';
  import BetSlip from './BetSlip.svelte';
  import Wallet from './Wallet.svelte';
  import HistoryColumn from './HistoryColumn.svelte';
  import { GameAudio } from '../audio/audio';
  const game = new Game(),
    audio = new GameAudio();
  const storageKey = 'jungle-esports-v2';
  let view = $state(game.view()),
    chip = $state(100),
    modal = $state<'rules' | 'stats' | 'settings' | null>(null),
    toast = $state(''),
    ready = $state(false),
    error = $state(''),
    soundOn = $state(false),
    reducedMotion = $state(false),
    paused = $state(false),
    theater = $state(false),
    fullscreen = $state(false),
    drawerOpen = $state(true),
    fullscreenHint = $state(''),
    metrics = $state<RenderMetrics>({ drawCalls: 0, frameMS: 0, resolution: 1 });
  let preview = $state<{ challenge: AnimalId; time: number; key: number } | null>(null);
  let previewKey = 0;
  let previewReady = $state(false);
  function previewChallenge(id: AnimalId) {
    preview = { challenge: id, time: 0, key: ++previewKey };
    paused = false;
  }
  const debug = new URL(window.location.href).searchParams.has('debug');
  let stageWrapper: HTMLDivElement;
  let stageFocus: HTMLElement | null = null;
  let canvasHost: HTMLDivElement;
  let toastTimer: ReturnType<typeof setTimeout>, renderOptions: RenderOptions;
  let installPrompt: {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  } | null = $state(null);
  const challenge = $derived(CHALLENGES[view.replayRecord?.challenge ?? view.round.challenge]);
  const seconds = $derived(Math.max(0, CONFIG.bettingSeconds - view.round.elapsed));
  const day = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(game.save()));
    } catch {
      /* Storage can be disabled; the session remains playable. */
    }
  };
  function dialogFocus(node: HTMLElement) {
    const previous = document.activeElement as HTMLElement | null;
    const targets = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]'),
      );
    targets()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = targets(),
        first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    node.addEventListener('keydown', trap);
    return {
      destroy: () => {
        node.removeEventListener('keydown', trap);
        previous?.focus();
      },
    };
  }
  function sync() {
    view = game.view();
  }
  function notify(message: string) {
    toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 4000);
  }
  function action(fn: () => void) {
    try {
      fn();
      audio.play('chip');
      persist();
      sync();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  }
  function bet(type: BetType, picks: AnimalId[]) {
    action(() => game.place(type, picks, chip));
  }
  function replay(record: RaceRecord) {
    action(() => game.startReplay(record));
  }
  async function toggleSound() {
    if (soundOn) {
      audio.toggle();
      soundOn = false;
    } else {
      await audio.unlock();
      soundOn = true;
    }
    try {
      localStorage.setItem('jungle-esports-sound', String(soundOn));
    } catch {
      /* optional preference */
    }
  }
  function setMotion(value: boolean) {
    reducedMotion = value;
    if (renderOptions) renderOptions.reducedMotion = value;
    try {
      localStorage.setItem('jungle-esports-motion', String(value));
    } catch {
      /* optional preference */
    }
  }
  $effect(() => {
    audio.setPhase(preview ? 'race' : view.displayPhase);
    if (paused || modal) audio.pause();
    else audio.resume();
  });
  $effect(() => {
    document.body.classList.toggle('stage-expanded', theater);
    return () => document.body.classList.remove('stage-expanded');
  });
  async function toggleTheater() {
    const leave = theater || !!document.fullscreenElement;
    if (document.fullscreenElement) await document.exitFullscreen();
    if (!leave) stageFocus = document.activeElement as HTMLElement;
    theater = !leave;
    if (!theater) stageFocus?.focus();
  }
  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    stageFocus = document.activeElement as HTMLElement;
    theater = true;
    try {
      if (!stageWrapper.requestFullscreen) throw new Error('Element fullscreen unavailable');
      await stageWrapper.requestFullscreen();
      const orientation = window.screen.orientation as typeof window.screen.orientation & {
        lock?: (value: string) => Promise<void>;
      };
      await orientation.lock?.('landscape').catch(() => {});
    } catch {
      fullscreenHint = /iPhone|iPad|iPod/.test(navigator.userAgent)
        ? 'Theater view · Add to Home Screen for fullscreen on iPhone.'
        : 'Theater view · Your browser does not support element fullscreen.';
    }
  }
  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    }
  }
  onMount(() => {
    try {
      const saved = localStorage.getItem(storageKey) ?? localStorage.getItem('jungle-esports-v1');
      if (saved && !game.restore(JSON.parse(saved)))
        notify('Saved game could not be loaded. A fresh jungle awaits.');
      reducedMotion =
        localStorage.getItem('jungle-esports-motion') === 'true' ||
        (localStorage.getItem('jungle-esports-motion') === null &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      notify('This session will play without saved progress.');
    }
    sync();
    let destroy: (() => void) | undefined,
      cancelled = false,
      uiElapsed = 0,
      saveElapsed = 0,
      lastBeep = -1,
      challengeSoundRound = -1,
      pawClock = 0;
    renderOptions = {
      reducedMotion,
      preview: () => preview,
      onPreviewReady: () => (previewReady = true),
      isPaused: () => paused || !!modal,
      onMetrics: (value) => (metrics = value),
      onError: notify,
      onFrame: (delta) => {
        if (paused || modal) return;
        if (preview) {
          if (previewReady) preview.time = (preview.time + delta) % 12;
          return;
        }
        const prevPhase = game.round.phase,
          wasSettled = game.round.settled,
          crossedBefore = game.crossed.length;
        game.tick(delta);
        uiElapsed += delta;
        saveElapsed += delta;
        if (game.round.phase === 'lineup') {
          const count = Math.floor(game.round.elapsed);
          if (count !== lastBeep) {
            audio.play('beep');
            lastBeep = count;
          }
        }
        if (game.round.phase !== prevPhase) {
          persist();
          if (game.round.phase === 'race') {
            audio.play('go');
            stageWrapper.scrollIntoView({
              block: 'start',
              behavior: reducedMotion ? 'instant' : 'smooth',
            });
          }
          if (game.round.phase === 'podium') {
            audio.play('fanfare');
            audio.play('cheer');
          }

          if (game.round.phase === 'betting') {
            drawerOpen = true;
            lastBeep = -1;
            challengeSoundRound = -1;
            pawClock = 0;
          }
        }
        if (
          game.round.phase !== prevPhase ||
          wasSettled !== game.round.settled ||
          crossedBefore !== game.crossed.length
        ) {
          sync();
          persist();
        }
        if (!wasSettled && game.round.settled) audio.play('coin');
        pawClock += delta;
        if (game.round.phase === 'race' && pawClock > 0.32) {
          audio.play('paws');
          pawClock = 0;
        }
        if (
          game.round.phase === 'race' &&
          game.choreography &&
          game.choreography.curves[game.round.challenge].sample(game.round.raceTime).x >
            CONFIG.trackLength * 0.4 &&
          challengeSoundRound !== game.round.id
        ) {
          audio.play(['rock', 'mud', 'whoosh', 'whoosh', 'mud'][game.round.challenge]);
          challengeSoundRound = game.round.id;
        }
        if (uiElapsed > 0.08) {
          sync();
          uiElapsed = 0;
        }
        if (saveElapsed > 1) {
          persist();
          saveElapsed = 0;
        }
      },
    };
    const host = canvasHost;
    const renderer =
      import.meta.env.DEV && new URL(window.location.href).searchParams.get('renderer') === '3d'
        ? import('../render3d/app')
        : import('../render/app');
    void renderer
      .then(({ createRenderer }) =>
        cancelled ? undefined : createRenderer(host, game, renderOptions),
      )
      .then((cleanup) => {
        if (!cleanup) return;
        if (cancelled) cleanup();
        else {
          destroy = cleanup;
          ready = true;
          persist();
        }
      })
      .catch((e) => {
        if (cancelled) return;
        error =
          'The jungle renderer could not start. Check that hardware acceleration is enabled, then reload.';
        console.error(e);
      });
    const onVisibility = () => {
      persist();
      if (document.hidden) audio.pause();
      else audio.resume();
    };
    const onLeave = () => persist();
    const onInstall = (event: Event) => {
      event.preventDefault();
      installPrompt = event as unknown as typeof installPrompt;
    };
    const onFirstInteraction = () => {
      try {
        if (localStorage.getItem('jungle-esports-sound') === 'true')
          void audio.unlock().then(() => (soundOn = true));
      } catch {
        /* optional preference */
      }
    };
    const onFullscreen = () => {
      fullscreen = !!document.fullscreenElement;
      if (!fullscreen) {
        theater = false;
        window.screen.orientation?.unlock?.();
        stageFocus?.focus();
      }
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeinstallprompt', onInstall);
    document.addEventListener('pointerdown', onFirstInteraction, { once: true });
    if (import.meta.env.PROD && 'serviceWorker' in navigator)
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => notify('Offline installation is unavailable in this browser.'));
    return () => {
      cancelled = true;
      destroy?.();
      audio.destroy();
      clearTimeout(toastTimer);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeinstallprompt', onInstall);
      document.removeEventListener('pointerdown', onFirstInteraction);
    };
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      modal = null;
      if (theater && !document.fullscreenElement) {
        theater = false;
        stageFocus?.focus();
      }
    }
    if (
      modal ||
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      (e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable]')
    )
      return;
    if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      void toggleTheater();
    }
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      void toggleFullscreen();
    }
  }}
/>
<div class="app-shell">
  <header class="site-header">
    <a class="brand" href={import.meta.env.BASE_URL} aria-label="Jungle Esports home"
      ><div class="brand-symbol"><Icon name="leaf" size={29} /></div>
      <div>JUNGLE<span>ESPORTS</span></div></a
    >
    <nav class="header-nav" aria-label="Game information">
      <button
        class="icon-button"
        aria-label="How to play"
        title="How to play"
        onclick={() => (modal = 'rules')}><Icon name="info" /></button
      >
      <button
        class="icon-button"
        aria-label="Statistics"
        title="Statistics"
        onclick={() => (modal = 'stats')}><Icon name="stats" /></button
      >
    </nav>
    <div class="header-right">
      <Wallet
        balance={view.balance}
        animate={view.round.settled}
        onrefill={() => action(() => game.refill(day()))}
        canRefill={view.canBet && view.stake === 0 && view.refillDate !== day()}
      /><button
        class="icon-button sound-button"
        aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
        title={soundOn ? 'Mute sound' : 'Enable sound'}
        onclick={toggleSound}><Icon name={soundOn ? 'sound' : 'muted'} /></button
      ><button
        class="icon-button"
        aria-label="Settings"
        title="Settings"
        onclick={() => (modal = 'settings')}><Icon name="settings" /></button
      >
    </div>
  </header>
  <main>
    <div class="arena-grid">
      <section class="track-column" aria-label="Race and betting board">
        <div class="arena-frame" class:theater bind:this={stageWrapper}>
          <div
            class="race-stage"
            data-phase={preview ? 'preview' : view.displayPhase}
            class:race-running={['race', 'finish'].includes(view.displayPhase)}
          >
            <div class="race-canvas" bind:this={canvasHost}></div>
            {#if !ready}<div class="loading-screen">
                <Icon name="leaf" size={38} /><strong>{error || 'Waking up the jungle…'}</strong
                >{#if error}<button class="primary-button" onclick={() => window.location.reload()}
                    >Reload</button
                  >{/if}
              </div>{/if}
            {#if !preview && view.displayPhase === 'betting'}
              <div class="course-tile" title={challenge.name} aria-label={challenge.name}>
                <span aria-hidden="true">{challenge.icon}</span>{challenge.short.split(' ')[0]}
              </div>
            {/if}
            {#if !preview && view.displayPhase === 'lineup'}<div class="lineup-count" role="status">
                {Math.max(1, 3 - Math.floor(view.round.elapsed))}
              </div>{/if}
            {#if !preview && ['betting', 'result', 'podium'].includes(view.displayPhase)}
              <HistoryColumn
                history={view.history}
                onreplay={replay}
                canReplay={ready && !view.replaying}
              />
            {/if}
            {#if ready}<div class="stage-view-controls">
                <button
                  aria-label={theater ? 'Exit theater' : 'Theater mode'}
                  aria-pressed={theater}
                  title="Theater (T)"
                  onclick={() => void toggleTheater()}><Icon name="theater" /></button
                >
                <button
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  title="Fullscreen (F)"
                  onclick={() => void toggleFullscreen()}
                  ><Icon name={fullscreen ? 'minimize' : 'fullscreen'} /></button
                >
                {#if theater && view.canBet}<button
                    aria-expanded={drawerOpen}
                    aria-label="Toggle betting drawer"
                    title="Toggle betting drawer"
                    onclick={() => (drawerOpen = !drawerOpen)}><Icon name="slip" /></button
                  >{/if}
              </div>
              {#if theater}<div class="rotate-hint">Rotate your phone for a wider track.</div>{/if}
              {#if fullscreenHint && theater}<div class="fullscreen-hint">
                  {fullscreenHint}
                </div>{/if}
              {#if debug}<div class="performance-overlay">
                  {metrics.drawCalls} draws · {metrics.frameMS.toFixed(1)} ms · {metrics.resolution.toFixed(
                    2,
                  )}×
                  {#if metrics.triangles !== undefined}<br />{metrics.triangles.toLocaleString()} tris
                    · p50 {metrics.p50?.toFixed(1)} / p95 {metrics.p95?.toFixed(1)} / p99 {metrics.p99?.toFixed(
                      1,
                    )} ms{/if}
                </div>{/if}
              {#if !preview && theater && view.canBet && drawerOpen}<StageHUD
                  balance={view.balance}
                  weights={view.weights}
                  stake={view.stake}
                  {chip}
                  enabled={ready && !paused && !modal && !preview}
                  onchip={(value) => (chip = value)}
                  onbet={bet}
                  onstart={() => action(() => game.lock())}
                  onundo={() => action(() => game.undo())}
                  onclear={() => action(() => game.clear())}
                />{/if}
              <div class="stage-controls">
                <button
                  aria-label={paused ? 'Resume race' : 'Pause race'}
                  title={paused ? 'Resume race' : 'Pause race'}
                  onclick={() => (paused = !paused)}>{paused ? '▶' : 'Ⅱ'}</button
                >{#if view.replaying}<button
                    aria-label="Stop replay"
                    title="Stop replay"
                    onclick={() => action(() => (game.replay = null))}><Icon name="close" /></button
                  >{/if}
              </div>{/if}{#if !preview && view.displayPhase === 'betting' && !view.replaying}<div
                class="countdown-badge"
              >
                <b aria-label={`${Math.ceil(seconds)} seconds remaining`}>{Math.ceil(seconds)}</b>
                <div class="timer-ring" style={`--progress:${(seconds / 20) * 100}%`}></div>
              </div>{/if}
          </div>
        </div>
        <nav class="challenge-previews" aria-label="Challenge previews">
          <span
            >{preview
              ? `Preview · ${CHALLENGES[preview.challenge].short}`
              : 'Preview a challenge'}</span
          >
          <div>
            {#each CHALLENGES as course}<button
                disabled={!ready}
                aria-pressed={preview?.challenge === course.id}
                onclick={() => previewChallenge(course.id)}>{course.short}</button
              >{/each}
            {#if preview}<button class="return-to-race" onclick={() => (preview = null)}
                >Back to race</button
              >{/if}
          </div>
        </nav>
        <div class="betting-board">
          <div class="board-heading">
            <div class="bet-tabs" role="group" aria-label="Bet type">
              <span class="active winner-label">Winner</span>
            </div>
          </div>
          <OddsBoard
            weights={view.weights}
            forms={view.round.forms}
            home={view.round.challenge}
            enabled={ready && view.canBet && !modal && !paused && !preview}
            bets={view.round.bets}
            onbet={bet}
          />
          <ChipTray
            {chip}
            enabled={ready && view.canBet && !paused && !preview}
            hasBets={view.round.bets.length > 0}
            canRepeat={view.lastBets.length > 0}
            onchip={(value) => (chip = value)}
            onundo={() => action(() => game.undo())}
            onclear={() => action(() => game.clear())}
            onrepeat={() => action(() => game.repeat())}
          />
        </div>
      </section>
      <BetSlip
        bets={view.round.bets}
        stake={view.stake}
        maxReturn={view.maxReturn}
        phase={view.round.phase}
        replaying={view.replaying}
        blocked={!ready || paused || !!preview}
        payout={view.round.payout}
        onstart={() => action(() => game.lock())}
        onnext={() => action(() => game.nextRound())}
      />
    </div>
    <footer>Virtual coins only · <button onclick={() => (modal = 'rules')}>Rules</button></footer>
  </main>
</div>
{#if toast}<div class="toast" role="status">
    {toast}<button aria-label="Dismiss notification" onclick={() => (toast = '')}
      ><Icon name="close" size={15} /></button
    >
  </div>{/if}
{#if modal}<div
    class="modal-backdrop"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) modal = null;
    }}
  >
    <div
      class="modal"
      use:dialogFocus
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <button
        class="modal-close icon-button"
        aria-label="Close dialog"
        onclick={() => (modal = null)}><Icon name="close" /></button
      >
      {#if modal === 'rules'}<span class="eyebrow">WELCOME TO THE JUNGLE</span>
        <h2 id="modal-title">Trust your wild side.</h2>
        <p>
          Choose a chip and tap a racer’s odds. Winner pays when your chosen animal finishes first.
        </p>
        <div class="rules-steps">
          <div>
            <b>01</b><strong>Read the terrain.</strong>
            <p>
              One racer gets a 2.5× strength advantage. Form changes strength too: Tired ×0.8,
              Normal ×1, Hyped ×1.25.
            </p>
          </div>
          <div>
            <b>02</b><strong>Place your chips.</strong>
            <p>
              You have 20 seconds. Undo, clear, or repeat your last slip. Odds include your stake
              back.
            </p>
          </div>
          <div>
            <b>03</b><strong>Chase the crown.</strong>
            <p>
              All five places are drawn before the race, using the displayed strengths. Replays show
              the same result.
            </p>
          </div>
        </div>
        <p class="rules-note">
          Odds are calculated from exact Plackett–Luce probabilities with a 95% target return,
          rounded down. Each Winner selection accepts up to 5,000 coins. A slip can return at most
          20,000 coins. Virtual coins have no cash value or cash-out.
        </p>
        <p class="rules-note">
          Start with 10,000 coins. A free daily refill is available below 1,000, once your slip is
          empty. Your balance, active race and history are saved in this browser. Timers pause when
          the tab is hidden, while this dialog is open, or when you press pause.
        </p>
        <button class="primary-button" onclick={() => (modal = null)}
          >Let’s get wild <Icon name="arrow" /></button
        >
      {:else if modal === 'stats'}<span class="eyebrow">THE JUNGLE KEEPS SCORE</span>
        <h2 id="modal-title">Statistics · #{String(view.round.id).padStart(4, '0')}</h2>
        <p>
          Wins by terrain across all completed races in this browser. History keeps 20 races; these
          totals keep growing.
        </p>
        <div class="stats-table-wrap">
          <table class="stats-table">
            <thead
              ><tr
                ><th>Terrain</th>{#each ANIMALS as a}<th style={`color:${a.color}`}>{a.species}</th
                  >{/each}</tr
              ></thead
            ><tbody
              >{#each CHALLENGES as c}<tr
                  ><th>{c.icon} {c.short}</th>{#each ANIMALS as a}<td
                      class:home-stat={a.id === c.home}>{view.statistics[c.id][a.id]}</td
                    >{/each}</tr
                >{/each}</tbody
            >
          </table>
        </div>
        <p class="rules-note">
          Home turf is highlighted. With few races, random results can differ widely from the stated
          probabilities.
        </p>
        <div class="replay-list">
          {#each view.history as record}<button
              disabled={view.replaying}
              onclick={() => {
                modal = null;
                replay(record);
              }}
              ><span
                >#{record.id} · {ANIMALS[record.order[0]].species}
                <small>{CHALLENGES[record.challenge].short}</small></span
              ><Icon name="play" size={16} /></button
            >{/each}
        </div>
      {:else}<span class="eyebrow">YOUR JUNGLE, YOUR WAY</span>
        <h2 id="modal-title">Set the atmosphere.</h2>
        <div class="setting-row">
          <div>
            <strong>Sound</strong>
          </div>
          <button
            class:enabled={soundOn}
            class="toggle"
            role="switch"
            aria-checked={soundOn}
            aria-label="Jungle audio"
            onclick={toggleSound}><i></i></button
          >
        </div>
        <div class="setting-row">
          <div>
            <strong>Reduced motion</strong>
          </div>
          <button
            class:enabled={reducedMotion}
            class="toggle"
            role="switch"
            aria-checked={reducedMotion}
            aria-label="Reduced motion"
            onclick={() => setMotion(!reducedMotion)}><i></i></button
          >
        </div>
        {#if installPrompt}<button class="primary-button" onclick={install}
            ><Icon name="download" /> Install Jungle Esports</button
          >{:else}<p class="rules-note">
            Install from your browser’s menu to keep the jungle nearby. After the first complete
            load, the game also works offline.
          </p>{/if}
        <p class="rules-note">
          Sound starts after you enable it. No accounts, purchases, or cash-out.
        </p>{/if}
    </div>
  </div>{/if}
