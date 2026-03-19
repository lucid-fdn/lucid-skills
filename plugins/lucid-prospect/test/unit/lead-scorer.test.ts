import { describe, it, expect } from 'vitest';
import { scoreLead } from '../../src/core/analysis/lead-scorer.js';
import { createMockLead, createMockIcpProfile } from '../helpers/fixtures.js';

describe('Lead Scorer', () => {
  it('should return a score between 0 and 100', () => {
    const lead = createMockLead();
    const result = scoreLead(lead);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('should score C-level title higher than manager', () => {
    const ceoLead = createMockLead({ title: 'CEO' });
    const managerLead = createMockLead({ title: 'Product Manager' });

    const ceoScore = scoreLead(ceoLead);
    const managerScore = scoreLead(managerLead);

    expect(ceoScore.title_relevance).toBeGreaterThan(managerScore.title_relevance);
  });

  it('should score VP higher than Director', () => {
    const vpLead = createMockLead({ title: 'VP of Sales' });
    const directorLead = createMockLead({ title: 'Director of Sales' });

    const vpScore = scoreLead(vpLead);
    const directorScore = scoreLead(directorLead);

    expect(vpScore.title_relevance).toBeGreaterThan(directorScore.title_relevance);
  });

  it('should score verified email higher than unknown', () => {
    const lead = createMockLead({ email: 'test@example.com' });

    const verifiedScore = scoreLead(lead, undefined, 'valid');
    const unknownScore = scoreLead(lead, undefined, 'unknown');

    expect(verifiedScore.email_quality).toBeGreaterThan(unknownScore.email_quality);
  });

  it('should give 0 email quality for invalid email', () => {
    const lead = createMockLead({ email: 'test@example.com' });
    const result = scoreLead(lead, undefined, 'invalid');
    expect(result.email_quality).toBe(0);
  });

  it('should give 0 email quality for null email', () => {
    const lead = createMockLead({ email: null });
    const result = scoreLead(lead);
    expect(result.email_quality).toBe(0);
  });

  it('should score catch_all email at 15', () => {
    const lead = createMockLead({ email: 'test@example.com' });
    const result = scoreLead(lead, undefined, 'catch_all');
    expect(result.email_quality).toBe(15);
  });

  it('should boost score with ICP industry match', () => {
    const icp = createMockIcpProfile({ industries: ['technology'] });
    const matchLead = createMockLead({
      enrichment_data: { industry: 'technology', company_size: '51-200', funding_total: 5000000 },
    });
    const noMatchLead = createMockLead({ enrichment_data: {} });

    const matchScore = scoreLead(matchLead, icp);
    const noMatchScore = scoreLead(noMatchLead, icp);

    expect(matchScore.company_fit).toBeGreaterThan(noMatchScore.company_fit);
  });

  it('should boost score with ICP company size match', () => {
    const icp = createMockIcpProfile({ company_sizes: ['51-200'] });
    const matchLead = createMockLead({ enrichment_data: { company_size: '51-200' } });
    const noMatchLead = createMockLead({ enrichment_data: { company_size: '5000+' } });

    const matchScore = scoreLead(matchLead, icp);
    const noMatchScore = scoreLead(noMatchLead, icp);

    expect(matchScore.company_fit).toBeGreaterThan(noMatchScore.company_fit);
  });

  it('should give higher engagement score for contacted leads', () => {
    const contactedLead = createMockLead({ status: 'contacted', linkedin_url: 'https://linkedin.com/in/test', phone: '+1555', notes: 'Good conversation' });
    const newLead = createMockLead({ status: 'new', linkedin_url: null, phone: null, notes: null });

    const contactedScore = scoreLead(contactedLead);
    const newScore = scoreLead(newLead);

    expect(contactedScore.engagement).toBeGreaterThan(newScore.engagement);
  });

  it('should give higher recency score for newer leads', () => {
    const recentLead = createMockLead({ created_at: new Date().toISOString() });
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const oldLead = createMockLead({ created_at: oldDate.toISOString() });

    const recentScore = scoreLead(recentLead);
    const oldScore = scoreLead(oldLead);

    expect(recentScore.recency).toBeGreaterThan(oldScore.recency);
  });

  it('should handle missing data gracefully', () => {
    const lead = createMockLead({
      email: null,
      title: null,
      company_name: null,
      linkedin_url: null,
      phone: null,
      notes: null,
    });

    const result = scoreLead(lead);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('should have all breakdown components that sum close to total', () => {
    const lead = createMockLead();
    const result = scoreLead(lead, undefined, 'valid');

    const sum = result.email_quality + result.title_relevance + result.company_fit + result.engagement + result.recency;
    expect(result.total).toBe(Math.min(sum, 100));
  });

  it('should match ICP titles when provided', () => {
    const icp = createMockIcpProfile({ titles: ['CTO', 'VP of Engineering'] });
    const matchLead = createMockLead({ title: 'CTO' });
    const noMatchLead = createMockLead({ title: 'Intern' });

    const matchScore = scoreLead(matchLead, icp);
    const noMatchScore = scoreLead(noMatchLead, icp);

    expect(matchScore.title_relevance).toBeGreaterThan(noMatchScore.title_relevance);
  });

  it('should give low title score for unknown/missing title', () => {
    const lead = createMockLead({ title: null });
    const result = scoreLead(lead);
    expect(result.title_relevance).toBeLessThan(10);
  });
});
