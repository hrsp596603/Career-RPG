export async function onRequestGet(context) {
  const { env } = context;

  // 取得環境變數（支援大寫與小寫命名，以防使用者在 .env 中寫錯）
  const supabaseUrl = env.SUPABASE_URL || env.supabase_url || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.supabase_anon_key || "";

  return new Response(JSON.stringify({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
