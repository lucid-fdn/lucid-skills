import { describe, it, expect } from 'vitest';
import { matchLeadToIcp, matchCompanyToIcp, buildIcpFromLeads } from '../../src/core/analysis/icp-matcher.js';
import { createMockLead, createMockCompany, createMockIcpProfile } from '../helpers/fixtures.js';

describe('ICP Matcher', () => {
  describe('matchLeadToIcp', () => {
    it('should return high score for perfect ICP match', () => {
      const icp = createMockIcpProfile({
        industries: ['technology'],
        company_sizes: ['51-200'],
        titles: ['VP'],
        technologies: ['react'],
        locations: ['San Francisco'],
        min_funding: 1000000,
      });

      const lead = createMockLead({
        title: 'VP of Engineering',
        enrichment_data: {
          industry: 'technology',
          company_size: '51-200',
          technologies: ['react', 'node'],
          location: 'San Francisco, CA',
          funding_total: 5000000,
        },
      });

      const score = matchLeadToIcp(lead, icp);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should return medium score for partial match', () => {
      const icp = createMockIcpProfile({
        industries: ['technology'],
        titles: ['VP'],
        company_sizes: ['51-200'],
      });

      const lead = createMockLead({
        title: 'VP of Sales',
        enrichment_data: { industry: 'finance', company_size: '51-200' },
      });

      const score = matchLeadToIcp(lead, icp);
      expect(score).toBeGreaterThan(20);
      expect(score).toBeLessThan(80);
    });

    it('should return low score for no match', () => {
      const icp = createMockIcpProfile({
        industries: ['technology'],
        titles: ['CTO'],
        company_sizes: ['5000+'],
      });

      const lead = createMockLead({
        title: 'Intern',
        enrichment_data: { industry: 'retail', company_size: '1-10' },
      });

      const score = matchLeadToIcp(lead, icp);
      expect(score).toBeLessThan(30);
    });

    it('should return 50 when ICP has no criteria', () => {
      const icp = createMockIcpProfile({
        industries: [],
        company_sizes: [],
        titles: [],
        technologies: [],
        locations: [],
        min_funding: undefined,
      });

      const lead = createMockLead();
      const score = matchLeadToIcp(lead, icp);
      expect(score).toBe(50);
    });
  });

  describe('matchCompanyToIcp', () => {
    it('should return high score for matching company', () => {
      const icp = createMockIcpProfile({
        industries: ['technology'],
        company_sizes: ['51-200'],
        technologies: ['react', 'node'],
        locations: ['San Francisco'],
        min_funding: 1000000,
      });

      const company = createMockCompany({
        industry: 'technology',
        company_size: '51-200',
        technologies: ['react', 'node', 'postgres'],
        location: 'San Francisco, CA',
        funding_total: 10000000,
      });

      const score = matchCompanyToIcp(company, icp);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should return low score for non-matching company', () => {
      const icp = createMockIcpProfile({
        industries: ['technology'],
        company_sizes: ['5000+'],
        min_funding: 100000000,
        technologies: [],
        locations: [],
      });

      const company = createMockCompany({
        industry: 'retail',
        company_size: '1-10',
        funding_total: 0,
        technologies: [],
        location: null,
      });

      const score = matchCompanyToIcp(company, icp);
      expect(score).toBeLessThan(10);
    });

    it('should return 50 when ICP has no criteria', () => {
      const icp = createMockIcpProfile({
        industries: [],
        company_sizes: [],
        titles: [],
        technologies: [],
        locations: [],
        min_funding: undefined,
      });

      const company = createMockCompany();
      const score = matchCompanyToIcp(company, icp);
      expect(score).toBe(50);
    });
  });

  describe('buildIcpFromLeads', () => {
    it('should build ICP from converted leads', () => {
      const leads = [
        createMockLead({
          status: 'converted',
          title: 'CTO',
          enrichment_data: { industry: 'technology', company_size: '51-200', location: 'SF' },
        }),
        createMockLead({
          status: 'converted',
          title: 'VP of Engineering',
          enrichment_data: { industry: 'technology', company_size: '51-200', location: 'SF' },
        }),
        createMockLead({
          status: 'new',
          title: 'Intern',
          enrichment_data: { industry: 'retail' },
        }),
      ];

      const icp = buildIcpFromLeads(leads);
      expect(icp.industries).toContain('technology');
      expect(icp.company_sizes).toContain('51-200');
    });

    it('should fall back to all leads if no converted leads', () => {
      const leads = [
        createMockLead({
          status: 'new',
          title: 'Director',
          enrichment_data: { industry: 'finance' },
        }),
      ];

      const icp = buildIcpFromLeads(leads);
      expect(icp.industries).toContain('finance');
    });

    it('should handle empty leads array', () => {
      const icp = buildIcpFromLeads([]);
      expect(icp.industries).toHaveLength(0);
      expect(icp.company_sizes).toHaveLength(0);
      expect(icp.titles).toHaveLength(0);
    });
  });
});
