// Canopy iMessage agent (Photon Spectrum).
// Thin on purpose: every message goes to the backend, which logs it as constituent
// feedback (Gemini sentiment + topic + district) and returns the reply to send.
import { Spectrum } from "spectrum-ts";
import { imessage, terminal } from "spectrum-ts/providers";

const API = process.env.CANOPY_API_URL ?? "http://localhost:8000";

const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  // `npm run chat` swaps iMessage for Spectrum's terminal provider, so the whole loop
  // can be tested by typing, with no Apple device.
  providers: [process.env.CANOPY_TERMINAL ? terminal.config() : imessage.config()],
});

console.log("Canopy agent listening");

for await (const [space, message] of app.messages) {
  console.log(`in  [${message.platform}] ${message.content.type}`);
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
      console.log(`out ${reply.slice(0, 60)}`);
    } catch (err) {
      console.error(err);
      await message.reply("Sorry, Canopy is having trouble right now. Please try again in a bit.");
    }
  });
}
