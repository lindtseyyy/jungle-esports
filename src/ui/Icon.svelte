<script lang="ts">
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    theater: 'M3 5h18v14H3V5Zm3 3v8m12-8v8',
    fullscreen: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
    minimize: 'M9 3v6H3m12-6v6h6M3 15h6v6m6 0v-6h6',
    slip: 'M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Z',
    sound: 'M11 5 6 9H3v6h3l5 4V5Zm4 3q5 4 0 8m3-11q8 7 0 14',
    muted: 'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6',
    history: 'M3 11a9 9 0 1 1 3 7M3 4v7h7m2-4v6l4 2',
    info: 'M12 8h.01M12 11v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    stats: 'M4 20V10m8 10V4m8 16v-7',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    undo: 'M4 10h9a6 6 0 0 1 0 12M4 10l5-5M4 10l5 5',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    repeat: 'M3 8h14l-4-4m4 4-4 4M21 16H7l4-4m-4 4 4 4',
    close: 'M6 6l12 12M6 18 18 6',
    play: 'm8 4 12 8-12 8V4Z',
    trophy:
      'M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8',
    leaf: 'M4 20Q-2 4 21 3 23 20 4 20ZM4 20 17 7m-8 9v-5m4 1h5',
    check: 'm5 12 4 4L19 6',
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M9 15v6',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.7"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={paths[name] ?? paths.leaf} /></svg
>
