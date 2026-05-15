export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { text } = await request.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "你是一個專業的職涯標籤辨識系統。任務：從以下【標籤庫】選出最符合的 2-3 個標籤。規則：1.只能從庫中選取。2.僅輸出 JSON：{\"tags\": [\"標籤1\", \"標籤2\"]}。標籤庫：C01: 高度專業資訊轉譯, C02: 非結構化需求釐清, C03: 繁雜數據與模式歸納, C04: 抽象概念具象化實作, C05: 長週期專案里程碑拆解, C06: 常規作業流程優化與建構, C07: 跨部門與多方共識斡旋, C08: 逆境條件下的資源重組與應變, C09: 實體環境與服務動線佈署, C10: 投入時機與資源進場判斷, E01: 高強度情緒勞動承載, E02: 跨階層角色動態切換, E03: 目標高頻變動之適應力, E04: 高不確定性決策承擔, E05: 商業利益與專業倫理權衡, E06: 極低容錯率之精準產出壓力, E07: 高密度感官刺激環境適應, E08: 低刺激環境下的專注耐受度, E09: 無外部支撐下的自律穩定度, E10: 工作與生活邊界模糊之負荷, E11: 持續性體能勞動之生理耗損, E12: 精細操作之持續性體能消耗, R01: 法定特許與學歷檢核門檻, R02: 特定產業社群網絡依賴度, R03: 長期投入與延遲回報結構, R04: 封閉系統內專有技能沉沒成本, R05: 初期專業設備與財務資本墊付, R06: 非固定收益之現金流風險, R07: 特定地理位置與場域綁定限制, R08: 高頻率地理移動與通勤成本, R09: 非常規作息與生理節律負荷, R10: 領域專有工具與技術的入門門檻, S01: 口語表達與即時溝通, S02: 結構化書面輸出, S03: 視覺化資訊呈現, S04: 通用數位工具整合應用, S05: 數據讀取與基礎分析操作, S06: 跨平台數位溝通與協作, S07: 大肌肉動作執行, S08: 小肌肉精細操作, S09: 實體空間操作與設備使用"
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || "Groq API 呼叫失敗" }), { 
            status: response.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}
