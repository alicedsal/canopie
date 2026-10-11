// Canopy iMessage agent (Photon Spectrum).
// Thin on purpose: every message goes to the backend, which logs it as constituent
// feedback (Gemini sentiment + topic + district) and returns the reply to send.
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const API = process.env.CANOPY_API_URL ?? "http://localhost:8000";

const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  // Spectrum also ships a terminal provider for testing without a phone; see
  // https://photon.codes/docs/spectrum-ts/providers
  providers: [imessage.config()],
});

console.log("Canopy agent listening");

for await (const [space, message] of app.messages) {
  if (message.content.type !== "text") continue;
  const text = message.content.text;

  await space.responding(async () => {
    try {
      const res = await fetch(`${API}/api/agent/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: message.sender?.id ?? "unknown",
          text,
        }),
      });
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const { reply } = (await res.json()) as { reply: string };
      await message.reply(reply);
    } catch (err) {
      console.error(err);
      await message.reply("Sorry, Canopy is having trouble right now. Please try again in a bit.");
    }
  });
}
