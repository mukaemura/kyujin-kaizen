exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const today = new Date();
    const jst = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;

    const prompt = `採用・人事の専門アナリストとして、${dateStr}の採用担当者向けニュース10件を生成してください。JSONのみ出力。前置き不要。

{"date":"${dateStr}","generatedAt":"${jst.toISOString()}","todayTrend":"今週の採用トレンド要約（2文・数字含む）","trendItems":[{"title":"トレンド名（8文字以内）","desc":"説明（25文字以内）"},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}],"topNews":{"title":"最重要ニュースタイトル（25文字以内）","summary":"要約（120文字以内）","action":"取るべきアクション（50文字以内）","target":"対象企業（15文字以内）","type":"critical"},"news":[{"id":1,"type":"critical","title":"タイトル（25文字以内）","summary":"要約（120文字以内）","points":["ポイント①（35文字以内）","ポイント②","ポイント③"],"target":"対象企業（15文字以内）","action":"アクション（60文字以内）"}]}

newsは10件。typeはcritical/trend/law/mediaから選択。中小企業採用担当向け。実務直結。オリジナル文章のみ。配分:critical2件・trend4件・law2件・media2件。`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.content.map((i) => i.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        news: parsed.news,
        topNews: parsed.topNews,
        todayTrend: parsed.todayTrend,
        trendItems: parsed.trendItems,
        date: parsed.date,
        generatedAt: parsed.generatedAt,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "生成に失敗しました", detail: err.message }),
    };
  }
};
