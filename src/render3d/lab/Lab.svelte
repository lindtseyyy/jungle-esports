<script lang="ts">
  import { onMount } from 'svelte';
  import { Game } from '../../engine/round';
  import { seededRandom } from '../../engine/rng';
  import { createRenderer, type LabState } from '../app';
  import type { RenderMetrics } from '../../render/types';
  let host: HTMLDivElement;
  const lab = $state<LabState>({
    time: 0,
    speed: 1,
    paused: true,
    wireframe: false,
    bones: false,
    turntable: false,
    trails: false,
    closeup: false,
    clip: 'gallop',
  });
  let metrics = $state<RenderMetrics>({ drawCalls: 0, frameMS: 0, resolution: 1 });
  let error = $state(''),
    ready = $state(false);
  onMount(() => {
    let disposed = false,
      cleanup: (() => void) | undefined;
    void createRenderer(
      host,
      new Game(seededRandom(31), () => 31),
      {
        reducedMotion: false,
        isPaused: () => false,
        onFrame: () => {},
        onMetrics: (value) => (metrics = value),
        onError: (value) => (error = value),
      },
      lab,
    )
      .then((destroy) => {
        if (disposed) destroy();
        else {
          cleanup = destroy;
          ready = true;
        }
      })
      .catch((e) => (error = String(e)));
    return () => {
      disposed = true;
      cleanup?.();
    };
  });
</script>

<main class="review-lab">
  <header>
    <div>
      <p>PLAN V3 · G1</p>
      <h1>Style & camera review</h1>
    </div>
    <a href="/">Back to game</a>
  </header>
  <p class="review-note">
    Lion blockout on the base course. Review the warm light, cool shadows, volume, scale and camera
    angle. Model detail and ground-contact animation are the next gate; the other four animals are
    grey proxies in the game preview.
  </p>
  <div class="review-comparison">
    <section aria-label="Live 3D style frame">
      <div class="review-stage" bind:this={host}></div>
      <p>{ready ? 'Live game renderer · G1 blockout' : 'Loading 3D preview…'}</p>
    </section>
    <section aria-label="Reference">
      <img
        src="/reference_video/stills/180s-gallop-lanes.jpg"
        alt="Reference cabinet: large 3D animals in tight overlapping lanes"
      />
      <p>Reference · scale, lane overlap and camera language</p>
    </section>
  </div>
  {#if error}<p role="alert">{error}</p>{/if}
  <div class="review-controls">
    <button disabled={!ready} onclick={() => (lab.paused = !lab.paused)}
      >{lab.paused ? 'Play' : 'Pause'}</button
    >
    <label
      >Clip <select bind:value={lab.clip}
        ><option value="gallop">Placeholder gallop</option><option value="idle">Idle</option
        ></select
      ></label
    >
    <label
      >Speed <input
        type="range"
        min="0.1"
        max="2"
        step="0.1"
        bind:value={lab.speed}
      />{lab.speed.toFixed(1)}×</label
    >
    <label
      >Time <input
        type="range"
        min="0"
        max="12"
        step="0.01"
        bind:value={lab.time}
        oninput={() => (lab.paused = true)}
      /></label
    >
    <label><input type="checkbox" bind:checked={lab.turntable} />Turntable</label>
    <label><input type="checkbox" bind:checked={lab.closeup} />Close-up</label>
    <label><input type="checkbox" bind:checked={lab.wireframe} />Wireframe</label>
    <label><input type="checkbox" bind:checked={lab.bones} />Bones</label>
    <label><input type="checkbox" bind:checked={lab.trails} />Motion trails</label>
  </div>
  <p class="review-metrics" data-testid="review-metrics">
    {metrics.drawCalls} draws · {metrics.triangles?.toLocaleString() ?? '—'} triangles · p50 {metrics.p50?.toFixed(
      1,
    ) ?? '—'} / p95 {metrics.p95?.toFixed(1) ?? '—'} / p99 {metrics.p99?.toFixed(1) ?? '—'} ms
  </p>
  <p>
    G1 pending: approve the look and camera before detailed modeling. G2 will cover the continuous
    skin, authored gait, foot IK, coat textures and secondary motion. Performance approval needs a
    run on the target laptop, using the numbers above.
  </p>
  <a href="/?renderer=3d&debug">Open the development game stage</a>
</main>

<style>
  .review-lab {
    max-width: 1600px;
    margin: auto;
    padding: 28px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }
  header p {
    color: #bddf7b;
    letter-spacing: 0.15em;
    font-size: 12px;
  }
  h1 {
    font-size: 28px;
  }
  p {
    line-height: 1.6;
    font-size: 14px;
    color: #b4c5b9;
  }
  a {
    color: #bddf7b;
    text-decoration: underline;
  }
  .review-note {
    max-width: 1000px;
    margin-bottom: 20px;
  }
  .review-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .review-stage,
  .review-comparison img {
    width: 100%;
    aspect-ratio: 16/9;
    display: block;
    background: #1b3026;
    overflow: hidden;
    border-radius: 12px;
  }
  .review-stage :global(canvas) {
    display: block;
  }
  .review-comparison img {
    object-fit: cover;
  }
  .review-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
    padding: 20px 0;
  }
  label {
    display: flex;
    gap: 7px;
    align-items: center;
    font-size: 13px;
  }
  button,
  select {
    padding: 8px 12px;
    background: #2d4835;
    border-radius: 6px;
    border: 1px solid #527359;
    color: #e9eddf;
  }
  .review-metrics {
    color: #bddf7b;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 950px) {
    .review-comparison {
      grid-template-columns: 1fr;
    }
    .review-lab {
      padding: 16px;
    }
  }
</style>
