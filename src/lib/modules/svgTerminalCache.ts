export interface CachedTerminalGroup {
  prefix: string; // np. "L1", "L2", "L3", "N", "PE"
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  terminals: {
    name: string; // np. "L1-1"
    xRatio: number; // 0.0 - 1.0
    yRatio: number; // 0.0 - 1.0
    rRatio?: number; // 0.0 - 1.0 (względem szerokości)
  }[];
}

type Subscriber = () => void;

class SvgTerminalCache {
  private cache: Map<string, CachedTerminalGroup[]> = new Map();
  private subscribers: Set<Subscriber> = new Set();
  private loading: Set<string> = new Set();

  public get(moduleRef: string): CachedTerminalGroup[] | undefined {
    return this.cache.get(moduleRef);
  }

  public set(moduleRef: string, groups: CachedTerminalGroup[]) {
    this.cache.set(moduleRef, groups);
    this.loading.delete(moduleRef);
    this.notify();
  }

  public markLoading(moduleRef: string) {
    this.loading.add(moduleRef);
  }

  public isLoading(moduleRef: string): boolean {
    return this.loading.has(moduleRef);
  }

  public subscribe(cb: Subscriber) {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private notify() {
    for (const cb of this.subscribers) {
      cb();
    }
  }
}

export const svgTerminalCache = new SvgTerminalCache();
