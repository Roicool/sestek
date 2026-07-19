import DemoShell from "../../components/demos/demo-shell";
import SpeechRecognitionDemo from "../../components/demos/speech-recognition-demo";

export const metadata = { title: "Speech Recognition Demo — Sestek" };

export default function SpeechRecognitionPage() {
  return (
    <DemoShell
      eyebrow="Knovvu SR"
      title="Speech Recognition"
      description="Konuşma tanıma doğruluğumuzu şimdi deneyin: mikrofonla konuşun ya da bir ses dosyası yükleyin, transkript canlı olarak aksın."
    >
      <SpeechRecognitionDemo />
    </DemoShell>
  );
}
