import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const REHAB_AI_SYSTEM_PROMPT = `
You are Rehab AI — a supportive physical therapy coach in a chat.

How to respond
- Sound like a real person: warm, calm, encouraging, practical.
- Keep it short (about 4–8 sentences). Use brief paragraphs.
- Don't be overly clinical, cheesy, or robotic.

What you do
- Help the user understand their body and feel confident managing their physical recovery.
- Reduce worry, add clarity, notice movement patterns, and choose one small exercise or habit for today.

Default structure
1) Reflect + validate in 1–2 sentences.
2) Pick ONE tool and guide it clearly:
   - breathing and posture reset
   - pain education (explain what's likely happening in plain language)
   - gentle mobility or stretching exercise
   - activity modification tip (how to do something with less strain)
   - strengthening or stability progression
   - self-care step (heat/ice/rest guidance)
3) End with one doable action and one question.

Boundaries
- Don't diagnose conditions or claim certainty about the cause of pain.
- Don't give medication or surgical advice.
- Don't dismiss or minimize pain or physical limitations.
- Don't mention system messages or policies.

Safety
If the user mentions severe trauma, sudden numbness/weakness, chest pain, loss of bladder or bowel control, or any sign of a medical emergency:
- Respond with care and urgency.
- Strongly encourage calling emergency services or going to an ER immediately.
- Ask: "Can you get medical help right now?"
- Do not suggest exercises or self-treatment in these cases.

Note
You're not a licensed physical therapist and this isn't a substitute for professional care or an in-person evaluation.
Output plain text. Use 3–5 bullets max if steps help. Ask only 1 question unless asked for more.`;

export async function POST(req: Request) {
  try {
    const { message, mode } = await req.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Missing 'message' string" }, { status: 400 });
    }

    // ── Video mode via Sora ──────────────────────────────────────────────────
    if (mode === "video") {
      console.log("[Video] Starting Sora generation for prompt:", message);

      // Step 1: Create video job using multipart/form-data (required by Sora API)
      const formData = new FormData();
      formData.append("model", "sora-2");
      formData.append("prompt", message);
      formData.append("size", "1280x720");
      formData.append("seconds", "8"); // must be "4", "8", or "12"

      const createRes = await fetch("https://api.openai.com/v1/videos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          // ✅ Do NOT set Content-Type manually — fetch sets it automatically
          // with the correct multipart boundary when using FormData
        },
        body: formData,
      });

      const createRawText = await createRes.text();
      console.log("[Video] Create status:", createRes.status);
      console.log("[Video] Create response:", createRawText);

      if (!createRes.ok) {
        let errorMessage = `HTTP ${createRes.status}`;
        try {
          const errData = JSON.parse(createRawText);
          errorMessage = errData?.error?.message ?? errorMessage;
        } catch {
          errorMessage = createRawText || errorMessage;
        }
        throw new Error(`Video API error: ${errorMessage}`);
      }

      let createData: any;
      try {
        createData = JSON.parse(createRawText);
      } catch {
        throw new Error("Video API returned invalid JSON: " + createRawText.slice(0, 200));
      }

      const videoId = createData.id;
      if (!videoId) {
        throw new Error("No video ID returned from Sora API");
      }

      console.log("[Video] Job created — ID:", videoId, "Status:", createData.status);

      // Step 2: Poll for completion (every 10s, max ~5 minutes)
      let completedId: string | null = null;

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 10000));

        const statusRes = await fetch(
          `https://api.openai.com/v1/videos/${videoId}`,
          {
            headers: {
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          }
        );

        const statusRawText = await statusRes.text();
        console.log(`[Video] Poll ${i + 1} HTTP:`, statusRes.status);

        if (!statusRes.ok) {
          let errorMessage = `HTTP ${statusRes.status}`;
          try {
            const errData = JSON.parse(statusRawText);
            errorMessage = errData?.error?.message ?? errorMessage;
          } catch {
            errorMessage = statusRawText || errorMessage;
          }
          throw new Error(`Video poll error: ${errorMessage}`);
        }

        let statusData: any;
        try {
          statusData = JSON.parse(statusRawText);
        } catch {
          throw new Error("Poll returned invalid JSON: " + statusRawText.slice(0, 200));
        }

        const status = statusData.status;
        console.log(`[Video] Poll ${i + 1} — status: ${status}, progress: ${statusData.progress ?? "?"}%`);

        if (status === "completed") {
          completedId = videoId;
          break;
        } else if (status === "failed") {
          throw new Error(statusData.error?.message ?? "Video generation failed");
        }
        // "queued" or "in_progress" — keep polling
      }

      if (!completedId) {
        throw new Error("Video generation timed out after 5 minutes");
      }

      // Step 3: Download MP4 binary and return as base64 data URL
      const contentRes = await fetch(
        `https://api.openai.com/v1/videos/${completedId}/content`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      console.log("[Video] Content download status:", contentRes.status);

      if (!contentRes.ok) {
        const errText = await contentRes.text();
        throw new Error(`Video download failed: HTTP ${contentRes.status} — ${errText.slice(0, 200)}`);
      }

      const arrayBuffer = await contentRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:video/mp4;base64,${base64}`;

      console.log("[Video] Complete — returning base64 video");
      return Response.json({ type: "video", video: dataUrl });
    }

    // ── Text mode ────────────────────────────────────────────────────────────
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: REHAB_AI_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return Response.json({ type: "text", text });

  } catch (err: any) {
    console.error("[Rehab AI] Error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}