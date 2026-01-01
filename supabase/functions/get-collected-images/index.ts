import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get page URL from query params
    const url = new URL(req.url)
    const pageUrl = url.searchParams.get('pageUrl')

    if (!pageUrl) {
      throw new Error('Missing pageUrl parameter')
    }

    // Clean page URL
    const cleanPageUrl = pageUrl.split('?')[0].split('#')[0]

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

    // Query images for this page (include file_hash and r2_path for deletion)
    const { data, error } = await supabaseClient
      .from('images')
      .select('original_url, file_hash, r2_path')
      .eq('source_page_url', cleanPageUrl)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
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
