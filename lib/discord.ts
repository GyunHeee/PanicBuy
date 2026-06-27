import type { SignalLevel, SignalResult } from "../types";

const COLORS: Record<SignalLevel, number> = {
  caution: 3447003,
  neutral: 9807270,
  watch: 16776960,
  alert: 15158332
};

const EMOJIS: Record<SignalLevel, string> = {
  caution: "🔵",
  neutral: "⚪",
  watch: "🟡",
  alert: "🔴"
};

const LABELS: Record<SignalLevel, string> = {
  caution: "과열 구간",
  neutral: "평소",
  watch: "약한 신호 감지",
  alert: "강한 신호 감지"
};

function formatNumber(value: number, digits: number = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "데이터 없음";
}

// Sends a market signal to Discord using a webhook embed.
export async function sendDiscordSignal(signal: SignalResult): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is required to send Discord alerts");
  }

  const body = {
    embeds: [
      {
        title: `${EMOJIS[signal.signal]} 오늘의 시장 신호 (${signal.date})`,
        color: COLORS[signal.signal],
        description: signal.description,
        fields: [
          {
            name: "점수",
            value: `${formatNumber(signal.totalScore)}/100`,
            inline: true
          },
          { name: "단계", value: LABELS[signal.signal], inline: true },
          {
            name: "VIX",
            value: formatNumber(signal.rawValues.vix),
            inline: true
          },
          {
            name: "RSI",
            value: formatNumber(signal.rawValues.rsi),
            inline: true
          },
          {
            name: "200일선 대비",
            value: `${formatNumber(signal.rawValues.ma200Deviation)}%`,
            inline: true
          },
          {
            name: "10년물 금리 변화",
            value: `${formatNumber(signal.rawValues.rate10yChange)}%`,
            inline: true
          },
          {
            name: "공포탐욕지수",
            value:
              signal.rawValues.fearGreed === null
                ? "데이터 없음"
                : formatNumber(signal.rawValues.fearGreed),
            inline: true
          },
          {
            name: "근거",
            value:
              signal.conditionsMet.length > 0
                ? signal.conditionsMet.join("\n")
                : "특별한 근거 없음",
            inline: false
          }
        ],
        footer: {
          text: "이 정보는 투자 조언이 아닌 참고용 지표입니다."
        }
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed with HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("Discord webhook call failed", error);
    throw error;
  }
}
