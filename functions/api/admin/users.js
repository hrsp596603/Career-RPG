export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 處理跨網域 Preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 讀取環境變數
  let supabaseUrl = env.SUPABASE_URL || env.supabase_url || "";
  let supabaseAnonKey = env.SUPABASE_ANON_KEY || env.supabase_anon_key || "";
  let supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_service_role_key || 
                           env.SUPABASE_SECRET_KEYS || env.supabase_secret_keys || 
                           env.SUPABASE_SERVICE_ROLE || env.supabase_service_role || "";

  // 去除可能包夾的雙引號或單引號，防止本地開發時的解析錯誤
  supabaseUrl = supabaseUrl.replace(/^["']|["']$/g, "").trim();
  supabaseAnonKey = supabaseAnonKey.replace(/^["']|["']$/g, "").trim();
  supabaseServiceKey = supabaseServiceKey.replace(/^["']|["']$/g, "").trim();

  console.log("DEBUG ENV:", { supabaseUrl, supabaseAnonKey, supabaseServiceKey });

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "伺服器環境變數設定未完成，請確認有填寫 SUPABASE_SERVICE_ROLE 等金鑰。" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 1. 驗證呼叫者身分 (確認 JWT)
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "未授權：遺失 Authorization 憑證" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 呼叫 Supabase Auth 驗證 token 的有效性
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      const errData = await userResponse.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: `憑證無效：${errData.msg || userResponse.statusText}` }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const callerUser = await userResponse.json();
    
    // 檢查是否具有 admin 角色
    const isAdmin = callerUser.app_metadata && callerUser.app_metadata.role === "admin";
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "權限不足：您並非管理員" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. 根據 Method 執行對應動作
    if (method === "GET") {
      // 取得所有使用者列表 (Admin)
      const usersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "GET",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`
        }
      });

      if (!usersResponse.ok) {
        const errData = await usersResponse.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: `取得使用者失敗：${errData.msg || usersResponse.statusText}` }), {
          status: usersResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const usersData = await usersResponse.json();
      return new Response(JSON.stringify(usersData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });

    } else if (method === "DELETE") {
      // 刪除指定使用者 (Admin)
      const targetUserId = url.searchParams.get("id");
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "缺少參數 id" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // 禁止自我刪除
      if (targetUserId === callerUser.id) {
        return new Response(JSON.stringify({ error: "不允許刪除自己本身" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
        method: "DELETE",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`
        }
      });

      if (!deleteResponse.ok) {
        const errData = await deleteResponse.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: `刪除使用者失敗：${errData.msg || deleteResponse.statusText}` }), {
          status: deleteResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "使用者已成功刪除" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ error: "不支援的 HTTP 方法" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `伺服器內部錯誤：${err.message}` }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
