import { createClient } from '@supabase/supabase-js';
import db from '@/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const fallbackSupabase = {
  from(table) {
    return {
      select() {
        return {
          async limit(limitValue) {
            try {
              const safeLimit = Number(limitValue) || 1;
              const result = await db.query(`SELECT id FROM ${table} LIMIT ${safeLimit}`);
              return { data: result.rows, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        };
      },
    };
  },
};

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : fallbackSupabase;

export default supabase;
