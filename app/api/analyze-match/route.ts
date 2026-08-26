import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

import { createPlayerMatchStats } from "@/services/player-stats-service";


// =========================================================
// GEMINI CLIENT
// =========================================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


// =========================================================
// TYPES
// =========================================================

type AnalyzeRequest = {
  matchId: string;

  screenshotUrls: string[];

  players: {
    id: string;
    name: string;
    username?: string;
  }[];
};


// =========================================================
// HELPER
// =========================================================

function getMimeType(url: string): string {
  const lower = url.toLowerCase();

  if (lower.includes(".png")) {
    return "image/png";
  }

  if (lower.includes(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}


// =========================================================
// NUMBER HELPER
// =========================================================

function numberOrZero(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return 0;
}


// =========================================================
// POST
// =========================================================

export async function POST(
  request: NextRequest
) {
  try {

    // =======================================================
    // CHECK API KEY
    // =======================================================

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GEMINI_API_KEY belum tersedia di .env.local",
        },
        {
          status: 500,
        }
      );
    }


    // =======================================================
    // READ REQUEST
    // =======================================================

    const body =
      (await request.json()) as AnalyzeRequest;

    const {
      matchId,
      screenshotUrls,
      players,
    } = body;


    // =======================================================
    // VALIDATION
    // =======================================================

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error: "matchId wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !Array.isArray(screenshotUrls) ||
      screenshotUrls.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tidak ada screenshot untuk dianalisis.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !Array.isArray(players) ||
      players.length !== 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pertandingan harus memiliki tepat 2 pemain.",
        },
        {
          status: 400,
        }
      );
    }


    // =======================================================
    // LOG
    // =======================================================

    console.log(
      "=========================================="
    );

    console.log(
      "ANALYZE MATCH"
    );

    console.log(
      "Match ID:",
      matchId
    );

    console.log(
      "Screenshot count:",
      screenshotUrls.length
    );

    console.log(
      "Players:",
      players
    );

    console.log(
      "=========================================="
    );


    // =======================================================
    // DOWNLOAD SCREENSHOTS
    // =======================================================

    const imageParts: {
      inlineData: {
        mimeType: string;
        data: string;
      };
    }[] = [];


    for (
      let i = 0;
      i < screenshotUrls.length;
      i++
    ) {

      const url =
        screenshotUrls[i];

      console.log(
        `Downloading screenshot ${i + 1}/${screenshotUrls.length}`
      );

      console.log(url);


      const response =
        await fetch(url);


      if (!response.ok) {
        throw new Error(
          `Gagal mengambil screenshot ${i + 1}. HTTP ${response.status}`
        );
      }


      const arrayBuffer =
        await response.arrayBuffer();


      const base64 =
        Buffer
          .from(arrayBuffer)
          .toString("base64");


      imageParts.push({
        inlineData: {
          mimeType:
            getMimeType(url),

          data: base64,
        },
      });
    }


    console.log(
      `Successfully downloaded ${imageParts.length} screenshots.`
    );


    // =======================================================
    // PLAYER INFORMATION
    // =======================================================

    const playerInformation =
      players
        .map(
          (player, index) =>
            `
PLAYER ${index + 1}

ID:
${player.id}

NAME:
${player.name}

USERNAME:
${player.username || "-"}
`
        )
        .join("\n");


    // =======================================================
    // PROMPT
    // =======================================================

    const prompt = `
You are an expert esports performance analyst
specializing in competitive eFootball matches.

You are analyzing screenshots from ONE SINGLE MATCH.

The screenshots contain statistics for EXACTLY TWO
Indonesian players.

Analyze ALL screenshots together.

Do NOT analyze each screenshot as a separate match.

Instead, combine all visible information from all screenshots
into ONE complete statistical record for EACH player.

=========================================================
PLAYERS PROVIDED BY THE SYSTEM
=========================================================

${playerInformation}

=========================================================
CRITICAL PLAYER IDENTIFICATION RULE
=========================================================

There are exactly TWO Indonesian players.

You MUST associate the statistics with the correct player.

Use:
- player name
- username
- player identity visible in the screenshots
- position/order shown in the screenshots

Do NOT swap statistics between players.

If the exact player identity cannot be determined,
use the closest matching player from the provided list.

Do NOT create a new player.

The "playerId" MUST be one of the IDs provided above.

=========================================================
IMPORTANT ANALYSIS RULES
=========================================================

1. Analyze ALL uploaded screenshots together.

2. The screenshots belong to ONE match.

3. Combine information from all screenshots.

4. Do NOT double count statistics.

5. If the same statistic appears in multiple screenshots,
   use the clearest value.

6. Do NOT invent statistics.

7. If a statistic is genuinely not visible,
   return null.

8. Read numbers exactly as shown.

9. Do not confuse the two Indonesian players.

10. Do not use opponent statistics.

11. Only return statistics belonging to the two
    Indonesian players.

12. Preserve the distinction between attempts and
    successful actions.

=========================================================
STATISTICS
=========================================================

For EACH player extract the following.

---------------------------------------------------------
BASIC MATCH STATISTICS
---------------------------------------------------------

goals
shots
shotsOnTarget
assists
keyPasses

---------------------------------------------------------
PASSING
---------------------------------------------------------

totalPasses
successfulPasses
instrumentalPasses

---------------------------------------------------------
DRIBBLING
---------------------------------------------------------

totalDribbles
successfulDribbles
instrumentalDribbles

---------------------------------------------------------
RECEIVING
---------------------------------------------------------

receiving
goodReceives

---------------------------------------------------------
ATTACKING MOVEMENT
---------------------------------------------------------

overlaps
runsOutWide
forwardRuns
attackingReceives

---------------------------------------------------------
DEFENSIVE
---------------------------------------------------------

intercepts
tackles
impactfulSteals

---------------------------------------------------------
PRESSING
---------------------------------------------------------

frontalPresses
pressesFromBehind

---------------------------------------------------------
POSITIONING
---------------------------------------------------------

goodPositioning

---------------------------------------------------------
MARKING / DEFENSIVE SUPPORT
---------------------------------------------------------

doubleMarks
passesObstructed
playersMarked

---------------------------------------------------------
TEAM EVALUATION
---------------------------------------------------------

totalPoints
attackingPositioning
shooting
duelling
defensivePositioning
passing
dribbling

=========================================================
VALUES SUCH AS "5 (3)"
=========================================================

If a screenshot shows:

Shots
5 (3)

interpret as:

shots = 5
shotsOnTarget = 3

---------------------------------------------------------

If a screenshot shows:

Passes
52 (42)

interpret as:

totalPasses = 52
successfulPasses = 42

---------------------------------------------------------

If a screenshot shows:

Dribbles
50 (41)

interpret as:

totalDribbles = 50
successfulDribbles = 41

=========================================================
IMPORTANT
=========================================================

The database uses these field names:

passes
successfulPasses

and:

dribbles
successfulDribbles

Therefore:

totalPasses MUST be returned as "passes".

totalDribbles MUST be returned as "dribbles".

=========================================================
OUTPUT
=========================================================

Return ONLY valid JSON.

The root object must contain:

{
  "players": [...]
}

The "players" array MUST contain EXACTLY TWO objects.

Each object MUST contain:

{
  "playerId": string,
  "playerName": string,

  "goals": number | null,
  "shots": number | null,
  "shotsOnTarget": number | null,
  "assists": number | null,
  "keyPasses": number | null,

  "passes": number | null,
  "successfulPasses": number | null,
  "instrumentalPasses": number | null,

  "dribbles": number | null,
  "successfulDribbles": number | null,
  "instrumentalDribbles": number | null,

  "receiving": number | null,
  "goodReceives": number | null,

  "overlaps": number | null,
  "runsOutWide": number | null,
  "forwardRuns": number | null,
  "attackingReceives": number | null,

  "intercepts": number | null,
  "tackles": number | null,
  "impactfulSteals": number | null,

  "frontalPresses": number | null,
  "pressesFromBehind": number | null,

  "goodPositioning": number | null,

  "doubleMarks": number | null,
  "passesObstructed": number | null,
  "playersMarked": number | null,

  "totalPoints": number | null,
  "attackingPositioning": number | null,
  "shooting": number | null,
  "duelling": number | null,
  "defensivePositioning": number | null,
  "passing": number | null,
  "dribbling": number | null
}

=========================================================
FINAL REQUIREMENT
=========================================================

Return exactly TWO players.

Do not return explanations.

Do not return markdown.

Do not return code fences.

Return JSON only.
`;


    // =======================================================
    // SEND TO GEMINI
    // =======================================================

    console.log(
      "Sending screenshots to Gemini..."
    );


    const result =
      await ai.models.generateContent({

        // ---------------------------------------------------
        // MODEL
        // ---------------------------------------------------

        model:
          "gemini-3.1-flash-lite",


        // ---------------------------------------------------
        // CONTENT
        // ---------------------------------------------------

        contents: [
          {
            text: prompt,
          },

          ...imageParts,
        ],


        // ---------------------------------------------------
        // CONFIG
        // ---------------------------------------------------

        config: {

          responseMimeType:
            "application/json",


          responseSchema: {

            type:
              Type.OBJECT,


            properties: {

              players: {

                type:
                  Type.ARRAY,


                items: {

                  type:
                    Type.OBJECT,


                  properties: {

                    playerId: {
                      type: Type.STRING,
                    },

                    playerName: {
                      type: Type.STRING,
                    },


                    // BASIC
                    goals: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    shots: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    shotsOnTarget: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    assists: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    keyPasses: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // PASSING
                    passes: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    successfulPasses: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    instrumentalPasses: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // DRIBBLING
                    dribbles: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    successfulDribbles: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    instrumentalDribbles: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // RECEIVING
                    receiving: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    goodReceives: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // ATTACKING MOVEMENT
                    overlaps: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    runsOutWide: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    forwardRuns: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    attackingReceives: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // DEFENSIVE
                    intercepts: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    tackles: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    impactfulSteals: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // PRESSING
                    frontalPresses: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    pressesFromBehind: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // POSITIONING
                    goodPositioning: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // MARKING
                    doubleMarks: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    passesObstructed: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    playersMarked: {
                      type: Type.NUMBER,
                      nullable: true,
                    },


                    // TEAM EVALUATION
                    totalPoints: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    attackingPositioning: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    shooting: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    duelling: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    defensivePositioning: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    passing: {
                      type: Type.NUMBER,
                      nullable: true,
                    },

                    dribbling: {
                      type: Type.NUMBER,
                      nullable: true,
                    },
                  },


                  required: [
                    "playerId",
                    "playerName",

                    "goals",
                    "shots",
                    "shotsOnTarget",
                    "assists",
                    "keyPasses",

                    "passes",
                    "successfulPasses",
                    "instrumentalPasses",

                    "dribbles",
                    "successfulDribbles",
                    "instrumentalDribbles",

                    "receiving",
                    "goodReceives",

                    "overlaps",
                    "runsOutWide",
                    "forwardRuns",
                    "attackingReceives",

                    "intercepts",
                    "tackles",
                    "impactfulSteals",

                    "frontalPresses",
                    "pressesFromBehind",

                    "goodPositioning",

                    "doubleMarks",
                    "passesObstructed",
                    "playersMarked",

                    "totalPoints",
                    "attackingPositioning",
                    "shooting",
                    "duelling",
                    "defensivePositioning",
                    "passing",
                    "dribbling",
                  ],
                },
              },
            },


            required: [
              "players",
            ],
          },
        },
      });


    // =======================================================
    // GET GEMINI RESPONSE
    // =======================================================

    const text =
      result.text;


    if (!text) {
      throw new Error(
        "Gemini tidak mengembalikan hasil."
      );
    }


    console.log(
      "=========================================="
    );

    console.log(
      "GEMINI RAW RESPONSE:"
    );

    console.log(text);

    console.log(
      "=========================================="
    );


    // =======================================================
    // PARSE JSON
    // =======================================================

    let parsedResult: {
      players: any[];
    };


    try {

      parsedResult =
        JSON.parse(text);

    } catch (error) {

      console.error(
        "Failed to parse Gemini JSON:",
        error
      );

      throw new Error(
        "Response Gemini bukan JSON yang valid."
      );
    }


    // =======================================================
    // VALIDATE RESULT
    // =======================================================

    if (
      !parsedResult.players ||
      !Array.isArray(
        parsedResult.players
      )
    ) {
      throw new Error(
        "Gemini tidak mengembalikan daftar pemain."
      );
    }


    if (
      parsedResult.players.length !== 2
    ) {
      throw new Error(
        `Gemini mengembalikan ${parsedResult.players.length} pemain. Seharusnya tepat 2 pemain.`
      );
    }


    // =======================================================
    // VALIDATE PLAYER IDs
    // =======================================================

    const validPlayerIds =
      players.map(
        (player) => player.id
      );


    for (
      const player
      of parsedResult.players
    ) {

      if (
        !validPlayerIds.includes(
          player.playerId
        )
      ) {

        throw new Error(
          `Gemini mengembalikan playerId yang tidak dikenal: ${player.playerId}`
        );
      }
    }


    // =======================================================
    // SAVE PLAYER STATS
    // =======================================================

    console.log(
      "Saving player statistics to Firestore..."
    );


    for (
      const player
      of parsedResult.players
    ) {

      console.log(
        "Saving stats for:",
        player.playerName,
        player.playerId
      );


      await createPlayerMatchStats({

        // ---------------------------------------------------
        // IDENTIFICATION
        // ---------------------------------------------------

        matchId,

        playerId:
          player.playerId,


        // ---------------------------------------------------
        // OVERALL
        // ---------------------------------------------------

        totalPoints:
          numberOrZero(
            player.totalPoints
          ),


        // ---------------------------------------------------
        // TEAM EVALUATION
        // ---------------------------------------------------

        attackingPositioning:
          numberOrZero(
            player.attackingPositioning
          ),

        shooting:
          numberOrZero(
            player.shooting
          ),

        duelling:
          numberOrZero(
            player.duelling
          ),

        defensivePositioning:
          numberOrZero(
            player.defensivePositioning
          ),

        passing:
          numberOrZero(
            player.passing
          ),

        dribbling:
          numberOrZero(
            player.dribbling
          ),


        // ---------------------------------------------------
        // SCORING
        // ---------------------------------------------------

        goals:
          numberOrZero(
            player.goals
          ),

        shots:
          numberOrZero(
            player.shots
          ),

        shotsOnTarget:
          numberOrZero(
            player.shotsOnTarget
          ),

        assists:
          numberOrZero(
            player.assists
          ),

        keyPasses:
          numberOrZero(
            player.keyPasses
          ),


        // ---------------------------------------------------
        // PASSING
        // ---------------------------------------------------

        passes:
          numberOrZero(
            player.passes
          ),

        successfulPasses:
          numberOrZero(
            player.successfulPasses
          ),

        instrumentalPasses:
          numberOrZero(
            player.instrumentalPasses
          ),


        // ---------------------------------------------------
        // DRIBBLING
        // ---------------------------------------------------

        dribbles:
          numberOrZero(
            player.dribbles
          ),

        successfulDribbles:
          numberOrZero(
            player.successfulDribbles
          ),

        instrumentalDribbles:
          numberOrZero(
            player.instrumentalDribbles
          ),


        // ---------------------------------------------------
        // RECEIVING
        // ---------------------------------------------------

        receiving:
          numberOrZero(
            player.receiving
          ),

        goodReceives:
          numberOrZero(
            player.goodReceives
          ),


        // ---------------------------------------------------
        // ATTACKING MOVEMENT
        // ---------------------------------------------------

        overlaps:
          numberOrZero(
            player.overlaps
          ),

        runsOutWide:
          numberOrZero(
            player.runsOutWide
          ),

        forwardRuns:
          numberOrZero(
            player.forwardRuns
          ),

        attackingReceives:
          numberOrZero(
            player.attackingReceives
          ),


        // ---------------------------------------------------
        // DEFENSIVE
        // ---------------------------------------------------

        intercepts:
          numberOrZero(
            player.intercepts
          ),

        tackles:
          numberOrZero(
            player.tackles
          ),

        impactfulSteals:
          numberOrZero(
            player.impactfulSteals
          ),


        // ---------------------------------------------------
        // PRESSING
        // ---------------------------------------------------

        frontalPresses:
          numberOrZero(
            player.frontalPresses
          ),

        pressesFromBehind:
          numberOrZero(
            player.pressesFromBehind
          ),


        // ---------------------------------------------------
        // POSITIONING
        // ---------------------------------------------------

        goodPositioning:
          numberOrZero(
            player.goodPositioning
          ),


        // ---------------------------------------------------
        // MARKING
        // ---------------------------------------------------

        doubleMarks:
          numberOrZero(
            player.doubleMarks
          ),

        passesObstructed:
          numberOrZero(
            player.passesObstructed
          ),

        playersMarked:
          numberOrZero(
            player.playersMarked
          ),
      });
    }


    console.log(
      "All player statistics saved successfully."
    );


    // =======================================================
    // SUCCESS RESPONSE
    // =======================================================

    return NextResponse.json(
      {
        success: true,

        matchId,

        screenshotCount:
          screenshotUrls.length,

        playerCount:
          parsedResult.players.length,

        players:
          parsedResult.players,
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    // =======================================================
    // ERROR HANDLER
    // =======================================================

    console.error(
      "=========================================="
    );

    console.error(
      "ANALYZE MATCH ERROR:"
    );

    console.error(error);

    console.error(
      "=========================================="
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menganalisis screenshot.",
      },
      {
        status: 500,
      }
    );
  }
}