/**
 * Utilitas pembangun elemen SVG Pixel-Art 16-bit (Grid 64x64, crispEdges).
 */

export const PIXEL_OUTLINE_DARK = '#14161F';
export const PIXEL_SPECULAR_LIGHT = '#FFFFFF';

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

export function pxDot(x: number, y: number, fill: string, opacity?: number): string {
  return pxRect(x, y, 1, 1, fill, opacity);
}

export function pxStep2(x: number, y: number, fill: string, opacity?: number): string {
  return pxRect(x, y, 2, 1, fill, opacity);
}

export function pxBatch(rects: readonly PixelRectSpec[]): string {
  return rects
    .map((r) => pxRect(r.x, r.y, r.w, r.h, r.fill, r.opacity))
    .join('');
}
