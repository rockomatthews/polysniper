import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const getClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase server env vars");
  }
  return createClient(supabaseUrl, supabaseKey);
};

export async function GET() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("bot_controls")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from("bot_controls")
      .insert({ armed: false, live_trading: false })
      .select("*")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json(inserted);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getClient();
  const body = (await request.json()) as {
    armed?: boolean;
    live_trading?: boolean;
  };

  const { data: existing } = await supabase
    .from("bot_controls")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    armed: body.armed ?? false,
    live_trading: body.live_trading ?? false,
    updated_at: new Date().toISOString()
  };

  if (!existing) {
    const { data, error } = await supabase
      .from("bot_controls")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("bot_controls")
    .update(payload)
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
