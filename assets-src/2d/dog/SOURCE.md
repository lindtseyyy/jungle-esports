# Dog / wolf run cycle (test extraction)

- Source: `reference_video/dog.mkv` (1104×742, 30 fps), supplied by the project owner. It is an animator's process video (sketch → line art → flat grey) and carries the artist's "KL©" signature. Ownership and license are unknown: confirm with the artist before any public release.
- Extracted: 9 drawings from one stride. Source frames 147, 149, **180**, 155, 157, 163, 167, 168 and 173; frame 180 replaces 152, which contains onion-skin ghosts. Drawing 147 recurs at frame 175, so a stride is 28 source frames (~0.92 s).
- Processing: the grey background was removed by flood fill from the frame border (the fill is lighter than the background, so the flood cannot leak inside). The figure was then recoloured by luminance: fill to a blue-grey wolf coat, enclosed background-grey areas to a darker far-side coat, outlines to dark ink, and the tongue kept as is. Already faces left. All frames share one 926×588 crop box.
