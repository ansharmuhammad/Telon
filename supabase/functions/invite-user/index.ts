import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
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

    let invitedUser: Partial<User>;
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
        if (inviteError.message.includes('already been registered')) {
            // User exists, so we need to get their info from the public users table.
            const { data: existingUser, error: userFetchError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (userFetchError || !existingUser) {
                throw new Error('User already exists but could not be found to add to the board.');
            }
            invitedUser = { id: existingUser.id };
        } else {
            // A different, unexpected error occurred
            console.error("Invite error:", inviteError);
            throw new Error(`Failed to process invitation: ${inviteError.message}`);
        }
    } else {
        if (!inviteData || !inviteData.user) {
            throw new Error("Could not retrieve user data after sending invitation.");
        }
        invitedUser = inviteData.user;
    }

    const invitedUserId = invitedUser.id;

    if (!invitedUserId) {
      throw new Error("Could not determine the invited user's ID.");
    }

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
      throw new Error(`Failed to add user to the board: ${insertError.message}`);
    }

    const message = "Invitation processed successfully.";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})