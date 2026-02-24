// ---------------------------------------------------------------------------
// npm.ts -- NPM Package Registry Monitor fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';

export class NpmFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'npm';
  readonly name = 'NPM Package Monitor';

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    // monitor.url is like "https://www.npmjs.com/package/{name}" or just the package name
    const packageName = this.extractPackageName(monitor.url);
    const res = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!res.ok) throw new Error(`NPM registry returned ${res.status} for ${packageName}`);

    const data = (await res.json()) as {
      'dist-tags'?: { latest?: string };
    };
    const latestVersion = data['dist-tags']?.latest;
    const signals: SignalInsert[] = [];

    if (latestVersion) {
      const lastKnown = (monitor.config as Record<string, unknown>)?.lastVersion as
        | string
        | undefined;
      if (lastKnown && latestVersion !== lastKnown) {
        const isMajor = this.isMajorBump(lastKnown, latestVersion);
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: 'release',
          severity: isMajor ? 'high' : 'medium',
          title: `${competitor.name} published ${packageName}@${latestVersion}`,
          summary: `New version: ${lastKnown} -> ${latestVersion}`,
          url: `https://www.npmjs.com/package/${packageName}`,
          metadata: {
            package: packageName,
            version: latestVersion,
            previousVersion: lastKnown,
          },
        });
      }
    }

    return { signals, metadata: { latestVersion } };
  }

  private extractPackageName(url: string): string {
    // Handle "https://www.npmjs.com/package/@scope/name" or just "@scope/name"
    const match = url.match(/npmjs\.com\/package\/(.+)/);
    return match ? match[1] : url.replace(/^https?:\/\//, '');
  }

  private isMajorBump(prev: string, next: string): boolean {
    const prevMajor = parseInt(prev.split('.')[0], 10);
    const nextMajor = parseInt(next.split('.')[0], 10);
    return nextMajor > prevMajor;
  }
}
