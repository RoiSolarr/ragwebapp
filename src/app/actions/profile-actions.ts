"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  _previousState: { error?: string; success?: boolean },
  formData: FormData,
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "You must be signed in to update your password." };
  const rawPassword = formData.get("password");
  const rawConfirmPassword = formData.get("confirmPassword");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmPassword = typeof rawConfirmPassword === "string" ? rawConfirmPassword : "";
  if (password.length < 6) return { error: "Your password must be at least 6 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    console.error("Password update error:", updateError);
    return { error: "Unable to update your password. Please try again." };
  }
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
