import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { board_id, email } = await req.json()
    if (!board_id || !email) {
      throw new Error("Board ID and email are required.")
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Create a client to authenticate the user making the request
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    // Get the user to be invited from the public users table
    const { data: invitedUserData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !invitedUserData) {
      throw new Error("User not found. Please ensure the user has an account with this app.")
    }
    const invitedUserId = invitedUserData.id
    
    if (invitedUserId === user.id) {
        throw new Error("You cannot invite yourself.")
    }

    // Check if the person sending the invite is an admin of the board
    const { data: inviterData, error: inviterError } = await supabaseAdmin
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', user.id)
      .single()

    if (inviterError || inviterData?.role !== 'admin') {
        throw new Error("Only board admins can invite new members.")
    }

    // Add the new user to the board_members table
    const { error: insertError } = await supabaseAdmin
      .from('board_members')
      .insert({ board_id, user_id: invitedUserId, role: 'member' })

    if (insertError) {
      if (insertError.code === '23505') { // unique constraint violation
        throw new Error("User is already a member of this board.")
      }
      throw insertError
    }

    return new Response(JSON.stringify({ message: "User invited successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})