import { SlashCommandBuilder } from "discord.js";

// 集中管理 Slash Command，讓部署與執行端共用同一份定義。
// Discord 指令主名稱使用小寫英文字，並提供繁中在 Discord 介面顯示。
export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName("focus")
    .setNameLocalizations({ "zh-TW": "專注" })
    .setDescription("啟動一段專注力場")
    .setDescriptionLocalizations({ "zh-TW": "啟動一段專注力場" })
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("本次專注分鐘數")
        .setRequired(true)
        .setMinValue(5)
        .setMaxValue(180),
    )
    .addStringOption((option) =>
      option
        .setName("goal")
        .setDescription("想完成什麼？可不填")
        .setRequired(false)
        .setMaxLength(100),
    ),

  new SlashCommandBuilder()
    .setName("hatch")
    .setNameLocalizations({ "zh-TW": "孵化" })
    .setDescription("開啟一顆不可預測的夢獸蛋")
    .setDescriptionLocalizations({ "zh-TW": "開啟一顆不可預測的夢獸蛋" }),

  new SlashCommandBuilder()
    .setName("rift")
    .setNameLocalizations({ "zh-TW": "裂隙" })
    .setDescription("啟動一場全服協作的裂隙救援")
    .setDescriptionLocalizations({ "zh-TW": "啟動一場全服協作的裂隙救援" }),

  new SlashCommandBuilder()
    .setName("constellation")
    .setNameLocalizations({ "zh-TW": "星圖" })
    .setDescription("查看軌道站的社群星圖")
    .setDescriptionLocalizations({ "zh-TW": "查看軌道站的社群星圖" }),
];

// REST API 需要純 JSON，因此在這裡統一轉換。
export const commandBodies = commandDefinitions.map((command) => command.toJSON());
