import { supabase } from "../lib/supabase";

export const imagesAPI = {
  /**
   * 获取图片列表（支持分页和无限滚动）
   */
  async getImages(params: {
    page?: number;
    offset?: number;
    pageSize?: number;
    website?: string | string[];
  }) {
    const { page, offset, pageSize = 20, website } = params;
    
    // 优先使用 offset（无限滚动），否则使用 page（向后兼容）
    const from = offset !== undefined ? offset : (page ? (page - 1) * pageSize : 0);
    const to = from + pageSize - 1;

    let query = supabase
      .from("images")
      .select("*", { count: "exact" })
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

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      items: data || [],
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
