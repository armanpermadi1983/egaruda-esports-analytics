import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(
  request: NextRequest
) {

  try {

    const body = await request.json();

    const {
      player,
      epi = 0,
      summary = {},
      performance = {},
      detailedStats = [],
      matchHistory = [],
      teammateData = null,
    } = body;

    if (!player) {

      return NextResponse.json(
        {
          error: "Player data is required.",
        },
        {
          status: 400,
        }
      );

    }

    const prompt = `
Anda adalah seorang analis performa esports
yang bekerja untuk timnas esports Indonesia.

Lakukan analisis terhadap data performa pemain berikut ini.

PLAYER
Name: ${player.name}
Username: ${player.username || "-"}
Position: ${player.position || "-"}
Team: ${player.team}

eGARUDA PERFORMANCE INDEX
EPI: ${epi}/100

SUMMARY
Average Total Points: ${summary?.averageTotalPoints || 0}
Total Goals: ${summary?.totalGoals || 0}
Total Assists: ${summary?.totalAssists || 0}

SIX MAIN PERFORMANCE CATEGORIES
${JSON.stringify(
      performance,
      null,
      2
    )}

DETAILED STATISTICS
${JSON.stringify(
      detailedStats,
      null,
      2
    )}

MATCH HISTORY
${JSON.stringify(
      matchHistory,
      null,
      2
    )}

${teammateData ? `TEAMMATE DATA (CHEMISTRY ANALYSIS)
Berikut adalah data ringkas rekan setimnya:
${JSON.stringify(teammateData, null, 2)}
` : ""}

Tugas Anda adalah memberikan analisis performa yang profesional
untuk staf pelatih.

PENTING:
- Tuliskan seluruh hasil analisis dalam Bahasa Indonesia.
- Jangan gunakan format email/surat (JANGAN sertakan "TO:", "Kepada:", "Subject:", atau sejenisnya).
- Langsung mulai dengan isi analisis.

Lakukan Analisis pada poin-poin berikut:

1. Penilaian Keseluruhan
2. Kekuatan
3. Kelemahan
4. Analisis Taktis
5. Konsistensi Performa
6. Prioritas Pelatihan
7. Rekomendasi Fokus Latihan
${teammateData ? "8. Analisis Chemistry (Bagaimana kecocokan & sinergi pemain ini dengan rekan setimnya)" : ""}

Jangan membuat-buat atau mengarang statistik.

Hanya gunakan data yang disediakan.

Jika data tidak mencukupi untuk membuat kesimpulan,
katakan dengan jelas bahwa data tidak memadai.

Pastikan analisis ini praktis dan relevan
untuk kepelatihan esports.

Berikan respons dalam bagian-bagian yang jelas.
`;

    const response =
      await ai.models.generateContent({

        model: "gemini-3.1-flash-lite",

        contents: prompt,

        config: {
          temperature: 0.4,
          maxOutputTokens: 1500,
        },

      });

    return NextResponse.json({

      analysis:
        response.text || "No analysis generated.",

    });

  } catch (error) {

    console.error(
      "Player AI analysis error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to generate player analysis.",
      },
      {
        status: 500,
      }
    );

  }

}