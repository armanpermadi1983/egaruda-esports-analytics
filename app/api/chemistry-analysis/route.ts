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
      playerA,
      playerB,
      playerAStats = [],
      playerBStats = [],
      matchesPlayed = 0
    } = body;

    if (!playerA || !playerB) {
      return NextResponse.json(
        { error: "Player A and Player B data are required." },
        { status: 400 }
      );
    }

    const prompt = `
Anda adalah seorang analis performa esports tingkat tinggi.
Tugas Anda adalah menganalisis "Chemistry" dan kecocokan (sinergi) antara dua pemain dari timnas esports Indonesia.

DATA PEMAIN A:
Nama: ${playerA.name}
Posisi: ${playerA.position || "-"}

DATA PEMAIN B:
Nama: ${playerB.name}
Posisi: ${playerB.position || "-"}

JUMLAH PERTANDINGAN BERSAMA: ${matchesPlayed}

STATISTIK PEMAIN A SAAT BERMAIN BERSAMA B:
${JSON.stringify(playerAStats, null, 2)}

STATISTIK PEMAIN B SAAT BERMAIN BERSAMA A:
${JSON.stringify(playerBStats, null, 2)}

Tugas Anda adalah memberikan analisis chemistry yang profesional
untuk staf pelatih.

PENTING:
- Tuliskan seluruh hasil analisis dalam Bahasa Indonesia.
- Jangan gunakan format email/surat (JANGAN sertakan "TO:", "Kepada:", "Subject:", atau sejenisnya).
- Langsung mulai dengan isi analisis.

Lakukan Analisis pada poin-poin berikut:

1. Tingkat Sinergi Keseluruhan (Apakah mereka bermain lebih baik bersama?)
2. Kecocokan Gaya Bermain (Berdasarkan statistik menyerang/bertahan mereka)
3. Kekuatan Tandem Ini
4. Kelemahan / Potensi Overlap Peran
5. Rekomendasi Pelatih (Apakah disarankan untuk terus ditandemkan?)

Jangan membuat-buat atau mengarang statistik.
Hanya gunakan data yang disediakan.
Jika data tidak mencukupi (misal jumlah pertandingan bersama masih 0), katakan dengan jelas bahwa data tidak memadai untuk menganalisa chemistry mereka.

Berikan respons dalam bagian-bagian yang jelas.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    });

    return NextResponse.json({
      analysis: response.text || "No analysis generated.",
    });

  } catch (error) {
    console.error("Chemistry AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to generate chemistry analysis." },
      { status: 500 }
    );
  }
}
