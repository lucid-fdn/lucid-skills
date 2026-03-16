export interface Template {
  id: string;
  name: string;
  category: 'marketing' | 'data-report' | 'outreach' | 'product' | 'internal';
  description: string;
  composition_path: string;
  schema_json: Record<string, unknown>;
  thumbnail_url: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail_url: string | null;
  scene_types: string[];
}
