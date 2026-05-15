export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. 取得前端傳來的內容
    const { text } = await request.json();

    // 2. 呼叫 Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`, // 這邊會從 Cloudflare 設定中讀取
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // 使用 llama3 模型
        messages: [
          {
            role: "system",
            content: "你是一個職涯標籤辨識系統。請根據經歷選出最符合的 2-3 個標籤，僅輸出 JSON 格式，不要有任何其他文字說明，格式範例：{\"tags\": [\"標籤1\", \"標籤2\"]}"
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || "Groq API 呼叫失敗" }), { status: response.status });
    }

    return new Response(JSON.stringify(data.choices[0].message.content), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
