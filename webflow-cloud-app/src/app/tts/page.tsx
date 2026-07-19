import DemoShell from "../../components/demos/demo-shell";
import TextToSpeechDemo from "../../components/demos/text-to-speech-demo";

export const metadata = { title: "Text-to-Speech Demo — Sestek" };

export default function TtsPage() {
  return (
    <DemoShell
      eyebrow="Knovvu TTS"
      title="Text-to-Speech"
      description="Yazdığınız metni saniyeler içinde doğal bir sesle dinleyin. Dil ve ses seçin, Seslendir'e basın."
    >
      <TextToSpeechDemo />
    </DemoShell>
  );
}
