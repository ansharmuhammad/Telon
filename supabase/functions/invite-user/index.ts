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
    const { data: { user: inviterUser } } = await supabase.auth.getUser()
    if (!inviterUser) throw new Error("User not authenticated")

    // Check if the person sending the invite is an admin of the board
    const { data: inviterData, error: inviterError } = await supabaseAdmin
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', inviterUser.id)
      .single()

    if (inviterError || inviterData?.role !== 'admin') {
        throw new Error("Only board admins can invite new members.")
    }

    // The inviteUserByEmail method handles both new and existing users.
    // It returns the user object and sends an invitation email.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      // This can happen for various reasons, e.g., if the email provider is down.
      console.error("Invite error:", inviteError);
      throw new Error(`Failed to process invitation: ${inviteError.message}`);
    }

    if (!inviteData || !inviteData.user) {
      throw new Error("Could not retrieve user data after sending invitation.");
    }

    const invitedUserId = inviteData.user.id;

    if (invitedUserId === inviterUser.id) {
      throw new Error("You cannot invite yourself.");
    }

    // Check if they are already a member of this board
    const { data: existingMember, error: memberCheckError } = await supabaseAdmin
      .from('board_members')
      .select('user_id')
      .eq('board_id', board_id)
      .eq('user_id', invitedUserId)
      .maybeSingle();

    if (memberCheckError) {
      throw new Error(`Database error when checking membership: ${memberCheckError.message}`);
    }

    if (existingMember) {
      throw new Error("User is already a member of this board.");
    }

    // Add the user to the board_members table
    const { error: insertError } = await supabaseAdmin
      .from('board_members')
      .insert({ board_id, user_id: invitedUserId, role: 'member' });

    if (insertError) {
      // If this fails, the user was invited but not added to the board.
      // This is a state we might want to handle, but for now, we'll just report the error.
      throw new Error(`Failed to add user to the board: ${insertError.message}`);
    }

    const message = "Invitation processed. An email has been sent to the user.";

    return new Response(JSON.stringify({ message }), {
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