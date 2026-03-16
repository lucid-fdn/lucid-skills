import type { Lead, IcpProfile, LeadScoreBreakdown, EmailStatus } from '../types/index.js';

const C_LEVEL_PATTERN = /\b(ceo|cto|cfo|coo|cmo|cpo|cio|chief)\b/;
const VP_PATTERN = /\b(vp|vice president)\b/;
const DIRECTOR_PATTERN = /\b(director|head of)\b/;
const MANAGER_PATTERN = /\b(manager|lead|senior)\b/;

function scoreEmailQuality(lead: Lead, emailStatus?: EmailStatus): number {
  if (!lead.email) return 0;

  if (emailStatus === 'valid') return 30;
  if (emailStatus === 'catch_all') return 15;
  if (emailStatus === 'unknown' || emailStatus === undefined) return 5;
  if (emailStatus === 'invalid' || emailStatus === 'disposable') return 0;
  return 5;
}

function scoreTitleRelevance(lead: Lead, icpTitles?: string[]): number {
  const title = (lead.title ?? '').toLowerCase();
  if (!title) return 3;

  // Check against ICP titles first
  if (icpTitles && icpTitles.length > 0) {
    const match = icpTitles.some((t) => title.includes(t.toLowerCase()));
    if (match) return 25;
  }

  // Fallback to seniority-based scoring
  if (C_LEVEL_PATTERN.test(title)) return 25;
  if (VP_PATTERN.test(title)) return 22;
  if (DIRECTOR_PATTERN.test(title)) return 18;
  if (MANAGER_PATTERN.test(title)) return 14;

  return 8;
}

function scoreCompanyFit(lead: Lead, icp?: IcpProfile): number {
  if (!icp) return 12; // Default mid-range score when no ICP

  let score = 0;

  // Industry match (0-10)
  if (icp.industries.length > 0 && lead.enrichment_data) {
    const leadIndustry = ((lead.enrichment_data.industry as string) ?? '').toLowerCase();
    if (icp.industries.some((i) => leadIndustry.includes(i.toLowerCase()))) {
      score += 10;
    }
  }

  // Company size match (0-8)
  if (icp.company_sizes.length > 0 && lead.enrichment_data) {
    const companySize = (lead.enrichment_data.company_size as string) ?? '';
    if (icp.company_sizes.includes(companySize as any)) {
      score += 8;
    }
  }

  // Funding match (0-7)
  if (icp.min_funding !== undefined && lead.enrichment_data) {
    const funding = (lead.enrichment_data.funding_total as number) ?? 0;
    if (funding >= icp.min_funding) {
      score += 7;
    }
  }

  return Math.min(score, 25);
}

function scoreEngagement(lead: Lead): number {
  let score = 0;

  // Has linkedin URL
  if (lead.linkedin_url) score += 3;
  // Has phone
  if (lead.phone) score += 2;
  // Has been contacted
  if (lead.status !== 'new') score += 3;
  // Has notes
  if (lead.notes) score += 2;

  return Math.min(score, 10);
}

function scoreRecency(lead: Lead): number {
  const created = new Date(lead.created_at);
  const now = new Date();
  const daysSinceCreated = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated <= 7) return 10;
  if (daysSinceCreated <= 14) return 8;
  if (daysSinceCreated <= 30) return 6;
  if (daysSinceCreated <= 60) return 4;
  if (daysSinceCreated <= 90) return 2;
  return 1;
}

export function scoreLead(lead: Lead, icp?: IcpProfile, emailStatus?: EmailStatus): LeadScoreBreakdown {
  const email_quality = scoreEmailQuality(lead, emailStatus);
  const title_relevance = scoreTitleRelevance(lead, icp?.titles);
  const company_fit = scoreCompanyFit(lead, icp);
  const engagement = scoreEngagement(lead);
  const recency = scoreRecency(lead);

  const total = Math.min(email_quality + title_relevance + company_fit + engagement + recency, 100);

  return {
    email_quality,
    title_relevance,
    company_fit,
    engagement,
    recency,
    total,
  };
}
