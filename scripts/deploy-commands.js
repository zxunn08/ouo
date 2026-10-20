import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandBodies } from "../src/commands/definitions.js";

// 部署前先檢查必要設定，避免把空 Token 送到 Discord。
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  throw new Error("請確認 .env 已設定 DISCORD_TOKEN、CLIENT_ID、GUILD_ID。");
}

// REST 用於把 Slash Commands 註冊到 Discord；API v10 為 Discord API 版本。
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log("正在部署 N.O.V.A. 的 Slash Commands…");

  // Guild 指令適合開發：通常幾秒內就會出現在指定測試伺服器。
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commandBodies },
  );

  console.log("部署完成：N.O.V.A. 已接管測試軌道站。");
} catch (error) {
  console.error("指令部署失敗：", error);
}
