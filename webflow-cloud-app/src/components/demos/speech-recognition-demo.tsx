"use client";

/**
 * Speech Recognition demosu — gerçek sayfanın başlık demosu
 * ("Try Our Speech Recognition Accuracy Now").
 *
 * İki mod:
 *  • Mikrofon: Web Speech API (webkitSpeechRecognition, interim results ile
 *    canlı akan transkript) — Chrome/Edge; desteklenmeyen tarayıcıda nazik
 *    bir uyarı gösterilir. Üretimde Sestek'in WebSocket SR API'sine bağlanır.
 *  • Dosya yükleme: 100MB sınırı (gerçek sayfayla aynı); env-gated
 *    /api/demos/transcribe route'una gönderilir — yapılandırılmamışsa
 *    "simüle" etiketli örnek yanıt döner.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { SR_LANGUAGES, SR_MAX_FILE_MB } from "../../lib/demo-config";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: {
    resultIndex: number;
    results: { isFinal: boolean; 0: { transcript: string } }[];
  }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognizer(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Status = "idle" | "listening" | "uploading" | "error";

export default function SpeechRecognitionDemo() {
  const [lang, setLang] = useState("tr-TR");
  const [status, setStatus] = useState<Status>("idle");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [copied, setCopied] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    setSupported(getRecognizer() !== null);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setStatus("idle");
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognizer();
    if (!Ctor) return;
    setNote(null);
    setFinalText("");
    setInterim("");

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let fin = "";
      let inter = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else inter += r[0].transcript;
      }
      setFinalText(fin);
      setInterim(inter);
    };
    rec.onend = () => {
      setStatus("idle");
      setInterim("");
    };
    rec.onerror = (e) => {
      setStatus("error");
      setNote(
        e.error === "not-allowed"
          ? "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verip tekrar deneyin."
          : `Tanıma hatası: ${e.error}`
      );
    };

    recRef.current = rec;
    setStatus("listening");
    rec.start();
  }, [lang]);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setNote(null);
      if (file.size > SR_MAX_FILE_MB * 1024 * 1024) {
        setNote(
          `Demo arayüzünün ${SR_MAX_FILE_MB}MB dosya sınırı var. Daha büyük dosyalar için lütfen iletişim formunu doldurun.`
        );
        return;
      }
      setStatus("uploading");
      setFinalText("");
      try {
        const form = new FormData();
        form.append("audio", file);
        form.append("lang", lang);
        const res = await fetch("/demos/api/demos/transcribe", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          transcript?: string;
          simulated?: boolean;
        };
        setFinalText(data.transcript ?? "");
        if (data.simulated) {
          setNote(
            "Bu yanıt simülasyondur — üretim sürümü Sestek SR API'sine bağlanır (env: SESTEK_SR_URL + SESTEK_SR_API_KEY)."
          );
        }
      } catch {
        setNote("Yükleme başarısız oldu, tekrar deneyin.");
      } finally {
        setStatus("idle");
      }
    },
    [lang]
  );

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(finalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [finalText]);

  return (
    <div className="demo-card">
      <div className="demo-row">
        <div>
          <label className="demo-label" htmlFor="sr-lang">
            Dil
          </label>
          <select
            id="sr-lang"
            className="demo-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={status === "listening"}
          >
            {SR_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="demo-actions">
        <button
          className="demo-btn"
          onClick={status === "listening" ? stop : start}
          disabled={!supported || status === "uploading"}
        >
          {status === "listening" ? "■ Kaydı Durdur" : "🎙 Konuşmaya Başla"}
        </button>
        {status === "listening" && <span className="demo-pulse" aria-hidden />}

        <label className="demo-btn demo-btn--ghost">
          {status === "uploading" ? "Yükleniyor…" : "⬆ Ses Dosyası Yükle"}
          <input
            type="file"
            accept="audio/*"
            hidden
            disabled={status !== "idle" && status !== "error"}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {!supported && (
        <p className="demo-note">
          Canlı mikrofon transkripsiyonu Chrome veya Edge gerektirir — bu
          tarayıcıda dosya yükleme modunu kullanabilirsiniz.
        </p>
      )}

      <div className="demo-transcript" aria-live="polite">
        {finalText || interim ? (
          <>
            <span>{finalText}</span>
            <span className="demo-transcript__interim">{interim}</span>
          </>
        ) : (
          <span className="demo-transcript__placeholder">
            Transkript burada belirecek…
          </span>
        )}
      </div>

      {finalText && (
        <div className="demo-actions">
          <button className="demo-btn demo-btn--ghost" onClick={copy}>
            {copied ? "✓ Kopyalandı" : "Kopyala"}
          </button>
        </div>
      )}

      {note && <p className="demo-note">{note}</p>}
    </div>
  );
}
