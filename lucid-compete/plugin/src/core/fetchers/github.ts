// ---------------------------------------------------------------------------
// github.ts -- GitHub Repository Monitor fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

export class GitHubFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'github';
  readonly name = 'GitHub Repository Monitor';
  private token?: string;

  constructor(token?: string) {
    super();
    this.token = token;
  }

  isConfigured(): boolean {
    return true; // Works without token (lower rate limits)
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const { owner, repo } = this.parseGitHubUrl(monitor.url);
    const signals: SignalInsert[] = [];
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    // Check releases
    const releasesRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`,
      { headers },
    );
    if (releasesRes.ok) {
      const releases = (await releasesRes.json()) as Array<{
        published_at: string;
        tag_name: string;
        body?: string;
        html_url: string;
        prerelease: boolean;
      }>;
      const lastFetched = monitor.last_fetched_at
        ? new Date(monitor.last_fetched_at)
        : new Date(0);

      for (const release of releases) {
        if (new Date(release.published_at) > lastFetched) {
          const isMajor = /^v?\d+\.0\.0/.test(release.tag_name);
          signals.push({
            tenant_id: monitor.tenant_id,
            competitor_id: monitor.competitor_id,
            monitor_id: monitor.id,
            signal_type: 'release',
            severity: isMajor ? 'high' : 'medium',
            title: `${competitor.name} released ${release.tag_name}`,
            summary: truncate(release.body ?? '', 500),
            url: release.html_url,
            metadata: { tag: release.tag_name, prerelease: release.prerelease },
          });
        }
      }
    }

    // Check star count (metadata only)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    let starCount = 0;
    if (repoRes.ok) {
      const repoData = (await repoRes.json()) as { stargazers_count: number };
      starCount = repoData.stargazers_count;
    }

    return { signals, metadata: { stars: starCount } };
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    // Handle: github.com/owner/repo, https://github.com/owner/repo, etc.
    const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
    if (!match) throw new Error(`Cannot parse GitHub URL: ${url}`);
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
}
