"use client";

/**
 * Text-to-Speech demosu.
 * Provider mimarisi: önce /api/demos/tts denenir (env-gated gerçek Knovvu
 * TTS proxy'si); yapılandırılmamışsa tarayıcının speechSynthesis API'sine
 * düşer ve bunun bir önizleme olduğu açıkça etiketlenir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLE_TEXTS, TTS_LANGUAGES, TTS_MAX_CHARS } from "../../lib/demo-config";

type Status = "idle" | "loading" | "speaking" | "error";

export default function TextToSpeechDemo() {
  const [text, setText] = useState(SAMPLE_TEXTS["tr-TR"]);
  const [lang, setLang] = useState("tr-TR");
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* Tarayıcı seslerini topla (async gelebilir) */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const langVoices = useMemo(
    () =>
      voices.filter((v) =>
        v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())
      ),
    [voices, lang]
  );

  useEffect(() => {
    setVoiceURI(langVoices[0]?.voiceURI ?? "");
  }, [langVoices]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setStatus("idle");
  }, []);

  const speak = useCallback(async () => {
    stop();
    setNote(null);
    setStatus("loading");

    /* 1) Gerçek TTS proxy'si yapılandırılmış mı? */
    try {
      const res = await fetch("/demos/api/demos/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (res.ok && res.headers.get("content-type")?.startsWith("audio/")) {
        setLiveMode(true);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setStatus("idle");
        setStatus("speaking");
        await audio.play();
        return;
      }
    } catch {
      /* route yok/mock — tarayıcı sentezine düş */
    }

    /* 2) Fallback: tarayıcı speechSynthesis */
    setLiveMode(false);
    if (!("speechSynthesis" in window)) {
      setStatus("error");
      setNote("Tarayıcınız konuşma sentezini desteklemiyor.");
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) utter.voice = v;
    utter.onend = () => setStatus("idle");
    utter.onerror = () => setStatus("idle");
    setStatus("speaking");
    window.speechSynthesis.speak(utter);
  }, [text, lang, voiceURI, voices, stop]);

  return (
    <div className="demo-card">
      <label className="demo-label" htmlFor="tts-text">
        Metin ({text.length}/{TTS_MAX_CHARS})
      </label>
      <textarea
        id="tts-text"
        className="demo-textarea"
        rows={4}
        maxLength={TTS_MAX_CHARS}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="demo-row">
        <div>
          <label className="demo-label" htmlFor="tts-lang">
            Dil
          </label>
          <select
            id="tts-lang"
            className="demo-select"
            value={lang}
            onChange={(e) => {
              setLang(e.target.value);
              const sample = SAMPLE_TEXTS[e.target.value];
              if (sample) setText(sample);
            }}
          >
            {TTS_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {liveMode !== true && langVoices.length > 0 && (
          <div>
            <label className="demo-label" htmlFor="tts-voice">
              Ses
            </label>
            <select
              id="tts-voice"
              className="demo-select"
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
            >
              {langVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="demo-actions">
        <button
          className="demo-btn"
          onClick={status === "speaking" ? stop : speak}
          disabled={!text.trim() || status === "loading"}
        >
          {status === "loading"
            ? "Hazırlanıyor…"
            : status === "speaking"
              ? "■ Durdur"
              : "▶ Seslendir"}
        </button>
        {status === "speaking" && <span className="demo-pulse" aria-hidden />}
      </div>

      {note && <p className="demo-note demo-note--error">{note}</p>}
      {liveMode === false && (
        <p className="demo-note">
          Önizleme sesi tarayıcınızın sentezleyicisinden geliyor — üretim
          sürümü Knovvu TTS API&apos;sine bağlanır (env:{" "}
          <code>SESTEK_TTS_URL</code> + <code>SESTEK_TTS_API_KEY</code>).
        </p>
      )}
    </div>
  );
}
