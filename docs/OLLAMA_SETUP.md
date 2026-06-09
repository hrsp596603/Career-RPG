# Career RPG: Ollama 語意分析系統環境設定指南

> [!TIP]
> **🍎 macOS 一鍵啟動快捷方案**：
> 如果您是 macOS 使用者，且已完成 Ollama 的安裝與模型建立（見下文第 1 與第 3 步），您可以直接雙擊專案根目錄下的 **`啟動初路.app`**。
> 該軟體會在背景啟動極輕量的 Node 伺服器並自動為您開啟瀏覽器控制面板（`http://localhost:9000`）。您能直接在網頁上**輕觸點擊（Mac 觸控板完美響應）**來一鍵啟停伺服器與 Ollama，即時查看伺服器運行日誌，免去一切終端機指令！

本專案使用 Ollama 作為本地端語意分析引擎。若您剛從 GitHub 下載此專案，請依照您的作業系統完成以下設定，方可正常使用「語意分析成果」與「回顧」功能。

---

## 1. 安裝 Ollama
請先前往 [Ollama 官方網站](https://ollama.com/) 下載並安裝適用於您作業系統的程式。

---

## 2. 設定環境變數 (解決跨域連線問題)

由於瀏覽器安全性限制 (CORS)，您必須設定環境變數以允許網頁連線至 Ollama。

### 🍎 macOS 環境
1.  **完全退出 Ollama** (點擊選單列圖示並選擇 Quit)。
2.  開啟 **終端機 (Terminal)**。
3.  輸入以下指令啟動：
    ```bash
    export OLLAMA_ORIGINS="*"
    ollama serve
    ```

### 🪟 Windows 環境
1.  **完全退出 Ollama** (在右下角工作列圖示點擊右鍵選擇 Quit)。
2.  根據您使用的終端機類型執行指令：
    *   **使用 PowerShell (預設)**:
        ```powershell
        $env:OLLAMA_ORIGINS="*"
        ollama serve
        ```
    *   **使用 命令提示字元 (CMD)**:
        ```cmd
        set OLLAMA_ORIGINS=*
        ollama serve
        ```
    *(註：若要永久生效，建議透過「系統內容 > 環境變數」新增 `OLLAMA_ORIGINS` 變數，值設為 `*`)*

---

## 3. 建立自定義模型 (Career Analyzer)

服務啟動後，請保留上述視窗，另外開啟一個新的終端機視窗，並進入專案根目錄執行以下指令：

1.  **下載基礎模型 (qwen2.5)**:
    ```bash
    ollama pull qwen2.5
    ```

2.  **根據 Modelfile 建立專屬模型**:
    ```bash
    ollama create career-analyzer -f CareerAnalyzer.Modelfile
    ```

---

## 4. 驗證設定是否成功

1.  在瀏覽器網址列輸入：`http://localhost:11434`
    *   看到 **\"Ollama is running\"** 代表服務已啟動。
2.  開啟專案中的 `ollama-test.html` 進行測試：
    *   在輸入框輸入一段經歷。
    *   點擊「開始分析」。
    *   若能正確看到 JSON 格式的標籤回傳，代表一切設定就緒！

---

## 常見問題排查
*   **Failed to fetch**: 通常是因為沒有設定 `OLLAMA_ORIGINS="*"` 或是沒有重啟 Ollama 服務。
*   **Address already in use**: 代表背景已經有一個 Ollama 在執行，請務必先從工作列退出程式後再執行指令。
*   **Model not found**: 請確認已執行 `ollama create career-analyzer` 步驟。

祝您分析順利！🚀
