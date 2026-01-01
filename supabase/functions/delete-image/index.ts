import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { file_hash } = body

    if (!file_hash) {
      throw new Error('Missing file_hash parameter')
    }

    console.log('[Delete Image] Received file_hash:', file_hash)

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // First, check if image exists
    const { data: existingImages, error: queryError } = await supabaseClient
      .from('images')
      .select('id, original_url, r2_path')
      .eq('file_hash', file_hash)

    if (queryError) {
      console.error('[Delete Image] Query error:', queryError)
      throw queryError
    }

    console.log('[Delete Image] Found images:', existingImages?.length || 0)
    if (existingImages && existingImages.length > 0) {
      console.log('[Delete Image] First image:', existingImages[0])
    }

    if (!existingImages || existingImages.length === 0) {
      throw new Error(`Image not found with file_hash: ${file_hash}`)
    }

    // Delete all image records with the same file_hash (for deduplication)
    const { error: deleteError, count } = await supabaseClient
      .from('images')
      .delete({ count: 'exact' })
      .eq('file_hash', file_hash)

    if (deleteError) {
      console.error('[Delete Image] Delete error:', deleteError)
      throw deleteError
    }

    console.log('[Delete Image] Delete operation completed, affected rows:', count)

    // 如果删除了 0 条记录，说明有问题（可能是权限或并发问题）
    if (!count || count === 0) {
      throw new Error(`Delete operation failed: found images but deleted 0 records (file_hash: ${file_hash})`)
    }

    console.log('[Delete Image] Successfully deleted', count, 'record(s)')

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: count,
        message: `Successfully deleted ${count} image record(s)`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
