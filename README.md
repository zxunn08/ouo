# N.O.V.A. 夢航守夜員

一個結合自習、電子寵物與全服協作危機的 Discord Bot。N.O.V.A. 是墜毀在 Discord 軌道站的未來管家 AI：它協助成員專注，同時用浮誇又溫暖的方式處理宇宙級摸魚事故。

## 功能

- `/focus minutes goal`：公開啟動一段專注力場。
- `/hatch`：隨機孵化一隻會吐槽的夢獸。
- `/rift`：開啟 60 秒的全服裂隙救援；成員按按鈕合作補滿儀表。
- `/constellation`：查看軌道站星圖與艦橋狀態。

## 需求

- Node.js 20 或以上。
- 一個 Discord 伺服器的管理權限。
- Discord Developer Portal 的 Application 與 Bot Token。

## 安裝與啟動

1. 複製環境變數範本：

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell 可使用：

   ```powershell
   Copy-Item .env.example .env
   ```

2. 編輯 `.env`，填入 `DISCORD_TOKEN`、`CLIENT_ID`、`GUILD_ID`。

3. 安裝依賴並部署 Slash Commands：

   ```bash
   npm install
   npm run deploy
   npm start
   ```

4. 到指定測試伺服器輸入 `/rift`，邀請其他成員共同封鎖裂隙。

## Discord Developer Portal 設定

1. 前往 https://discord.com/developers/applications，建立 Application。
2. 在 **General Information** 複製 Application ID 到 `.env` 的 `CLIENT_ID`。
3. 在 **Bot** 建立 Bot 並取得 Token，填入 `DISCORD_TOKEN`。Token 外流時請立刻重設。
4. 到 **OAuth2 → URL Generator** 勾選 `bot` 和 `applications.commands`，並授予 `Send Messages`、`Embed Links`、`Read Message History`。
5. 開啟 Discord 開發者模式，右鍵測試伺服器並複製 Server ID 到 `GUILD_ID`。

本專案只使用 `Guilds` Gateway Intent；不會讀取一般聊天內容，因此不需要開啟 Privileged Gateway Intents。若未來新增訊息內容分析功能，才需在 Developer Portal 開啟 `Message Content Intent`，並同步調整程式的 intents。

## 正式上線前建議

- 將 `riftSessions` 由記憶體 Map 改存入 Redis 或資料庫。
- 為 `/focus` 加上計時完成按鈕、夢獸經驗值與每日任務。
- 使用環境變數管理 Token，並保持 `.env` 不進版控。
