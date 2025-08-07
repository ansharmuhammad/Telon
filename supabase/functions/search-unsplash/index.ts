/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY')

    if (!accessKey) {
      throw new Error('Unsplash API key is not configured.')
    }

    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`)
    }

    const data = await response.json()

    const images = data.results.map((img: any) => ({
      id: img.id,
      fullUrl: img.urls.full,
      thumbUrl: img.urls.thumb,
      userName: img.user.name,
      userLink: img.user.links.html,
      alt: img.alt_description,
    }))

    return new Response(
      JSON.stringify(images),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})