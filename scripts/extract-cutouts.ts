import sharp from 'sharp';
/** Connected-subject extraction preserves source alpha, including the antialiased silhouette edge. */
export async function extractCutouts(source: string, columns: number, rows: number) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const owner = new Int32Array(info.width * info.height);
  const parts: {
    id: number;
    left: number;
    top: number;
    width: number;
    height: number;
    count: number;
  }[] = [];
  let serial = 0;
  for (let start = 0; start < owner.length; start++) {
    if (owner[start] || data[start * 4 + 3] < 30) continue;
    const id = ++serial,
      todo = [start];
    owner[start] = id;
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0,
      count = 0;
    while (todo.length) {
      const i = todo.pop()!,
        x = i % info.width,
        y = Math.floor(i / info.width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      count++;
      for (const j of [i - 1, i + 1, i - info.width, i + info.width]) {
        if (
          j < 0 ||
          j >= owner.length ||
          owner[j] ||
          data[j * 4 + 3] < 30 ||
          Math.abs((j % info.width) - x) > 1
        )
          continue;
        owner[j] = id;
        todo.push(j);
      }
    }
    if (count > 1000)
      parts.push({ id, left, top, width: right - left + 1, height: bottom - top + 1, count });
  }
  if (parts.length !== columns * rows)
    throw new Error(`${source}: expected ${columns * rows} cutouts, got ${parts.length}`);
  parts.sort((a, b) => a.top + a.height / 2 - (b.top + b.height / 2));
  const ordered = Array.from({ length: rows }, (_, row) =>
    parts
      .slice(row * columns, (row + 1) * columns)
      .sort((a, b) => a.left + a.width / 2 - (b.left + b.width / 2)),
  ).flat();
  return Promise.all(
    ordered.map(async (part) => {
      const rgba = Buffer.alloc(part.width * part.height * 4);
      for (let y = 0; y < part.height; y++)
        for (let x = 0; x < part.width; x++) {
          const i = (part.top + y) * info.width + part.left + x;
          let belongs = owner[i] === part.id;
          if (!owner[i] && data[i * 4 + 3] > 0)
            for (let dy = -2; dy <= 2 && !belongs; dy++)
              for (let dx = -2; dx <= 2; dx++) {
                const near = i + dy * info.width + dx;
                if (near >= 0 && near < owner.length && owner[near] === part.id) {
                  belongs = true;
                  break;
                }
              }
          if (belongs) data.copy(rgba, (y * part.width + x) * 4, i * 4, i * 4 + 4);
        }
      return {
        ...part,
        png: await sharp(rgba, { raw: { width: part.width, height: part.height, channels: 4 } })
          .png()
          .toBuffer(),
      };
    }),
  );
}
