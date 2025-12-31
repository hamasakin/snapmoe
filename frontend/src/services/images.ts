import { supabase } from '../lib/supabase'
import { uploadFromUrlToR2, deleteFromR2 } from '../lib/r2'

export const imagesAPI = {
  /**
   * 获取图片列表
   */
  async getImages(params: {
    page?: number
    pageSize?: number
    website?: string
  }) {
    const { page = 1, pageSize = 20, website } = params
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('images')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (website) {
      query = query.eq('source_website', website)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize
    }
  },

  /**
   * 上传图片（从 URL）
   */
  async uploadImageFromUrl(imageData: {
    original_url: string
    source_website: string
    source_page_url?: string
    title?: string
  }) {
    // 1. 检查是否已存在
    const { data: existing } = await supabase
      .from('images')
      .select('*')
      .eq('original_url', imageData.original_url)
      .single()

    if (existing) {
      return existing
    }

    // 2. 下载并上传到 R2
    const r2Result = await uploadFromUrlToR2(imageData.original_url)

    // 3. 检查哈希去重
    const { data: existingHash } = await supabase
      .from('images')
      .select('*')
      .eq('file_hash', r2Result.fileHash)
      .single()

    if (existingHash) {
      return existingHash
    }

    // 4. 保存元数据到 Supabase
    const { data: newImage, error } = await supabase
      .from('images')
      .insert({
        original_url: imageData.original_url,
        r2_url: r2Result.r2Url,
        r2_path: r2Result.r2Path,
        source_website: imageData.source_website,
        source_page_url: imageData.source_page_url,
        title: imageData.title,
        width: r2Result.width,
        height: r2Result.height,
        file_size: r2Result.fileSize,
        file_hash: r2Result.fileHash,
        mime_type: r2Result.mimeType
      })
      .select()
      .single()

    if (error) throw error

    return newImage
  },

  /**
   * 删除图片
   */
  async deleteImage(imageId: string) {
    // 1. 获取图片信息
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('r2_path')
      .eq('id', imageId)
      .single()

    if (fetchError) throw fetchError

    // 2. 从 R2 删除文件
    await deleteFromR2(image.r2_path)

    // 3. 从数据库删除
    const { error: deleteError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)

    if (deleteError) throw deleteError
  },

  /**
   * 更新图片信息
   */
  async updateImage(imageId: string, data: { title?: string }) {
    const { error } = await supabase
      .from('images')
      .update(data)
      .eq('id', imageId)

    if (error) throw error
  }
}

export const websitesAPI = {
  async getWebsites() {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .order('image_count', { ascending: false })

    if (error) throw error
    return data
  }
}
