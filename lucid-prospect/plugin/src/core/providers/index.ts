import type {
  PluginConfig,
  ProspectProvider,
  ProviderRegistry,
  LeadSearchQuery,
  LeadSearchResult,
  EnrichmentData,
  CompanyEnrichmentData,
  EmailFinderResult,
  EmailVerificationResult,
} from '../types/index.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { ApolloProvider } from './apollo.js';
import { HunterProvider } from './hunter.js';
import { ClearbitProvider } from './clearbit.js';
import { CrunchbaseProvider } from './crunchbase.js';

export { BaseProvider } from './base.js';
export { ApolloProvider } from './apollo.js';
export { HunterProvider } from './hunter.js';
export { ClearbitProvider } from './clearbit.js';
export { CrunchbaseProvider } from './crunchbase.js';

class DefaultProviderRegistry implements ProviderRegistry {
  providers: ProspectProvider[];

  constructor(providers: ProspectProvider[]) {
    this.providers = providers;
  }

  getConfigured(): ProspectProvider[] {
    return this.providers.filter((p) => p.isConfigured());
  }

  async findLeads(query: LeadSearchQuery): Promise<LeadSearchResult[]> {
    const results: LeadSearchResult[] = [];
    const configured = this.getConfigured().filter((p) => p.findLeads);

    if (configured.length === 0) {
      throw new ProviderError('No providers configured for findLeads');
    }

    const allResults = await Promise.allSettled(configured.map((p) => p.findLeads!(query)));

    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        logger.warn('Provider findLeads failed:', result.reason);
      }
    }

    // Deduplicate by email
    const seen = new Set<string>();
    return results.filter((r) => {
      if (!r.email) return true;
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async enrichLead(email: string): Promise<EnrichmentData> {
    const configured = this.getConfigured().filter((p) => p.enrichLead);

    if (configured.length === 0) {
      throw new ProviderError('No providers configured for enrichLead');
    }

    // Use first available provider, merge results
    const allResults = await Promise.allSettled(configured.map((p) => p.enrichLead!(email)));

    let merged: EnrichmentData = { provider: 'merged' };
    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        merged = { ...merged, ...stripUndefined(result.value) };
      } else {
        logger.warn('Provider enrichLead failed:', result.reason);
      }
    }

    return merged;
  }

  async enrichCompany(domain: string): Promise<CompanyEnrichmentData> {
    const configured = this.getConfigured().filter((p) => p.enrichCompany);

    if (configured.length === 0) {
      throw new ProviderError('No providers configured for enrichCompany');
    }

    const allResults = await Promise.allSettled(configured.map((p) => p.enrichCompany!(domain)));

    let merged: CompanyEnrichmentData = { provider: 'merged' };
    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        merged = { ...merged, ...stripUndefined(result.value) };
      } else {
        logger.warn('Provider enrichCompany failed:', result.reason);
      }
    }

    return merged;
  }

  async findEmails(domain: string, name?: string): Promise<EmailFinderResult[]> {
    const results: EmailFinderResult[] = [];
    const configured = this.getConfigured().filter((p) => p.findEmails);

    if (configured.length === 0) {
      throw new ProviderError('No providers configured for findEmails');
    }

    const allResults = await Promise.allSettled(configured.map((p) => p.findEmails!(domain, name)));

    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        logger.warn('Provider findEmails failed:', result.reason);
      }
    }

    // Deduplicate by email
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const configured = this.getConfigured().filter((p) => p.verifyEmail);

    if (configured.length === 0) {
      throw new ProviderError('No providers configured for verifyEmail');
    }

    // Use first available provider
    for (const provider of configured) {
      try {
        return await provider.verifyEmail!(email);
      } catch (err) {
        logger.warn(`Provider ${provider.name} verifyEmail failed:`, err);
      }
    }

    throw new ProviderError('All providers failed for verifyEmail');
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

export function createProviderRegistry(config: PluginConfig): ProviderRegistry {
  const providers: ProspectProvider[] = [];

  if (config.apolloApiKey) {
    providers.push(new ApolloProvider(config.apolloApiKey));
  }
  if (config.hunterApiKey) {
    providers.push(new HunterProvider(config.hunterApiKey));
  }
  if (config.clearbitApiKey) {
    providers.push(new ClearbitProvider(config.clearbitApiKey));
  }
  if (config.crunchbaseApiKey) {
    providers.push(new CrunchbaseProvider(config.crunchbaseApiKey));
  }

  logger.info(`Initialized ${providers.length} providers: ${providers.map((p) => p.name).join(', ')}`);
  return new DefaultProviderRegistry(providers);
}
