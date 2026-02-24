// ---------------------------------------------------------------------------
// jobs.ts -- Job Board Monitor fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';

interface JobListing {
  title: string;
  department?: string;
  location?: string;
  url?: string;
}

export class JobsFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'jobs';
  readonly name = 'Job Board Monitor';

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const url = monitor.url.toLowerCase();
    let jobs: JobListing[] = [];

    if (url.includes('greenhouse.io') || url.includes('boards-api.greenhouse.io')) {
      jobs = await this.fetchGreenhouse(monitor.url);
    } else if (url.includes('lever.co') || url.includes('api.lever.co')) {
      jobs = await this.fetchLever(monitor.url);
    } else if (url.includes('ashbyhq.com')) {
      jobs = await this.fetchAshby(monitor.url);
    }

    const signals: SignalInsert[] = [];

    // On first fetch, don't create signals (just baseline)
    if (!monitor.last_fetched_at) {
      return { signals: [], metadata: { jobCount: jobs.length } };
    }

    // For subsequent fetches, all returned jobs are treated as potentially new
    // (Real implementation would track seen job IDs, but for MVP we emit all)
    for (const job of jobs) {
      const isLeadership = /\b(vp|vice president|director|head of|chief|cto|cfo|coo)\b/i.test(
        job.title,
      );
      signals.push({
        tenant_id: monitor.tenant_id,
        competitor_id: monitor.competitor_id,
        monitor_id: monitor.id,
        signal_type: 'job_posting',
        severity: isLeadership ? 'high' : 'medium',
        title: `${competitor.name} hiring: ${job.title}`,
        summary: [job.department, job.location].filter(Boolean).join(' \u00b7 ') || undefined,
        url: job.url,
        metadata: { department: job.department, location: job.location },
      });
    }

    return { signals, metadata: { jobCount: jobs.length } };
  }

  private async fetchGreenhouse(url: string): Promise<JobListing[]> {
    // Extract board token from URL
    const match = url.match(
      /(?:boards(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/)?)?([^/\s?#]+)/,
    );
    const token = match?.[1] ?? url;
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      jobs?: Array<{
        title: string;
        departments?: Array<{ name: string }>;
        location?: { name: string };
        absolute_url: string;
      }>;
    };
    return (data.jobs ?? []).map((j) => ({
      title: j.title,
      department: j.departments?.[0]?.name,
      location: j.location?.name,
      url: j.absolute_url,
    }));
  }

  private async fetchLever(url: string): Promise<JobListing[]> {
    const match = url.match(/lever\.co\/([^/\s?#]+)/);
    const company = match?.[1] ?? url;
    const res = await fetch(`https://api.lever.co/v0/postings/${company}`);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      text: string;
      categories?: { department?: string; location?: string };
      hostedUrl?: string;
    }>;
    return (data ?? []).map((j) => ({
      title: j.text,
      department: j.categories?.department,
      location: j.categories?.location,
      url: j.hostedUrl,
    }));
  }

  private async fetchAshby(url: string): Promise<JobListing[]> {
    const match = url.match(/ashbyhq\.com\/([^/\s?#]+)/);
    const company = match?.[1] ?? url;
    const res = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'ApiJobBoardWithTeams',
        variables: { organizationHostedJobsPageName: company },
        query:
          'query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobs { title department location } } }',
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: {
        jobBoard?: {
          jobs?: Array<{ title: string; department?: string; location?: string }>;
        };
      };
    };
    return (data?.data?.jobBoard?.jobs ?? []).map((j) => ({
      title: j.title,
      department: j.department,
      location: j.location,
    }));
  }
}
