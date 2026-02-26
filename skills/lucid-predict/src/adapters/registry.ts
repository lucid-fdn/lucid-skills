// ---------------------------------------------------------------------------
// adapters/registry.ts -- PlatformRegistry: register & query adapters
// ---------------------------------------------------------------------------

import type { PlatformId } from '../types/index.js';
import type { IPlatformAdapter } from './types.js';

/**
 * Central registry for platform adapters.
 * Same pattern as trade's AdapterRegistry but keyed on PlatformId.
 */
export class PlatformRegistry {
  private readonly adapters = new Map<PlatformId, IPlatformAdapter>();

  /** Register an adapter. Overwrites any previous adapter for the same platform. */
  register(adapter: IPlatformAdapter): void {
    this.adapters.set(adapter.platformId, adapter);
  }

  /** Retrieve adapter by platform ID. */
  get(platformId: PlatformId): IPlatformAdapter | undefined {
    return this.adapters.get(platformId);
  }

  /** List all registered adapters. */
  list(): IPlatformAdapter[] {
    return [...this.adapters.values()];
  }

  /** Number of registered adapters. */
  get size(): number {
    return this.adapters.size;
  }
}
