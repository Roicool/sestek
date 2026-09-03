/*!
 * outbound-demo.js v1.2.1
 * "Sizi arayalım" outbound demo formu — ziyaretçi adını + telefonunu bırakır,
 * Knovvu Outbound Manager onu GERÇEKTEN arar. Bu script yalnız client tarafı:
 * doğrular, sunucu proxy'sine JSON POST eder, durumları yönetir. Knovvu
 * credential'ları TARAYICIYA ASLA İNMEZ — istekler server-side proxy'ye gider
 * (sözleşme: docs/outbound-demo-api.md). Zero deps.
 * https://github.com/roicool/sestek
 *
 * DOM (Webflow) — görünüm tamamen Designer'da, script yalnız davranış:
 *   <form data-outbound-demo
 *         data-od-endpoint="/demos/api/demos/outbound-call"  ← ops. (default bu)
 *         data-od-lang="TR"                                  ← ops. arama dili
 *         data-od-cooldown="600"                             ← ops. numara başına sn
 *         data-od-turnstile="0x4AAA…">                       ← ops. Turnstile SITE key
 *     <input  data-od-name  type="text">
 *     <input  data-od-phone type="tel">
 *     <label><input data-od-consent type="checkbox"> KVKK…</label>
 *     <input  data-od-hp type="text" tabindex="-1" autocomplete="off"
 *             style="position:absolute;left:-9999px">        ← honeypot (ops.)
 *     <div data-od-turnstile-slot></div>                     ← widget buraya (ops.)
 *     <button data-od-submit type="submit">Beni ara</button>
 *     <div data-od-success hidden>Aramanız başlatıldı…</div>
 *     <div data-od-error   hidden>Bir şeyler ters gitti.</div>
 *   </form>
 *
 * Turnstile (bot koruması):
 *   data-od-turnstile'a Cloudflare Turnstile SITE key'ini ver — o zaman ve
 *   yalnız o zaman challenges.cloudflare.com script'i (tek sefer) yüklenir,
 *   widget [data-od-turnstile-slot] içine çizilir (slot yoksa submit
 *   butonunun önüne otomatik açılır), jeton payload'a `turnstileToken` olarak
 *   eklenir. Jetonlar tek kullanımlık olduğundan her denemeden sonra widget
 *   reset edilir. Attribute YOKSA davranış aynen eskisi gibi kalır: jeton boş
 *   gider ve kararı sunucu verir (secret tanımlıysa 403 captcha_failed).
 *   Site key gizli değildir; secret key yalnız sunucu ortamında durur.
 *
 * Davranış:
 *   • Client doğrulama: ad ≥ 2 karakter; telefon TR mobil formata normalize
 *     edilir (+90… / 90… / 05… → "05XXXXXXXXX"); consent işaretli olmalı.
 *     Hatalı alana .od-invalid basılır, [data-od-error] ilgili mesajla açılır.
 *   • Gönderim: JSON POST { name, phone, consent, lang, hp } → proxy.
 *     Root'a is-sending; yanıtta is-success / is-error. Çift gönderim kilidi.
 *   • KALICI cooldown (localStorage — sayfa yenilense de tutar): başarılı
 *     gönderimden sonra AYNI NUMARAYA data-od-cooldown sn (default 600)
 *     boyunca yeni istek atılmaz (rate_limited mesajı gösterilir, fetch hiç
 *     çıkmaz); ayrıca numara fark etmeksizin 60 sn form kilidi. localStorage
 *     kapalıysa oturum içi bellekle devam eder. Gerçek limit yine sunucuda.
 *   • Sunucu hata kodları ({error}) mesaja çevrilir; bilinmeyen kod → genel
 *     mesaj. Mesajlar data-od-msg-<kod> attribute'larıyla override edilebilir
 *     (örn. data-od-msg-rate_limited="Biraz sonra tekrar deneyin").
 *
 * API sözleşmesi (server tarafı ayrı repo'da; bkz. docs/outbound-demo-api.md):
 *   200 {ok:true} · 400 {ok:false,error:"invalid_name"|"invalid_phone"|
 *   "consent_required"} · 429 {ok:false,error:"rate_limited",retryAfter?} ·
 *   501 {ok:false,error:"not_configured"} · 502 {ok:false,error:"upstream"}
 *
 * Changelog
 * v1.2.1 — sunucu hata kodu `error` veya `reason` alanından okunur ve tek
 *          biçime indirilir; anlamlı hatalar artık "generic"e düşmüyor
 * v1.2.0 — Cloudflare Turnstile: data-od-turnstile ile site key verildiğinde
 *          widget çizilir, jeton `turnstileToken` olarak gönderilir, her
 *          denemeden sonra reset edilir; captcha_failed mesajı eklendi
 * v1.1.0 — kalıcı client cooldown: başarılı gönderimler localStorage'da
 *          tutulur; aynı numara data-od-cooldown sn (default 600) içinde
 *          tekrar gönderilemez, genel 60 sn form kilidi de kalıcı
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  var MESSAGES = {
    invalid_name: "Lütfen adınızı girin.",
    invalid_phone: "Lütfen geçerli bir cep telefonu girin (05XX XXX XX XX).",
    consent_required: "Devam etmek için onay kutusunu işaretleyin.",
    rate_limited: "Kısa süre önce bir arama istediniz — lütfen biraz sonra tekrar deneyin.",
    not_configured: "Demo şu an kullanılamıyor, lütfen daha sonra deneyin.",
    captcha_failed: "Güvenlik doğrulaması tamamlanamadı — lütfen tekrar deneyin.",
    upstream: "Arama başlatılamadı, lütfen daha sonra tekrar deneyin.",
    network: "Bağlantı kurulamadı — internetinizi kontrol edip tekrar deneyin.",
    generic: "Bir şeyler ters gitti, lütfen tekrar deneyin."
  };

  /**
   * TR cep numarasını "05XXXXXXXXX" biçimine normalize eder; olmuyorsa null.
   * Kabul edilen girişler: 05XX…, 5XX…, 90 5XX…, +90 5XX… (boşluk/()-/nokta
   * ayraçları temizlenir).
   */
  function normalizePhone(raw) {
    if (!raw) return null;
    var d = String(raw).replace(/[\s().-]/g, "");
    if (d.charAt(0) === "+") d = d.slice(1);
    if (d.slice(0, 2) === "90" && d.length === 12) d = d.slice(2);
    if (d.charAt(0) === "5" && d.length === 10) d = "0" + d;
    return /^05\d{9}$/.test(d) ? d : null;
  }

  /* Sunucu hata kodunu mesaj anahtarına çevirir. Outbound `error`, CRM
   * `reason` alanını kullanıyor; bazı kodlar boşluklu geliyor. Tek biçime
   * indir ki anlamlı hata "generic"e düşmesin. */
  function errorCode(body) {
    var raw = body && (body.error || body.reason);
    if (typeof raw !== "string") return "generic";
    return raw.trim().toLowerCase().replace(/[\s-]+/g, "_") || "generic";
  }

  /* Turnstile script'ini tek sefer yükle; hazır olunca cb(window.turnstile),
   * gelmezse (ad blocker / ağ) cb(null) — form asla kilitlenmez. */
  var turnstileLoading = false;
  function withTurnstile(cb) {
    if (global.turnstile) return cb(global.turnstile);
    if (!turnstileLoading) {
      turnstileLoading = true;
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    var tries = 0;
    (function poll() {
      if (global.turnstile) return cb(global.turnstile);
      if (++tries > 100) return cb(null); // ~10 sn
      setTimeout(poll, 100);
    })();
  }

  /* Kalıcı gönderim kaydı — localStorage yoksa bellekte (oturumluk). */
  var STORE_KEY = "sestek-od";
  var memStore = { last: 0, phones: {} };
  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return memStore;
  }
  function writeStore(s) {
    memStore = s;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function recordSubmit(phone) {
    var s = readStore(), now = Date.now();
    s.last = now;
    s.phones = s.phones || {};
    s.phones[phone] = now;
    // eski kayıtları temizle (24 saatten yaşlı)
    for (var k in s.phones) {
      if (now - s.phones[k] > 86400000) delete s.phones[k];
    }
    writeStore(s);
  }
  /** Kalan cooldown ms'i döndürür (0 = gönderilebilir). */
  function cooldownLeft(phone, perPhoneMs) {
    var s = readStore(), now = Date.now();
    var left = Math.max(0, (s.last || 0) + 60000 - now); // genel form kilidi
    var t = s.phones && s.phones[phone];
    if (t) left = Math.max(left, t + perPhoneMs - now);  // numara kilidi
    return left;
  }

  function setup(root) {
    if (root._odInit) return null;
    root._odInit = true;

    var form = root.tagName === "FORM" ? root : root.querySelector("form");
    var nameEl = root.querySelector("[data-od-name]");
    var phoneEl = root.querySelector("[data-od-phone]");
    var consentEl = root.querySelector("[data-od-consent]");
    var hpEl = root.querySelector("[data-od-hp]");
    var submitEl = root.querySelector("[data-od-submit]");
    var successEl = root.querySelector("[data-od-success]");
    var errorEl = root.querySelector("[data-od-error]");
    if (!form || !nameEl || !phoneEl) {
      console.warn("[outbound-demo] form / [data-od-name] / [data-od-phone] eksik.");
      return null;
    }

    var endpoint = root.getAttribute("data-od-endpoint") ||
      "/demos/api/demos/outbound-call";
    var lang = root.getAttribute("data-od-lang") || "TR";
    var perPhoneMs = (parseFloat(root.getAttribute("data-od-cooldown")) || 600) * 1000;

    /* Turnstile widget'ı — yalnız site key verilmişse. */
    var tsKey = root.getAttribute("data-od-turnstile");
    var tsApi = null, tsWidget = null;
    if (tsKey) {
      var slot = root.querySelector("[data-od-turnstile-slot]");
      if (!slot) {
        slot = document.createElement("div");
        slot.setAttribute("data-od-turnstile-slot", "");
        var anchor = submitEl || form.lastElementChild;
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(slot, anchor);
        else form.appendChild(slot);
      }
      withTurnstile(function (ts) {
        if (!ts) return; // script gelmedi — jeton boş gider, sunucu karar verir
        tsApi = ts;
        try {
          tsWidget = ts.render(slot, {
            sitekey: tsKey,
            appearance: "interaction-only",
            "refresh-expired": "auto"
          });
        } catch (e) { /* çift render / geçersiz anahtar */ }
      });
    }
    function turnstileToken() {
      if (!tsApi || tsWidget === null) return "";
      try { return tsApi.getResponse(tsWidget) || ""; } catch (e) { return ""; }
    }
    function turnstileReset() {
      if (tsApi && tsWidget !== null) {
        try { tsApi.reset(tsWidget); } catch (e) {}
      }
    }

    var sending = false;
    var defaultError = errorEl ? errorEl.textContent : "";

    function msg(code) {
      return root.getAttribute("data-od-msg-" + code) ||
        MESSAGES[code] || defaultError || MESSAGES.generic;
    }
    function showError(code) {
      root.classList.add("is-error");
      if (errorEl) {
        errorEl.textContent = msg(code);
        errorEl.hidden = false;
      }
    }
    function clearState() {
      root.classList.remove("is-error", "is-success");
      if (errorEl) errorEl.hidden = true;
      if (successEl) successEl.hidden = true;
      [nameEl, phoneEl, consentEl].forEach(function (el) {
        if (el) el.classList.remove("od-invalid");
      });
    }
    function markInvalid(el, code) {
      if (el) {
        el.classList.add("od-invalid");
        el.focus();
      }
      showError(code);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      clearState();

      var name = (nameEl.value || "").trim();
      if (name.length < 2) return markInvalid(nameEl, "invalid_name");
      var phone = normalizePhone(phoneEl.value);
      if (!phone) return markInvalid(phoneEl, "invalid_phone");
      if (consentEl && !consentEl.checked) {
        return markInvalid(consentEl, "consent_required");
      }
      if (cooldownLeft(phone, perPhoneMs) > 0) {
        return showError("rate_limited"); // kalıcı cooldown — fetch hiç çıkmaz
      }

      sending = true;
      root.classList.add("is-sending");
      if (submitEl) submitEl.disabled = true;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          phone: phone,
          consent: true,
          lang: lang,
          hp: hpEl ? (hpEl.value || "") : "",
          turnstileToken: turnstileToken()
        })
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { status: res.status, body: body };
          });
        })
        .then(function (r) {
          if (r.status === 200 && r.body && r.body.ok) {
            root.classList.add("is-success");
            if (successEl) successEl.hidden = false;
            recordSubmit(phone); // kalıcı cooldown başlat
            form.reset();
          } else {
            showError(errorCode(r.body));
          }
        })
        .catch(function () { showError("network"); })
        .then(function () {
          sending = false;
          root.classList.remove("is-sending");
          if (submitEl) submitEl.disabled = false;
          turnstileReset(); // jetonlar tek kullanımlık
        });
    });

    // Yazmaya dönünce hata durumunu temizle
    [nameEl, phoneEl, consentEl].forEach(function (el) {
      if (el) el.addEventListener("input", function () {
        el.classList.remove("od-invalid");
        if (root.classList.contains("is-error")) {
          root.classList.remove("is-error");
          if (errorEl) errorEl.hidden = true;
        }
      });
    });

    return { el: root };
  }

  /**
   * Initialises every [data-outbound-demo] element on the page.
   * @param {string} [selector="[data-outbound-demo]"]
   */
  function initOutboundDemo(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-outbound-demo]")
    );
    var out = [];
    roots.forEach(function (root) {
      var c = setup(root);
      if (c) out.push(c);
    });
    return out;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initOutboundDemo = initOutboundDemo;

})(typeof window !== "undefined" ? window : this);
