import type { Lead, Company, IcpProfile, Industry, CompanySize } from '../types/index.js';

export function matchLeadToIcp(lead: Lead, icp: IcpProfile): number {
  let score = 0;
  let maxScore = 0;

  // Title match (0-30)
  if (icp.titles.length > 0) {
    maxScore += 30;
    const title = (lead.title ?? '').toLowerCase();
    if (icp.titles.some((t) => title.includes(t.toLowerCase()))) {
      score += 30;
    }
  }

  // Industry match (0-20)
  if (icp.industries.length > 0) {
    maxScore += 20;
    const leadIndustry = ((lead.enrichment_data?.industry as string) ?? '').toLowerCase();
    if (icp.industries.some((i) => leadIndustry.includes(i.toLowerCase()))) {
      score += 20;
    }
  }

  // Company size match (0-15)
  if (icp.company_sizes.length > 0) {
    maxScore += 15;
    const companySize = (lead.enrichment_data?.company_size as string) ?? '';
    if (icp.company_sizes.includes(companySize as CompanySize)) {
      score += 15;
    }
  }

  // Technology match (0-15)
  if (icp.technologies.length > 0) {
    maxScore += 15;
    const leadTech = (lead.enrichment_data?.technologies as string[]) ?? [];
    const overlap = icp.technologies.filter((t) => leadTech.some((lt) => lt.toLowerCase() === t.toLowerCase()));
    if (overlap.length > 0) {
      score += Math.min(15, Math.round((overlap.length / icp.technologies.length) * 15));
    }
  }

  // Location match (0-10)
  if (icp.locations.length > 0) {
    maxScore += 10;
    const leadLocation = ((lead.enrichment_data?.location as string) ?? '').toLowerCase();
    if (icp.locations.some((l) => leadLocation.includes(l.toLowerCase()))) {
      score += 10;
    }
  }

  // Funding match (0-10)
  if (icp.min_funding !== undefined) {
    maxScore += 10;
    const funding = (lead.enrichment_data?.funding_total as number) ?? 0;
    if (funding >= icp.min_funding) {
      score += 10;
    }
  }

  if (maxScore === 0) return 50; // No ICP criteria
  return Math.round((score / maxScore) * 100);
}

export function matchCompanyToIcp(company: Company, icp: IcpProfile): number {
  let score = 0;
  let maxScore = 0;

  // Industry match (0-25)
  if (icp.industries.length > 0) {
    maxScore += 25;
    if (company.industry && icp.industries.includes(company.industry as Industry)) {
      score += 25;
    }
  }

  // Company size match (0-20)
  if (icp.company_sizes.length > 0) {
    maxScore += 20;
    if (company.company_size && icp.company_sizes.includes(company.company_size)) {
      score += 20;
    }
  }

  // Technology match (0-20)
  if (icp.technologies.length > 0) {
    maxScore += 20;
    const overlap = icp.technologies.filter((t) =>
      company.technologies.some((ct) => ct.toLowerCase() === t.toLowerCase()),
    );
    if (overlap.length > 0) {
      score += Math.min(20, Math.round((overlap.length / icp.technologies.length) * 20));
    }
  }

  // Location match (0-15)
  if (icp.locations.length > 0) {
    maxScore += 15;
    const companyLocation = (company.location ?? '').toLowerCase();
    if (icp.locations.some((l) => companyLocation.includes(l.toLowerCase()))) {
      score += 15;
    }
  }

  // Funding match (0-20)
  if (icp.min_funding !== undefined) {
    maxScore += 20;
    if (company.funding_total >= icp.min_funding) {
      score += 20;
    }
  }

  if (maxScore === 0) return 50;
  return Math.round((score / maxScore) * 100);
}

export function buildIcpFromLeads(leads: Lead[]): IcpProfile {
  const convertedLeads = leads.filter((l) => l.status === 'converted');
  const pool = convertedLeads.length > 0 ? convertedLeads : leads;

  const industryCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();
  const titleCounts = new Map<string, number>();
  const techCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  let totalFunding = 0;
  let fundingCount = 0;

  for (const lead of pool) {
    const industry = (lead.enrichment_data?.industry as string) ?? '';
    if (industry) industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);

    const size = (lead.enrichment_data?.company_size as string) ?? '';
    if (size) sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);

    const title = lead.title ?? '';
    if (title) {
      // Normalize to role level
      const normalized = normalizeTitle(title);
      titleCounts.set(normalized, (titleCounts.get(normalized) ?? 0) + 1);
    }

    const techs = (lead.enrichment_data?.technologies as string[]) ?? [];
    for (const tech of techs) {
      techCounts.set(tech, (techCounts.get(tech) ?? 0) + 1);
    }

    const location = (lead.enrichment_data?.location as string) ?? '';
    if (location) locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);

    const funding = (lead.enrichment_data?.funding_total as number) ?? 0;
    if (funding > 0) {
      totalFunding += funding;
      fundingCount++;
    }
  }

  const topN = <T>(map: Map<T, number>, n: number): T[] =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);

  return {
    industries: topN(industryCounts, 3) as Industry[],
    company_sizes: topN(sizeCounts, 3) as CompanySize[],
    titles: topN(titleCounts, 5),
    technologies: topN(techCounts, 5),
    min_funding: fundingCount > 0 ? Math.round(totalFunding / fundingCount * 0.5) : undefined,
    locations: topN(locationCounts, 3),
  };
}

function normalizeTitle(title: string): string {
  const lower = title.toLowerCase();
  if (/\b(ceo|cto|cfo|coo|cmo|cpo|cio|chief)\b/.test(lower)) return 'C-Level';
  if (/\b(vp|vice president)\b/.test(lower)) return 'VP';
  if (/\b(director|head of)\b/.test(lower)) return 'Director';
  if (/\b(manager|lead|senior)\b/.test(lower)) return 'Manager';
  return title;
}
