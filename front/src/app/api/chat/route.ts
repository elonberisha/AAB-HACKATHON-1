import { NextRequest } from "next/server";

export const runtime = "nodejs";

const SITE_CONTEXT = `
euguide-ks eshte platforme qytetare per Kosoven, reformat institucionale,
sundimin e ligjit, luften kunder korrupsionit, integrimin ne Bashkimin Evropian
dhe informimin e qytetareve per proceset publike.

Faqja Home:
- Prezanton rrugen e Kosoves drejt Bashkimit Evropian ne menyre te thjeshte.
- E orienton qytetarin drejt reformave, sundimit te ligjit, korrupsionit,
  integrimit ne BE, objektivave dhe pyetjeve te shpeshta.

Faqja Reforma:
- Shpjegon reformat ne administrate publike, digjitalizim, transparence,
  efikasitet institucional dhe sherbime publike me te qarta per qytetaret.
- Thekson perafrimin me standardet evropiane dhe llogaridhenien institucionale.

Faqja Sundimi i ligjit:
- Mbulon pavaresine e gjyqesorit, qasjen ne drejtesi, procedurat e drejta,
  respektimin e te drejtave dhe zbatimin e barabarte te ligjit.
- Kujton se per raste konkrete ligjore duhet konsultuar jurist i licencuar.

Faqja Korrupsioni:
- Shpjegon rrezikun qe korrupsioni paraqet per institucionet, ekonomine dhe
  besimin publik.
- Fokusohet ne parandalim, transparence, prokurim publik, raportim dhe kontroll.

Faqja Integrimi ne BE:
- Shpjegon procesin e integrimit evropian, Marrveshjen e Stabilizim-Asociimit,
  reformat e nevojshme dhe perafrimin me acquis te BE-se.
- Permend se procesi lidhet me standarde demokratike, sundim te ligjit dhe
  administrate funksionale.

Faqja Objektivat:
- Paraqet objektiva praktike per qytetaret: kuptim me te mire te reformave,
  informim rreth institucioneve, pjesemarrje qytetare dhe ndjekje te progresit.

Faqja Pyetje:
- Jep pergjigje te shkurtra per pyetje te zakonshme rreth BE-se, reformave,
  ligjit, korrupsionit dhe rolit te qytetareve.

Faqja Infografika:
- Perdor te dhena te vizualizuara per progresin diplomatik, marredheniet
  nderkombetare, indikatorin e korrupsionit dhe objektivat e procesit.

Faqja Rreth Kosoves:
- Kosova eshte shtet ne Evropen Juglindore, ne qender te Ballkanit.
- Permban kontekst historik, shoqeror, kulturor dhe institucional.
- Faqja shpjegon popullsine, diasporen, identitetin qytetar, kulturen,
  qendrueshmerine dhe rrugen evropiane te Kosoves.
- Permend momente si shpallja e pavaresise me 17 shkurt 2008, njohjet
  diplomatike dhe aspiraten per integrim ne BE.
`.trim();

const LABELS = {
  sq: {
    missingKey:
      "Chatbot-i eshte gati ne faqe, por mungon OPENAI_API_KEY ne .env.local. Shto key dhe provo perseri.",
    failed:
      "Nuk munda te marr pergjigje nga OpenAI tani. Kontrollo API key ose lidhjen dhe provo perseri.",
  },
  en: {
    missingKey:
      "The chatbot is wired into the page, but OPENAI_API_KEY is missing in .env.local. Add the key and try again.",
    failed:
      "I could not get a response from OpenAI right now. Check the API key or connection and try again.",
  },
  sr: {
    missingKey:
      "Chatbot je povezan sa stranicom, ali nedostaje OPENAI_API_KEY u .env.local. Dodajte kljuc i pokusajte ponovo.",
    failed:
      "Trenutno ne mogu da dobijem odgovor od OpenAI. Proverite API kljuc ili vezu i pokusajte ponovo.",
  },
} as const;

type Language = keyof typeof LABELS;

export async function POST(req: NextRequest) {
  const { message, sessionId, language } = await req.json();
  const lang = normalizeLanguage(language);

  if (!message || typeof message !== "string") {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sseFromText(LABELS[lang].missingKey, sessionId);
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      stream: true,
      input: [
        {
          role: "system",
          content: systemPrompt(lang),
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return sseFromText(LABELS[lang].failed, sessionId);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const dataLine = event
              .split("\n")
              .find((line) => line.startsWith("data:"));
            if (!dataLine) continue;

            const payload = dataLine.replace(/^data:\s*/, "");
            if (payload === "[DONE]") continue;

            try {
              const data = JSON.parse(payload);
              const delta =
                data.type === "response.output_text.delta"
                  ? data.delta
                  : data.delta;

              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                );
              }
            } catch {
              // OpenAI can send non-text events; ignore anything that is not JSON text delta.
            }
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: LABELS[lang].failed })}\n\n`),
        );
      } finally {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: sseHeaders() });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      ...sseHeaders(),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function normalizeLanguage(language: unknown): Language {
  return language === "en" || language === "sr" ? language : "sq";
}

function systemPrompt(lang: Language) {
  const languageName = lang === "en" ? "English" : lang === "sr" ? "Serbian" : "Albanian";

  return `
You are the euguide-ks assistant for citizens of Kosovo.
Answer in ${languageName}, unless the user clearly asks for another language.

Use this site context as your primary source:
${SITE_CONTEXT}

Rules:
- Help only with Kosovo, institutions, reforms, rule of law, corruption, EU integration,
  citizen information, and the content of this website.
- If the user asks what you can do, briefly explain the areas you cover.
- Do not invent legal articles, dates, numbers, or official decisions.
- For specific legal problems, recommend consulting a licensed lawyer.
- When you rely on page content, mention the relevant page or section name.
- If the information is not in the site context, say so clearly and suggest checking official sources.
- Be concise, friendly, and practical.
`.trim();
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  };
}

function sseFromText(text: string, sessionId?: string) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, { headers: sseHeaders() });
}
