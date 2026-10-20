import "dotenv/config";
import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";
import { handleRiftButton, startRift } from "./commands/rift.js";

// 這個 Bot 的核心只依賴 Slash Commands 與 Components。
// Guilds Intent 足夠，不需讀取一般聊天內容，對隱私也更友善。
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 避免設定遺漏時出現難以理解的 Discord 登入錯誤。
if (!process.env.DISCORD_TOKEN) {
  throw new Error("找不到 DISCORD_TOKEN。請確認 .env 檔案存在且已正確填寫。");
}

// ready 代表 Bot 已完成登入並可開始接收互動。
client.once(Events.ClientReady, (readyClient) => {
  console.log(`N.O.V.A. 已上線：${readyClient.user.tag}`);
});

// 集中處理 Slash Commands、Buttons 等 Discord Interaction。
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 先處理 /rift 產生的 Button Interaction。
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("rift:")) {
        await handleRiftButton(interaction);
      }
      return;
    }

    // 非 Slash Command 的互動在這個入門專案中暫不處理。
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "rift") {
      await startRift(interaction);
      return;
    }

    if (interaction.commandName === "focus") {
      const minutes = interaction.options.getInteger("minutes", true);
      const goal = interaction.options.getString("goal") ?? "未指定，但艦橋相信你。";

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🧠 專注力場已展開")
            .setDescription(
              `**${interaction.user.username}** 將進入 **${minutes} 分鐘**專注狀態。`,
            )
            .addFields({ name: "本次任務", value: goal })
            .setFooter({ text: "N.O.V.A. 正在驅逐附近的摸魚蟲。" })
            .setTimestamp(),
        ],
      });
      return;
    }

    if (interaction.commandName === "hatch") {
      const pets = [
        ["🌙 月球水母", "會在你拖延時靜靜發光，造成巨大心理壓力。"],
        ["🍅 番茄鐘狐", "每 25 分鐘會把你的藉口叼去埋起來。"],
        ["🛰️ Wi-Fi 史萊姆", "只要你專注，牠就假裝網路斷線來保護你。"],
      ];
      const [petName, petTrait] = pets[Math.floor(Math.random() * pets.length)];

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle(`🥚 孵化成功：${petName}`)
            .setDescription(petTrait)
            .setFooter({ text: "正式版可將夢獸資料存入資料庫，實現永久養成。" }),
        ],
      });
      return;
    }

    if (interaction.commandName === "constellation") {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("✨ 軌道站星圖")
            .setDescription("星圖系統已啟動。每一次專注與裂隙救援都會為社群點亮星體。")
            .addFields(
              {
                name: "目前艦橋人口",
                value: `${interaction.guild?.memberCount ?? 0} 位艦員`,
                inline: true,
              },
              {
                name: "預測宇宙災害",
                value: "可能是週一，也可能是一場會議。",
                inline: true,
              },
            )
            .setTimestamp(),
        ],
      });
    }
  } catch (error) {
    console.error("Interaction 處理失敗：", error);

    // 若尚未回覆，reply；若已回覆或 defer，則用 followUp 避免 Discord API 錯誤。
    const payload = {
      content: "N.O.V.A. 的咖啡機冒煙了。請稍後再試一次。",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
    } else if (interaction.isRepliable()) {
      await interaction.reply(payload);
    }
  }
});

// 使用 .env 中的 Token 建立 Gateway 連線。
client.login(process.env.DISCORD_TOKEN);
