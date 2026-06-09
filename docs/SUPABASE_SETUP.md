# Supabase 會員系統與資料庫設定指南 (SUPABASE_SETUP.md)

本指南說明如何為 Career RPG (初路) 專案設定後台會員系統、資料庫同步，以及啟用 Google 帳號第三方登入。

---

## 1. Supabase 專案與資料表設定

### 步驟 A. 建立專案
1. 前往 [Supabase 官網](https://supabase.com/) 登入並建立一個新的專案 (New Project)。
2. 在建立過程中，設定您的專案名稱、資料庫密碼，並選擇靠近您的地理區域 (例如 Tokyo 或 Singapore)。

### 步驟 B. 初始化資料庫表與 RLS 規則
1. 進入 Supabase 專案控制面板後，點選左側導航欄的 **SQL Editor**。
2. 點擊 **New Query**，複製並貼入以下 SQL 腳本（此備份亦存於專案根目錄的 `schema.sql` 之中）：

```sql
-- 1. 建立儲存使用者測驗進度的資料表
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    record_name TEXT NOT NULL,
    progress_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 啟用 Row Level Security (RLS) 安全防護
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- 3. 建立 RLS 策略 (Policies) - 僅允許登入使用者操作屬於自己的資料
CREATE POLICY "Users can insert their own progress" 
ON public.user_progress FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own progress" 
ON public.user_progress FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.user_progress FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" 
ON public.user_progress FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
```
3. 點擊 **Run** 執行。執行成功後即建表完成，且已具備嚴格的隱私安全隔離。

---

## 2. 本地環境變數配置

1. 在專案根目錄下，開啟或建立 **`.env`** 檔案。
2. 前往 Supabase 專案控制面板的 **Project Settings** ➔ **API**。
3. 複製 **Project URL** 與 **anon/public API Key**，並寫入 `.env` 檔案中：

```env
SUPABASE_URL="您的_SUPABASE_PROJECT_URL"
SUPABASE_ANON_KEY="您的_SUPABASE_ANON_KEY"
```

---

## 3. Email 驗證與啟用設定 (Enforce Verification)

為確保使用者帳號安全，且符合「註冊後必須先進行信箱驗證才能登入」的流程，請進行以下設定：

1. 前往 Supabase 專案控制面板，點擊左側 **Authentication** ➔ **Providers**。
2. 點開 **Email** 提供商設定區塊。
3. 確保 **Confirm email** 已**開啟 (Enabled)**。
4. 確保 **Auto-confirm users** 已**關閉 (Disabled)**。
5. 點擊 **Save** 儲存。
*(啟用此設定後，新註冊的帳號會收到一封包含驗證連結的 Email，使用者點擊驗證後，才能以該帳密順利登入。)*

---

## 4. Google 帳號第三方登入設定 (OAuth 2.0)

為了在登入頁面啟用 **「Google 帳號登入 / 註冊」** 按鈕，請完成以下對接設定：

### 步驟 A. 獲取 Google 憑證
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 建立新專案或選擇現有專案，並進入 **「API 和服務」** ➔ **「憑證」**。
3. 點擊 **「+ 建立憑證」** ➔ **「OAuth 用戶端 ID」**（如尚未設定 OAuth 同意畫面，請先依引導設定，應用程式類型選擇「外部」，填寫必填欄位即可）。
4. 用戶端類型選擇 **「網頁應用程式」**。
5. 點擊建立後，您會獲得：
   *   **用戶端 ID (Client ID)**
   *   **用戶端密鑰 (Client Secret)** (請務必將此視窗往下拉，或是點擊「下載 JSON」以獲取金鑰值)

### 步驟 B. 啟用 Supabase 上的 Google 提供商
1. 回到 Supabase 專案控制面板，點擊左側 **Authentication** ➔ **Sign In / Providers**。
2. 在清單中點開 **Google** 並切換為 **Enabled (啟用)**。
3. 將剛才在 Google 獲得的 **Client ID** 與 **Client Secret** 貼入對應的欄位中。
4. 複製 Supabase 此設定頁面中顯示的 **Redirect URI**（重新導向 URI）。
5. 點擊 **Save** 儲存。

### 步驟 C. 設定 Google 重新導向授權
1. 回到 Google Cloud Console 剛剛建立的 OAuth 憑證編輯頁面。
2. 尋找 **「已授權的重新導向 URI」** 區塊，點擊「新增 URI」，將剛剛從 Supabase 複製的 **Redirect URI** 貼入。
3. 同時，在 **「已授權的 JavaScript 來源」** 區塊，新增本地網址 `http://localhost:8787` 與 `http://localhost:5500`（若您使用 Live Server）。
4. 點擊 **「儲存」**。

---

## 5. 本地開發與執行

由於本專案為 **Cloudflare Pages + Functions** 架構，在本地進行測試時，**請勿**使用 `npx wrangler dev`。請依照以下步驟執行：

### 步驟 A. 啟動 Pages 本地伺服器
在專案根目錄的終端機執行：
```bash
npx wrangler pages dev . --port 8787
```
*(伺服器將在 `http://localhost:8787` 啟動，並自動編譯並載入 `functions/` 下的所有後端 API)*

### 步驟 B. 開啟網頁進行測試
*   **後台登入/管理中心**：[http://localhost:8787/dashboard.html](http://localhost:8787/dashboard.html)
*   **探索問卷首頁**：[http://localhost:8787/index.html](http://localhost:8787/index.html)

> [!TIP]
> **智慧跨埠相容機制**：
> 如果您習慣使用 VS Code Live Server (例如連接埠 5500) 開啟網頁開發，我們已在前端加入了**自動跨埠回退機制**。網頁會自動向執行中的 `localhost:8787` 索取 Supabase 設定資訊，您依然可以無縫進行登入與同步測試！

---

## 6. 常見問題與排錯 (Troubleshooting)

### Q. 註冊時出現「註冊嘗試次數過於頻繁（已超出 Supabase 郵件發送限制）」？
*   **原因**：Supabase 為了防範垃圾郵件，預設啟用了極為嚴格的 Email 速率限制（預設通常為：同一個 IP/Email 每小時限制發送 **3 封驗證信**）。在開發測試期間若多次點擊註冊，很容易觸發此平台級限制。
*   **解決方式一：調整 Supabase 速率限制**
    1. 登入 [Supabase 專案控制面板](https://supabase.com/)。
    2. 點選左下角的 **Project Settings (專案設定)** ➔ **Authentication (驗證設定)**。
    3. 向下滾動找到 **Rate Limits (速率限制)** 區塊。
    4. 將 **Email Rate Limit**（以及 **SMS Rate Limit**，如果適用）的數值從預設的 `3` 調大（例如調至 `30` 或更大），然後點選儲存。
*   **解決方式二：開發期間暫時關閉驗證 (快速排錯)**
    1. 點選左側的 **Authentication** ➔ **Providers**。
    2. 點開 **Email** 選項，暫時將 **Confirm email** 設為 **關閉 (Disabled)** 並儲存。
    3. 此時註冊將不再需要信箱驗證，可以直接登入測試。*(注意：生產環境上線時請務必重新開啟此設定。)*

