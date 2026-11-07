/**
 * src/scripts/atlas/runtime-telemetry-hud.ts
 * Live Performance & System Telemetry HUD untuk The Data Atlas Crypt (/atlas - V15.0).
 *
 * Mengukur metrik peramban secara nyata (Zero Fake Numbers):
 *  - FPS aktual & Frame Time (ms) dari jendela bergulir requestAnimationFrame
 *  - Penggunaan JS Heap Memory (MB) jika tersedia di peramban (fallback jujur jika dibatasi)
 *  - Jumlah simpul DOM aktif di halaman & status kepadatan konstelasi kanvas
 */

export interface TelemetrySnapshot {
  readonly fps: number;
  readonly frameTimeMs: number;
  readonly heapUsedMb: string;
  readonly domNodes: number;
  readonly visibleAtlasNodes: number;
  readonly visibleAtlasEdges: number;
  readonly stabilityLabel: string;
}

export class RuntimeTelemetryHud {
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private frameDeltas: number[] = [];
  private lastDomUpdate = 0;
  private visibleNodes = 36;
  private visibleEdges = 52;

  public setGraphCounts(nodes: number, edges: number): void {
    this.visibleNodes = nodes;
    this.visibleEdges = edges;
  }

  public start(): void {
    if (typeof window === 'undefined' || this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    this.lastDomUpdate = this.lastTimestamp;

    const tick = (now: number) => {
      const delta = Math.max(0.1, now - this.lastTimestamp);
      this.lastTimestamp = now;

      this.frameDeltas.push(delta);
      if (this.frameDeltas.length > 45) {
        this.frameDeltas.shift();
      }

      if (now - this.lastDomUpdate >= 320) {
        this.lastDomUpdate = now;
        this.renderHud();
      }

      this.rafId = window.requestAnimationFrame(tick);
    };

    this.rafId = window.requestAnimationFrame(tick);
    this.renderHud();
  }

  public stop(): void {
    if (typeof window !== 'undefined' && this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public getSnapshot(): TelemetrySnapshot {
    const avgDelta =
      this.frameDeltas.length > 0
        ? this.frameDeltas.reduce((acc, v) => acc + v, 0) / this.frameDeltas.length
        : 16.67;
    const fps = Math.min(240, Math.max(1, Math.round(1000 / avgDelta)));
    const frameTimeMs = Number(avgDelta.toFixed(1));

    const perfAny = performance as unknown as {
      memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number };
    };
    let heapUsedMb = 'N/A (Standard Isolate)';
    if (perfAny.memory && typeof perfAny.memory.usedJSHeapSize === 'number') {
      const used = (perfAny.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      heapUsedMb = `${used} MB`;
    }

    const domNodes =
      typeof document !== 'undefined' ? document.getElementsByTagName('*').length : 0;

    const stabilityLabel =
      fps >= 50 ? 'OPTIMAL · 60Hz LOCK' : fps >= 30 ? 'STABLE · ADAPTIVE' : 'THROTTLED · LOW POWER';

    return {
      fps,
      frameTimeMs,
      heapUsedMb,
      domNodes,
      visibleAtlasNodes: this.visibleNodes,
      visibleAtlasEdges: this.visibleEdges,
      stabilityLabel,
    };
  }

  private renderHud(): void {
    if (typeof document === 'undefined') return;
    const snap = this.getSnapshot();

    const setElText = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElText('atlas-telemetry-fps', `${snap.fps} FPS`);
    setElText('atlas-telemetry-frametime', `${snap.frameTimeMs} ms`);
    setElText('atlas-telemetry-heap', snap.heapUsedMb);
    setElText('atlas-telemetry-dom', `${snap.domNodes} nodes`);
    setElText(
      'atlas-telemetry-graph',
      `${snap.visibleAtlasNodes} Nodes / ${snap.visibleAtlasEdges} Synapses`
    );
    setElText('atlas-telemetry-status', snap.stabilityLabel);
  }
}
