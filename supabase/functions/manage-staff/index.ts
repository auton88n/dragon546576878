import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffAction {
  action: "create" | "update-password" | "update-profile" | "toggle-active";
  userId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  role?: "scanner" | "manager" | "support";
  isActive?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's JWT to verify admin role
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get calling user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Not admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: StaffAction = await req.json();
    console.log("Action:", body.action, "by admin:", user.email);

    switch (body.action) {
      case "create": {
        if (!body.email || !body.password || !body.fullName || !body.role) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if email already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some(
          (u) => u.email?.toLowerCase() === body.email!.toLowerCase()
        );

        if (emailExists) {
          return new Response(
            JSON.stringify({ error: "Email already exists" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create user in auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { full_name: body.fullName },
        });

        if (createError) {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Assign role
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role: body.role });

        if (roleInsertError) {
          console.error("Role insert error:", roleInsertError);
          // Cleanup: delete created user
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return new Response(
            JSON.stringify({ error: "Failed to assign role" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Created staff:", body.email, "role:", body.role);
        return new Response(
          JSON.stringify({ success: true, userId: newUser.user.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-password": {
        if (!body.userId || !body.password) {
          return new Response(
            JSON.stringify({ error: "Missing user ID or password" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          body.userId,
          { password: body.password }
        );

        if (updateError) {
          console.error("Update password error:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Password updated for user:", body.userId);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-profile": {
        if (!body.userId) {
          return new Response(
            JSON.stringify({ error: "Missing user ID" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profile
        const profileUpdates: Record<string, unknown> = {};
        if (body.fullName !== undefined) profileUpdates.full_name = body.fullName;
        if (body.phone !== undefined) profileUpdates.phone = body.phone;

        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdates)
            .eq("id", body.userId);

          if (profileError) {
            console.error("Profile update error:", profileError);
            return new Response(
              JSON.stringify({ error: "Failed to update profile" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Update role if provided
        if (body.role) {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .update({ role: body.role })
            .eq("user_id", body.userId);

          if (roleError) {
            console.error("Role update error:", roleError);
            return new Response(
              JSON.stringify({ error: "Failed to update role" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        console.log("Profile updated for user:", body.userId);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "toggle-active": {
        if (!body.userId || body.isActive === undefined) {
          return new Response(
            JSON.stringify({ error: "Missing user ID or active status" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profile is_active
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_active: body.isActive })
          .eq("id", body.userId);

        if (profileError) {
          console.error("Toggle active error:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to update status" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Ban/unban user in auth
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
          body.userId,
          { ban_duration: body.isActive ? "none" : "876000h" } // ~100 years if inactive
        );

        if (banError) {
          console.error("Ban toggle error:", banError);
        }

        console.log("User", body.userId, "active:", body.isActive);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
