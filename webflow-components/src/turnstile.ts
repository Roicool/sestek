/**
 * turnstile — Cloudflare Turnstile bot koruması (React component'ler için ortak).
 *
 * Neden: honeypot ve istemci cooldown'ı curl ile atlanır; formlar tarayıcı
 * dışından tekrar tekrar çağrılabiliyor. Turnstile, isteğin gerçekten bir
 * tarayıcıdan geldiğine dair TEK KULLANIMLIK bir jeton üretir; asıl kontrol
 * sunucudadır (siteverify). Jeton olmadan gelen istek sunucuda reddedilir.
 *
 * Kullanım (component içinde):
 *
 *   const ts = useTurnstile(turnstileSiteKey);
 *   ...
 *   <div ref={ts.slotRef} className="…" />        // widget buraya render edilir
 *   ...
 *   const token = await ts.getToken();            // submit'ten hemen önce
 *   body: JSON.stringify({ …, turnstileToken: token })
 *   ...
 *   ts.reset();                                   // her denemeden sonra
 *
 * Site key BOŞSA hiçbir şey yapılmaz: script yüklenmez, widget çizilmez,
 * getToken() "" döner. Yani kod yayınlansa da anahtar Designer'da girilene
 * kadar davranış değişmez — geri alınabilir, kademeli açılış.
 *
 * Site key GİZLİ DEĞİLDİR (HTML'de görünür). Gizli olan secret key'dir ve
 * yalnız sunucunun ortam değişkeninde durur; bu repoda hiçbir yerde geçmez.
 *
 * Görünüm: appearance "interaction-only" — ziyaretçi şüpheli değilse widget
 * hiç görünmez, yalnız gerçekten meydan okuma gerektiğinde çizilir. Bu yüzden
 * slot div'ine sabit yükseklik verilmemeli.
 */

/**
 * Site key'i tek merkezden çözer. Sıra:
 *
 *   1. Component prop'u (Designer'da o örneğe özel girilmişse)
 *   2. `window.SESTEK_TURNSTILE_SITE_KEY` — site geneli custom code
 *   3. `[data-turnstile-sitekey]` attribute'u (genelde <body> üzerinde)
 *
 * Amaç: anahtarı dört component'e ayrı ayrı girmek zorunda kalmamak.
 * Webflow'un istemci tarafında ortam değişkeni yoktur; en yakın karşılığı
 * Project Settings → Custom Code → Head'e konan tek satırdır:
 *
 *   <script>window.SESTEK_TURNSTILE_SITE_KEY="0x4AAA…";</script>
 *
 * Bu satır component bundle'ından ÖNCE çalışmalı, o yüzden Head'e konur.
 * Anahtarı tek bir sayfada değiştirmek gerekirse prop hâlâ üstün gelir.
 *
 * Site key gizli değildir, HTML'de zaten görünür. Gizli olan secret key'dir
 * ve yalnız sunucunun ortam değişkeninde durur.
 */
export function resolveSiteKey(explicit?: string): string {
  const own = (explicit || "").trim();
  if (own) return own;
  if (typeof window === "undefined") return "";

  const g = (window as unknown as { SESTEK_TURNSTILE_SITE_KEY?: unknown })
    .SESTEK_TURNSTILE_SITE_KEY;
  if (typeof g === "string" && g.trim()) return g.trim();

  const el = document.querySelector("[data-turnstile-sitekey]");
  return (el?.getAttribute("data-turnstile-sitekey") || "").trim();
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  getResponse: (id: string) => string | undefined;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading = false;

/** Script'i tek sefer yükler; hazır olunca çözülür, gelmezse null döner. */
export function loadTurnstile(timeoutMs = 10000): Promise<TurnstileApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);

  if (!loading) {
    loading = true;
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (window.turnstile) return resolve(window.turnstile);
      // Script engellenmiş olabilir (ad blocker, ağ). Formu kilitlemeyiz;
      // jeton boş gider, kararı sunucu verir.
      if (Date.now() - started > timeoutMs) return resolve(null);
      setTimeout(tick, 100);
    };
    tick();
  });
}

export type TurnstileHandle = {
  /** Widget'ın çizileceği div'e bağlanır. */
  slotRef: (el: HTMLDivElement | null) => void;
  /** Jetonu döndürür; hazır değilse kısa süre bekler. Anahtar yoksa "". */
  getToken: () => Promise<string>;
  /** Jetonlar tek kullanımlık — her gönderim denemesinden sonra çağır. */
  reset: () => void;
  /** Site key verilmiş mi (slot div'i çizmeye değer mi). */
  enabled: boolean;
};

/**
 * Turnstile widget'ını yönetir. React'e bağımlılığı yalnız `useEffect` /
 * `useRef` olduğundan React modülü parametre olarak alınmaz; component
 * kendi React'iyle çağırır.
 */
export function createTurnstile(
  React: typeof import("react"),
  siteKey: string
): TurnstileHandle {
  const key = resolveSiteKey(siteKey);
  const enabled = key.length > 0;

  const slotEl = React.useRef<HTMLDivElement | null>(null);
  const widgetId = React.useRef<string | null>(null);
  const api = React.useRef<TurnstileApi | null>(null);
  const token = React.useRef<string>("");
  const waiters = React.useRef<Array<(t: string) => void>>([]);

  const settle = React.useCallback((t: string) => {
    token.current = t;
    const list = waiters.current;
    waiters.current = [];
    list.forEach((fn) => fn(t));
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    let dead = false;

    loadTurnstile().then((ts) => {
      if (dead || !ts || !slotEl.current) return;
      api.current = ts;
      try {
        widgetId.current = ts.render(slotEl.current, {
          sitekey: key,
          appearance: "interaction-only",
          callback: (t: string) => settle(t || ""),
          "error-callback": () => settle(""),
          "expired-callback": () => {
            token.current = "";
          },
          "refresh-expired": "auto",
        });
      } catch {
        /* çift render / geçersiz anahtar — jeton boş gider, sunucu karar verir */
      }
    });

    return () => {
      dead = true;
      const ts = api.current;
      const id = widgetId.current;
      if (ts && id !== null) {
        try {
          ts.remove(id);
        } catch {}
      }
      widgetId.current = null;
    };
    // key değişirse (Designer'da girildiğinde) yeniden kurulur
  }, [enabled, key, settle]);

  const slotRef = React.useCallback((el: HTMLDivElement | null) => {
    slotEl.current = el;
  }, []);

  const getToken = React.useCallback((): Promise<string> => {
    if (!enabled) return Promise.resolve("");
    if (token.current) return Promise.resolve(token.current);

    // Widget henüz çözmediyse kısa süre bekle. Meydan okuma ekranı çıkarsa
    // ziyaretçinin çözmesi gerekir; bu yüzden pencere geniş tutuldu.
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((w) => w !== onDone);
        resolve(token.current || "");
      }, 30000);
      const onDone = (t: string) => {
        clearTimeout(timer);
        resolve(t);
      };
      waiters.current.push(onDone);
    });
  }, [enabled]);

  const reset = React.useCallback(() => {
    token.current = "";
    const ts = api.current;
    const id = widgetId.current;
    if (ts && id !== null) {
      try {
        ts.reset(id);
      } catch {}
    }
  }, []);

  return { slotRef, getToken, reset, enabled };
}
