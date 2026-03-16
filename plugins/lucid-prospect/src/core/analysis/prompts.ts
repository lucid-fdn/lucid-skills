import type { Lead, Company } from '../types/index.js';

export const LEAD_RESEARCH_SYSTEM_PROMPT = `You are a sales research assistant. Given information about a lead (person) and their company, produce a concise research summary that would help a sales rep prepare for outreach.

Include:
- Key talking points based on their role and company
- Potential pain points relevant to their industry
- Suggested personalization angles
- Any red flags or concerns

Be specific and actionable. Avoid generic advice.`;

export const COMPANY_ANALYSIS_PROMPT = `You are a B2B sales intelligence analyst. Given company data, produce a concise analysis that helps determine if this company is a good prospect.

Evaluate:
- Company stage and growth trajectory
- Technology stack alignment
- Industry fit
- Budget indicators (funding, revenue, employee count)
- Key decision makers to target

Provide a clear recommendation: Strong Fit, Moderate Fit, or Weak Fit.`;

export interface LeadResearchPromptData {
  systemPrompt: string;
  leadContext: string;
  companyContext: string;
}

export function buildLeadResearchPrompt(lead: Lead, company?: Company | null): LeadResearchPromptData {
  const leadLines: string[] = [
    '## Lead Profile',
    `- Name: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}`,
    `- Email: ${lead.email ?? 'Unknown'}`,
    `- Title: ${lead.title ?? 'Unknown'}`,
    `- Company: ${lead.company_name ?? 'Unknown'}`,
    `- Status: ${lead.status}`,
    `- Score: ${lead.score}/100`,
    `- Source: ${lead.lead_source}`,
  ];

  if (lead.linkedin_url) leadLines.push(`- LinkedIn: ${lead.linkedin_url}`);
  if (lead.phone) leadLines.push(`- Phone: ${lead.phone}`);
  if (lead.tags.length > 0) leadLines.push(`- Tags: ${lead.tags.join(', ')}`);
  if (lead.notes) leadLines.push(`- Notes: ${lead.notes}`);

  const enrichment = lead.enrichment_data;
  if (enrichment) {
    if (enrichment.bio) leadLines.push(`- Bio: ${enrichment.bio}`);
    if (enrichment.location) leadLines.push(`- Location: ${enrichment.location}`);
    if (enrichment.skills) leadLines.push(`- Skills: ${(enrichment.skills as string[]).join(', ')}`);
    const history = enrichment.employment_history as Array<{ title: string; company: string }> | undefined;
    if (history && history.length > 0) {
      leadLines.push('- Employment History:');
      for (const job of history.slice(0, 3)) {
        leadLines.push(`  - ${job.title} at ${job.company}`);
      }
    }
  }

  const companyLines: string[] = ['## Company Profile'];
  if (company) {
    companyLines.push(`- Name: ${company.name}`);
    if (company.domain) companyLines.push(`- Domain: ${company.domain}`);
    if (company.industry) companyLines.push(`- Industry: ${company.industry}`);
    if (company.company_size) companyLines.push(`- Size: ${company.company_size}`);
    if (company.employee_count) companyLines.push(`- Employees: ${company.employee_count}`);
    if (company.description) companyLines.push(`- Description: ${company.description}`);
    if (company.funding_total) companyLines.push(`- Total Funding: $${company.funding_total.toLocaleString()}`);
    if (company.funding_stage) companyLines.push(`- Funding Stage: ${company.funding_stage}`);
    if (company.technologies.length > 0) companyLines.push(`- Technologies: ${company.technologies.join(', ')}`);
    if (company.location) companyLines.push(`- Location: ${company.location}`);
  } else {
    companyLines.push(`- Company: ${lead.company_name ?? 'Unknown'}`);
    companyLines.push(`- Domain: ${lead.company_domain ?? 'Unknown'}`);
  }

  return {
    systemPrompt: LEAD_RESEARCH_SYSTEM_PROMPT,
    leadContext: leadLines.join('\n'),
    companyContext: companyLines.join('\n'),
  };
}
