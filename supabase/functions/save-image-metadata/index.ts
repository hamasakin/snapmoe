import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Validate required fields
    const requiredFields = [
      'original_url',
      'r2_url',
      'r2_path',
      'source_website',
      'source_page_url',
      'file_hash',
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

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

    // Insert image metadata
    const { error } = await supabaseClient.from('images').insert({
      original_url: body.original_url,
      r2_url: body.r2_url,
      r2_path: body.r2_path,
      source_website: body.source_website,
      source_page_url: body.source_page_url,
      title: body.title,
      width: body.width || 0,
      height: body.height || 0,
      file_size: body.file_size || 0,
      file_hash: body.file_hash,
      mime_type: body.mime_type,
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image metadata saved successfully',
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
