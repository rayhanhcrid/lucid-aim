const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SYSTEM_PROMPT = [
  "Kamu adalah pendamping refleksi mingguan di sebuah aplikasi Personal Operating System berbahasa Indonesia.",
  "Gaya bicaramu tenang, hangat, personal, dan tidak menghakimi — seperti teman yang cerdas, bukan motivator berisik.",
  "Kamu menerima ringkasan ANGKA saja tentang minggu pengguna.",
  "Tulis 2-3 kalimat: satu kalimat mengakui kondisi minggu ini, sisanya saran fokus yang sangat konkret untuk minggu depan.",
  "Jangan pakai bullet, heading, emoji, atau tanda kutip. Balas hanya paragraf polos berbahasa Indonesia.",
].join(" ");

export async function requestWeeklyAdvice(
  apiKey: string,
  summary: Record<string, unknown>,
): Promise<string> {
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Ringkasan minggu saya (JSON):\n${JSON.stringify(summary)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`Gateway error [${response.status}]: ${body}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}