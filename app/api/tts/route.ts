import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { requireTeacher } from "@/lib/auth";
import { bad } from "@/lib/api";
import { VOICES as VOICE_LIST } from "@/lib/voices";

const VOICES = VOICE_LIST.map((v) => v.id);

export const maxDuration = 60;



function clean(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[<&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

// POST {text, voice?, rate?} → audio/mpeg from Microsoft Edge neural voices
export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const text = clean(String(b.text || ""));
  if (!text) return bad("لا يوجد نص");
  const voice = VOICES.includes(b.voice) ? b.voice : teacher.voice;
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: typeof b.rate === "string" ? b.rate : "+0%" });
    const parts: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 45000);
      audioStream.on("data", (d: Buffer) => parts.push(d));
      audioStream.on("end", () => { clearTimeout(timer); resolve(); });
      audioStream.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
    tts.close();
    const audio = Buffer.concat(parts);
    if (!audio.length) throw new Error("empty audio");
    return new Response(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    // The browser falls back to its own speech voice when this fails.
    return bad("تعذر الاتصال بخدمة Edge TTS: " + (e as Error).message, 502);
  }
}
