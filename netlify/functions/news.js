// Netlify Scheduled Function — 毎朝7:00 JST に自動実行
// netlify.toml に以下を追加:
// [[schedule]]
//   function = "news"
//   cron = "0 22 * * *"   # UTC 22:00 = JST 07:00

let cachedNews = null;
let cacheDate = null;

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // GET: キャッシュ済みニュースを返す
  if (event.httpMethod === "GET" || !event.httpMethod) {
    if (cachedNews && cacheDate) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ news: cachedNews, generatedAt: cacheDate, cached: true }),
      };
    }
    // キャッシュがなければその場で生成
    const result = await generateNews();
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  }

  // スケジューラーまたはPOSTで強制再生成
  const result = await generateNews();
  return { statusCode: 200, headers, body: JSON.stringify(result) };
};

async function generateNews() {
  const today = new Date();
  // JST変換
  const jst = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;

  const prompt = `あなたは採用・人事・労働市場の専門アナリストです。
今日（${dateStr}）の採用担当者向けニュースダッシュボードを生成してください。

以下のJSONのみ出力してください。前置き・マークダウン不要。

{
  "date": "${dateStr}",
  "generatedAt": "${jst.toISOString()}",
  "todayTrend": "今週の採用トレンドを2〜3文で要約。数字・キーワードを含めて具体的に。",
  "trendItems": [
    { "title": "トレンド①（10文字以内）", "desc": "30文字以内の説明" },
    { "title": "トレンド②", "desc": "30文字以内" },
    { "title": "トレンド③", "desc": "30文字以内" },
    { "title": "トレンド④", "desc": "30文字以内" }
  ],
  "topNews": {
    "title": "本日の最重要ニュースタイトル（30文字以内）",
    "summary": "150文字以内の要約。採用担当者の意思決定に直結する内容で。",
    "action": "今すぐ取るべき具体的なアクション（60文字以内）",
    "target": "影響を受ける企業タイプ（20文字以内）",
    "type": "critical"
  },
  "news": [
    {
      "id": 1,
      "type": "critical",
      "title": "ニュースタイトル（30文字以内）",
      "summary": "100〜150文字の要約。採用実務に即した具体的な内容で。",
      "points": ["重要ポイント①（40文字以内）", "重要ポイント②（40文字以内）", "重要ポイント③（40文字以内）"],
      "target": "影響を受ける企業タイプ（20文字以内）",
      "action": "取るべきアクション（80文字以内・明日から使えるレベルで）"
    }
  ]
}

newsは10件生成してください。
typeは以下から選択:
- "critical"（重要：採用に直接影響するニュース）
- "trend"（トレンド：業界の動向・変化）
- "law"（法改正：労働法・制度変更）
- "media"（媒体動向：求人媒体・採用チャネルの変化）

条件:
- 採用・人事・求人・労働市場に関する内容
- 中小企業の採用担当者向け
- 実務に活かせる内容
- 最新トレンドベース（${dateStr}時点）
- 実在記事のコピー禁止・必ずオリジナル文章
- 「だから何？」「明日から使える」「採用に直結する」を意識
- criticalを2〜3件、trendを3〜4件、lawを1〜2件、mediaを1〜2件の配分で`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = data.content.map((i) => i.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    cachedNews = parsed.news;
    cacheDate = parsed.generatedAt;

    return {
      news: parsed.news,
      topNews: parsed.topNews,
      todayTrend: parsed.todayTrend,
      trendItems: parsed.trendItems,
      date: parsed.date,
      generatedAt: parsed.generatedAt,
      cached: false,
    };
  } catch (err) {
    return { error: "ニュースの生成に失敗しました", detail: err.message };
  }
}
