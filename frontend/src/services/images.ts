import { supabase } from "../lib/supabase";
import type { Tag } from "../lib/supabase";

export const imagesAPI = {
  /**
   * 获取图片列表（支持分页和无限滚动）
   */
  async getImages(params: {
    page?: number;
    offset?: number;
    pageSize?: number;
    website?: string | string[];
    tags?: string[];
  }) {
    const { page, offset, pageSize = 20, website, tags } = params;
    
    // 优先使用 offset（无限滚动），否则使用 page（向后兼容）
    const from = offset !== undefined ? offset : (page ? (page - 1) * pageSize : 0);
    const to = from + pageSize - 1;

    // 如果指定了tags筛选，需要先通过image_tags表找到对应的图片ID
    let imageIds: string[] | undefined;
    if (tags && tags.length > 0) {
      // 对每个tag获取图片ID集合，然后取交集（图片必须包含所有选中的tag）
      const tagImageIdSets: Set<string>[] = [];
      for (const tagId of tags) {
        const { data: tagData, error: tagError } = await supabase
          .from("image_tags")
          .select("image_id")
          .eq("tag_id", tagId);
        
        if (tagError) throw tagError;
        tagImageIdSets.push(new Set(tagData?.map(item => item.image_id) || []));
      }
      
      // 取交集：图片必须包含所有选中的tag
      if (tagImageIdSets.length > 0) {
        const intersection = tagImageIdSets.reduce((acc, set) => {
          return new Set([...acc].filter(id => set.has(id)));
        }, tagImageIdSets[0] || new Set());
        
        imageIds = Array.from(intersection);
      } else {
        imageIds = [];
      }
      
      // 如果没有匹配的图片，直接返回空结果
      if (imageIds.length === 0) {
        return {
          items: [],
          total: 0,
          page: page || Math.floor(from / pageSize) + 1,
          pageSize,
        };
      }
    }

    let query = supabase
      .from("images")
      .select("*, tags:image_tags(tag:tags(*))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (website) {
      if (Array.isArray(website) && website.length > 0) {
        // 支持多个网站筛选
        query = query.in("source_website", website);
      } else if (typeof website === "string") {
        // 向后兼容单个网站筛选
        query = query.eq("source_website", website);
      }
    }

    if (imageIds && imageIds.length > 0) {
      query = query.in("id", imageIds);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // 处理tags数据，将嵌套结构转换为数组
    const items = (data || []).map((item: any) => ({
      ...item,
      tags: (item.tags || []).map((t: any) => t.tag).filter(Boolean) as Tag[],
    }));

    return {
      items,
      total: count || 0,
      page: page || Math.floor(from / pageSize) + 1,
      pageSize,
    };
  },

  /**
   * 删除图片（通过 file_hash）
   * 只删除数据库记录，不删除 R2 文件
   */
  async deleteImage(imageId: string) {
    // 1. 获取图片的 file_hash
    const { data: image, error: fetchError } = await supabase
      .from("images")
      .select("file_hash")
      .eq("id", imageId)
      .single();

    if (fetchError) throw fetchError;
    if (!image) throw new Error("图片不存在");

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("缺少 Supabase 配置");
    }

    // 2. 调用 Edge Function 删除数据库记录（使用 file_hash）
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/delete-image`;
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        file_hash: image.file_hash,
      }),
    });

    if (!edgeResponse.ok) {
      const errorData = await edgeResponse
        .json()
        .catch(() => ({ error: "删除失败" }));
      throw new Error(errorData.error || "Edge Function 调用失败");
    }

    const edgeResult = await edgeResponse.json();
    if (!edgeResult.success) {
      throw new Error(edgeResult.error || "删除数据库记录失败");
    }
  },

  /**
   * 更新图片信息
   */
  async updateImage(imageId: string, data: { title?: string }) {
    const { error } = await supabase
      .from("images")
      .update(data)
      .eq("id", imageId);

    if (error) throw error;
  },
};

export const websitesAPI = {
  async getWebsites() {
    const { data, error } = await supabase
      .from("websites")
      .select("*")
      .order("image_count", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export const tagsAPI = {
  /**
   * 获取所有tags
   */
  async getTags() {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * 创建tag（如果不存在）
   */
  async createTag(name: string) {
    // 先尝试查找是否已存在
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("name", name)
      .single();

    if (existing) {
      return existing;
    }

    // 不存在则创建
    const { data, error } = await supabase
      .from("tags")
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 为图片添加tag
   */
  async addTagToImage(imageId: string, tagId: string) {
    const { error } = await supabase
      .from("image_tags")
      .insert({ image_id: imageId, tag_id: tagId });

    if (error) {
      // 如果是唯一约束错误，说明tag已经存在，忽略
      if (error.code === "23505") {
        return;
      }
      throw error;
    }
  },

  /**
   * 为图片删除tag
   */
  async removeTagFromImage(imageId: string, tagId: string) {
    const { error } = await supabase
      .from("image_tags")
      .delete()
      .eq("image_id", imageId)
      .eq("tag_id", tagId);

    if (error) throw error;
  },

  /**
   * 获取图片的所有tags
   */
  async getImageTags(imageId: string) {
    const { data, error } = await supabase
      .from("image_tags")
      .select("tag:tags(*)")
      .eq("image_id", imageId);

    if (error) throw error;
    return (data || []).map((item: any) => item.tag).filter(Boolean) as Tag[];
  },
};
