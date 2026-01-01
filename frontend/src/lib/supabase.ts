import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 类型定义
export interface Image {
  id: string;
  original_url: string;
  r2_url: string;
  r2_path: string;
  source_website: string;
  source_page_url?: string;
  title?: string;
  width?: number;
  height?: number;
  file_size?: number;
  file_hash: string;
  mime_type?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Website {
  id: string;
  domain: string;
  image_count: number;
  last_collected_at?: string;
  created_at: string;
}
