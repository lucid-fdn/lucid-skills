import type { Industry, CompanySize } from './common.js';

export interface IcpProfile {
  industries: Industry[];
  company_sizes: CompanySize[];
  titles: string[];
  technologies: string[];
  min_funding?: number;
  locations: string[];
}

export interface LeadScoreBreakdown {
  email_quality: number; // 0-30
  title_relevance: number; // 0-25
  company_fit: number; // 0-25
  engagement: number; // 0-10
  recency: number; // 0-10
  total: number; // 0-100
}

export interface SearchInsight {
  total_found: number;
  avg_score: number;
  top_titles: Array<{ title: string; count: number }>;
  top_companies: Array<{ company: string; count: number }>;
  top_industries: Array<{ industry: string; count: number }>;
}
