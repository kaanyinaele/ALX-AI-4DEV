import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify poll ownership
    const { data: poll } = await supabase
      .from("polls")
      .select("created_by")
      .eq("id", params.id)
      .single();

    if (!poll || poll.created_by !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete poll (cascading delete will handle options and votes)
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", params.id);

    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
