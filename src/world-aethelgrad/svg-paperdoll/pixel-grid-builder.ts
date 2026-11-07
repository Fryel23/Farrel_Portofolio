/**
 * src/world-aethelgrad/svg-paperdoll/pixel-grid-builder.ts
 * Utilitas pembangun elemen SVG Pixel-Art (Grid 64x64, crispEdges).
 */

export interface PixelRectSpec {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fill: string;
  readonly opacity?: number;
}

export function pxRect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  opacity?: number
): string {
  const opAttr =
    opacity !== undefined && opacity < 1 ? ` fill-opacity="${opacity.toFixed(2)}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${opAttr}/>`;
}

export function pxBatch(rects: readonly PixelRectSpec[]): string {
  return rects
    .map((r) => pxRect(r.x, r.y, r.w, r.h, r.fill, r.opacity))
    .join('');
}
