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
      monthYear,
      matches = [],
      topPlayers = [],
      aggregateStats = {}
    } = body;

    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: "No matches provided for analysis." },
        { status: 400 }
      );
    }

    const prompt = `
Anda adalah seorang analis performa esports dan Head Coach tingkat tinggi.
Tugas Anda adalah membuat "Executive Summary" (Rangkuman Eksekutif) bulanan untuk laporan performa tim esports.
Laporan ini akan dibaca oleh Manajemen dan Pemain.

DATA PERIODE: ${monthYear || "Periode Terpilih"}

RINGKASAN STATISTIK:
- Total Pertandingan: ${aggregateStats.totalMatches}
- Menang: ${aggregateStats.wins}
- Seri: ${aggregateStats.draws}
- Kalah: ${aggregateStats.losses}
- Win Rate: ${aggregateStats.winRate}%
- Gol Memasukkan (For): ${aggregateStats.goalsFor}
- Gol Kemasukan (Against): ${aggregateStats.goalsAgainst}

PEMAIN TERBAIK BULAN INI (Berdasarkan rata-rata skor EPI):
${topPlayers.map((p: any, i: number) => `${i + 1}. ${p.name} (EPI: ${p.averageEpi.toFixed(2)})`).join("\n")}

DAFTAR PERTANDINGAN:
${matches.map((m: any) => `- vs ${m.opponent}: ${m.scoreFor} - ${m.scoreAgainst} (${m.scoreFor > m.scoreAgainst ? "Menang" : m.scoreFor === m.scoreAgainst ? "Seri" : "Kalah"})`).join("\n")}

INSTRUKSI:
Berdasarkan data di atas, buatlah rangkuman eksekutif dalam format Markdown yang rapi.
Struktur yang disarankan:
1. **Ringkasan Performa Tim:** Analisa singkat mengenai Win Rate dan perbandingan gol. Apakah performa tim memuaskan?
2. **Evaluasi Pertandingan:** Sebutkan tren dari hasil pertandingan (misal: "Tim sering menang tipis" atau "Kekalahan terjadi dengan skor telak").
3. **Apresiasi Pemain:** Berikan pujian khusus untuk para Top Performers.
4. **Rekomendasi Bulan Depan:** Saran fokus latihan (misal: "Perbaiki lini pertahanan karena kebobolan terlalu banyak").

PENTING: 
- Gunakan bahasa Indonesia yang profesional namun memotivasi (sporty).
- Gunakan format Markdown (seperti #, ##, **, *).
- Jangan membuat teks buatan sendiri yang tidak didasari data di atas.
- Jangan gunakan format email/surat (JANGAN sertakan "TO:", "Kepada:", "Subject:", atau sejenisnya).
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    return NextResponse.json({
      summary: response.text,
    });

  } catch (error) {
    console.error("AI Executive Summary Error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan rangkuman eksekutif. Pastikan API Key valid." },
      { status: 500 }
    );
  }
}
