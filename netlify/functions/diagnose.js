exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { jobText } = JSON.parse(event.body);

  const prompt = `あなたは採用・求人票の専門家です。以下の求人票を採点し、JSONのみを返してください。前置きや説明は不要です。

採点基準：
①タイトル訴求（0〜25点）：職種明確か/具体性（数字・内容）あるか/ベネフィットあるか/誰向けか明確か/検索ワードあるか（各5点）。減点：抽象ワードのみ−5、35文字以上−3、記号羅列−2
②わかりやすさ（0〜25点）：仕事内容具体的か/1日の流れイメージできるか/専門用語多すぎないか/読みやすい構成か/働く環境わかるか（各5点）
③差別化（0〜25点）：他社と違う強みあるか/数字・実績あるか/なぜこの会社か説明できるか/独自の制度・特徴あるか/ここで働く理由あるか（各5点）
④応募動機形成（0〜25点）：働くイメージできるか/成長・やりがいあるか/誰に向いてるか明確か/不安要素解消あるか/ワクワク要素あるか（各5点）

評価ランク：80〜100=非常に良い、65〜79=良い、50〜64=改善余地あり、35〜49=要改善、〜34=危険
改善優先度：どれか1つでも12点以下=高、複数が13〜17点=中、全て18点以上=低

以下のJSONのみ返答：
{"scores":{"title":数値,"clarity":数値,"differentiation":数値,"motivation":数値},"total":合計,"rank":"ランク文字列","priority":"高or中or低","issues":["課題1","課題2","課題3"],"proposals":["改善提案1","改善提案2","改善提案3"],"titleSuggestions":["タイトル案1","タイトル案2","タイトル案3"],"salaryAdvice":"給与・条件面の改善提案（具体的に）","targetAdvice":"ターゲット設定の改善提案（具体的に）","contentAnalysis":"仕事内容の書き方の問題点と改善提案（具体的に・採用現場で使えるレベルで）","benefitsAnalysis":"福利厚生・PRポイントの問題点と改善提案（訴求力を高める具体的な書き方まで）","priorityAction":"今すぐ着手すべき最優先アクション（1つに絞って）","marketSalary":{"median":"この職種・地域の市場年収中央値（例：450万円）","lower":"下位25%目安（例：320万円）","upper":"上位25%目安（例：650万円）","comment":"自社の年収設定への一言コメント（市場比較含む・40字以内）"}}

求人票：
${jobText}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(i => i.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: clean
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "診断に失敗しました" })
    };
  }
};
