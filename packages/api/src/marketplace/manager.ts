import { supabase } from '../lib/supabase.js';
import type { ScriptTemplate } from './types.js';

export class MarketplaceManager {
  async getAllTemplates(): Promise<ScriptTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('script_templates')
        .select('*')
        .eq('is_public', true);

      if (error) {
        console.error('Failed to fetch templates:', error);
        return [];
      }
      return (data || []).map(this.mapDbToTemplate);
    } catch {
      return [];
    }
  }

  async getTemplate(id: string): Promise<ScriptTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('script_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return this.mapDbToTemplate(data);
    } catch {
      return null;
    }
  }

  async searchTemplates(query: string, category?: string): Promise<ScriptTemplate[]> {
    try {
      const sanitized = query.replace(/[%_\\'"]/g, '').trim().substring(0, 100);
      if (!sanitized) return this.getAllTemplates();

      let q = supabase
        .from('script_templates')
        .select('*')
        .eq('is_public', true)
        .or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,document_content.ilike.%${sanitized}%`);

      if (category) q = q.eq('category', category);

      const { data, error } = await q;
      if (error) return [];
      return (data || []).map(this.mapDbToTemplate);
    } catch {
      return [];
    }
  }

  async createTemplate(template: Partial<ScriptTemplate>, userId?: string): Promise<ScriptTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('script_templates')
        .insert({
          name: template.name,
          description: template.description,
          category: template.category || 'custom',
          tags: template.tags || [],
          commands: template.commands || [],
          author: template.author,
          user_id: userId,
          is_public: template.isPublic ?? true,
          document_content: template.documentContent,
          like_count: 0,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) return null;
      return this.mapDbToTemplate(data);
    } catch {
      return null;
    }
  }

  async deleteTemplate(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('script_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  }

  async incrementUsage(id: string): Promise<void> {
    try {
      await supabase.rpc('increment_usage_count', { script_id: id });
    } catch { /* ignore */ }
  }

  async likeScript(scriptId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('script_likes')
        .insert({ script_id: scriptId, user_id: userId });
      if (!error) {
        await supabase.rpc('increment_like_count', { script_id: scriptId });
      }
      return !error;
    } catch {
      return false;
    }
  }

  async unlikeScript(scriptId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('script_likes')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId);
      if (!error) {
        await supabase.rpc('decrement_like_count', { script_id: scriptId });
      }
      return !error;
    } catch {
      return false;
    }
  }

  async hasLiked(scriptId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('script_likes')
        .select('id')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .single();
      return !!data;
    } catch {
      return false;
    }
  }

  async favoriteScript(scriptId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('script_favorites')
        .insert({ script_id: scriptId, user_id: userId });
      return !error;
    } catch {
      return false;
    }
  }

  async unfavoriteScript(scriptId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('script_favorites')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  }

  async getFavorites(userId: string): Promise<ScriptTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('script_favorites')
        .select('script_id')
        .eq('user_id', userId);

      if (error || !data?.length) return [];

      const ids = data.map((d: any) => d.script_id);
      const { data: scripts } = await supabase
        .from('script_templates')
        .select('*')
        .in('id', ids);

      return (scripts || []).map(this.mapDbToTemplate);
    } catch {
      return [];
    }
  }

  async rateScript(scriptId: string, userId: string, rating: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('script_ratings')
        .upsert({ script_id: scriptId, user_id: userId, rating }, { onConflict: 'script_id,user_id' });
      return !error;
    } catch {
      return false;
    }
  }

  async getRating(scriptId: string): Promise<{ average: number; count: number }> {
    try {
      const { data } = await supabase
        .from('script_ratings')
        .select('rating')
        .eq('script_id', scriptId);

      if (!data?.length) return { average: 0, count: 0 };
      const sum = data.reduce((a: number, b: any) => a + b.rating, 0);
      return { average: sum / data.length, count: data.length };
    } catch {
      return { average: 0, count: 0 };
    }
  }

  async getPopular(limit = 10): Promise<ScriptTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('script_templates')
        .select('*')
        .eq('is_public', true)
        .order('like_count', { ascending: false })
        .limit(limit);

      if (error) return [];
      return (data || []).map(this.mapDbToTemplate);
    } catch {
      return [];
    }
  }

  private mapDbToTemplate(data: any): ScriptTemplate {
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      category: data.category || 'custom',
      tags: data.tags || [],
      commands: data.commands || [],
      author: data.author || 'Anonymous',
      authorId: data.user_id,
      isPublic: data.is_public ?? true,
      isOfficial: false,
      usageCount: data.usage_count || 0,
      likeCount: data.like_count || 0,
      rating: 0,
      documentContent: data.document_content,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
