import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { randomUUID } from "node:crypto";

// 記憶體版暫存：方便教學與本地測試。
// 正式環境請改為 Redis、PostgreSQL 或 MongoDB，避免 Bot 重啟後資料消失。
const riftSessions = new Map();

// 三種宇宙事件的目標數值不同，讓每次 /rift 有不同協作策略。
const PHENOMENA = [
  {
    title: "第七層夢境正在吞掉今日待辦",
    lore: "裂隙內傳出一句低語：『明天再做也可以。』情況極度危險。",
    color: 0x9b59b6,
    targets: { fuel: 4, anchor: 2, meme: 2 },
  },
  {
    title: "量子會議黑洞已吞噬所有議程",
    lore: "所有人都在說「我補充一下」，但沒有人知道要補充什麼。",
    color: 0x3498db,
    targets: { fuel: 2, anchor: 4, meme: 2 },
  },
  {
    title: "摸魚蟲群正在啃食伺服器生產力",
    lore: "牠們不怕殺蟲劑，只怕高濃度、精準投放的迷因。",
    color: 0xe67e22,
    targets: { fuel: 2, anchor: 2, meme: 4 },
  },
];

// 每個按鈕會補充一種儀表兩點。
// 同一位玩家不能重複按同種按鈕，避免一人狂點破關。
const ACTIONS = {
  fuel: {
    label: "⚡ 投入專注燃料",
    style: ButtonStyle.Primary,
    gain: 2,
    message: "把剛剛存下來的清醒意志倒進了反應爐。",
  },
  anchor: {
    label: "⚓ 部署現實錨點",
    style: ButtonStyle.Success,
    gain: 2,
    message: "用一句「先做五分鐘」把現實固定住了。",
  },
  meme: {
    label: "🛰️ 發射迷因誘餌",
    style: ButtonStyle.Secondary,
    gain: 2,
    message: "向宇宙發送了一張足以擊退摸魚蟲的梗圖。",
  },
};

// 將數值做成小型進度條，讓 Embed 像太空站儀表板。
function meter(current, target) {
  const blocks = 8;
  const filled = Math.min(blocks, Math.round((current / target) * blocks));

  return `${"█".repeat(filled)}${"░".repeat(blocks - filled)} ${Math.min(current, target)}/${target}`;
}

// 建立控制按鈕列；事件結束後統一鎖住。
function createControls(session, disabled = false) {
  return new ActionRowBuilder().addComponents(
    ...Object.entries(ACTIONS).map(([actionId, action]) =>
      new ButtonBuilder()
        // customId 是 Button Interaction 的識別碼：rift:場次ID:動作ID。
        .setCustomId(`rift:${session.id}:${actionId}`)
        .setLabel(action.label)
        .setStyle(action.style)
        .setDisabled(disabled),
    ),
  );
}

// 同一份函式負責建立進行中、成功與超時的畫面，避免 UI 文案散落各處。
function createRiftEmbed(session) {
  const { phenomenon, score, targets } = session;
  const secondsLeft = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000));

  let statusText = `⏱️ 剩下 **${secondsLeft} 秒**。每位成員每種按鈕只能操作一次。`;

  if (session.status === "resolved") {
    statusText =
      `✅ **裂隙已封鎖。** ${session.participants.size} 位艦員成功阻止今日待辦被宇宙蒸發。`;
  }

  if (session.status === "expired") {
    statusText =
      "❌ **訊號中斷。** 裂隙逃走了，並帶走了一句「晚點再處理」。";
  }

  return new EmbedBuilder()
    .setColor(session.status === "expired" ? 0x95a5a6 : phenomenon.color)
    .setTitle(`🚨 N.O.V.A. 警報：${phenomenon.title}`)
    .setDescription(`${phenomenon.lore}\n\n${statusText}`)
    .addFields(
      {
        name: "🎯 協作目標",
        value: "三條儀表都達標即可封鎖裂隙；數值超過不會造成傷害。",
      },
      {
        name: "⚡ 專注燃料",
        value: meter(score.fuel, targets.fuel),
        inline: false,
      },
      {
        name: "⚓ 現實錨點",
        value: meter(score.anchor, targets.anchor),
        inline: false,
      },
      {
        name: "🛰️ 迷因頻率",
        value: meter(score.meme, targets.meme),
        inline: false,
      },
      {
        name: "最後一筆艦橋日誌",
        value: session.lastAction,
      },
    )
    .setFooter({
      text: `N.O.V.A. // 協作艦員：${session.participants.size} 位`,
    })
    .setTimestamp();
}

// 判斷三種資源是否都已達標。
function isResolved(session) {
  return Object.entries(session.targets).every(
    ([key, target]) => session.score[key] >= target,
  );
}

// 統一回覆私密提示，避免失敗操作洗版公開頻道。
async function ephemeralNotice(interaction, content) {
  await interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  });
}

// 超時時直接編輯原始訊息，將按鈕鎖住。
async function expireSession(session) {
  if (session.status !== "active") return;

  session.status = "expired";
  clearTimeout(session.timer);

  try {
    await session.message.edit({
      embeds: [createRiftEmbed(session)],
      components: [createControls(session, true)],
    });
  } finally {
    // 保留五分鐘讓舊按鈕能收到「活動已結束」提示，再清理記憶體。
    setTimeout(() => riftSessions.delete(session.id), 5 * 60 * 1000);
  }
}

// /rift 的 Slash Command 執行入口。
export async function startRift(interaction) {
  const phenomenon = PHENOMENA[Math.floor(Math.random() * PHENOMENA.length)];

  const session = {
    id: randomUUID(),
    phenomenon,
    targets: phenomenon.targets,
    score: { fuel: 0, anchor: 0, meme: 0 },
    participants: new Set(),
    // Map<使用者 ID, Set<已使用的動作 ID>>
    usedActions: new Map(),
    status: "active",
    deadline: Date.now() + 60_000,
    lastAction: "控制台等待第一位願意拯救待辦事項的艦員。",
    message: null,
    timer: null,
  };

  // 先寫入 Map，再送出訊息，確保使用者一按按鈕就能找到對應場次。
  riftSessions.set(session.id, session);

  await interaction.reply({
    embeds: [createRiftEmbed(session)],
    components: [createControls(session)],
  });

  // 取得原始訊息，超時時才能直接把按鈕鎖住。
  session.message = await interaction.fetchReply();

  session.timer = setTimeout(() => {
    expireSession(session).catch((error) => {
      console.error("裂隙超時處理失敗：", error);
    });
  }, 60_000);
}

// Button Interaction 的執行入口，由 index.js 路由進來。
export async function handleRiftButton(interaction) {
  const [, sessionId, actionId] = interaction.customId.split(":");
  const session = riftSessions.get(sessionId);
  const action = ACTIONS[actionId];

  if (!session || !action) {
    await ephemeralNotice(interaction, "這個裂隙紀錄已蒸發到宇宙背景輻射中。");
    return;
  }

  if (session.status !== "active") {
    await ephemeralNotice(interaction, "此裂隙已結束，請等待下一場宇宙級事故。");
    return;
  }

  // 即使 timeout callback 尚未執行，也不允許壓線操作。
  if (Date.now() >= session.deadline) {
    await expireSession(session);
    await ephemeralNotice(interaction, "你抵達時裂隙剛好關門。下次快一秒！");
    return;
  }

  const userId = interaction.user.id;
  const usedByUser = session.usedActions.get(userId) ?? new Set();

  if (usedByUser.has(actionId)) {
    await ephemeralNotice(
      interaction,
      "N.O.V.A. 已記錄過你這種操作；重複按鈕只會讓儀表板覺得尷尬。",
    );
    return;
  }

  // 記錄操作與貢獻；因為一切先同步更新，快速多人點擊仍會累積到正確分數。
  usedByUser.add(actionId);
  session.usedActions.set(userId, usedByUser);
  session.participants.add(userId);
  session.score[actionId] += action.gain;
  session.lastAction = `**${interaction.user.username}** ${action.message}`;

  if (isResolved(session)) {
    session.status = "resolved";
    clearTimeout(session.timer);

    await interaction.update({
      embeds: [createRiftEmbed(session)],
      components: [createControls(session, true)],
    });

    setTimeout(() => riftSessions.delete(session.id), 5 * 60 * 1000);
    return;
  }

  // update() 會直接更新公開控制台，不額外洗出一則聊天訊息。
  await interaction.update({
    embeds: [createRiftEmbed(session)],
    components: [createControls(session)],
  });
}
