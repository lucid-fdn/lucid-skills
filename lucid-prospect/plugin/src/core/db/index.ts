export { getClient, resetClient } from './client.js';
export {
  upsertLead,
  getLeadById,
  getLeadByEmail,
  listLeads,
  updateLead,
  deleteLead,
  searchLeads,
  countLeads,
  type LeadFilters,
} from './leads.js';
export {
  upsertCompany,
  getCompanyById,
  getCompanyByDomain,
  listCompanies,
  updateCompany,
  searchCompanies,
  countCompanies,
  type CompanyFilters,
} from './companies.js';
export {
  createCampaign,
  getCampaignById,
  listCampaigns,
  updateCampaign,
  addLeadToCampaign,
  removeLeadFromCampaign,
} from './campaigns.js';
export { logEnrichment, getEnrichmentsByEntity, getLatestEnrichment, countEnrichments } from './enrichments.js';
export { upsertVerification, getVerification, listVerifications } from './emails.js';
