/*!
 * outbound-demo.js v1.0.0
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
 *         data-od-lang="TR">                                 ← ops. arama dili
 *     <input  data-od-name  type="text">
 *     <input  data-od-phone type="tel">
 *     <label><input data-od-consent type="checkbox"> KVKK…</label>
 *     <input  data-od-hp type="text" tabindex="-1" autocomplete="off"
 *             style="position:absolute;left:-9999px">        ← honeypot (ops.)
 *     <button data-od-submit type="submit">Beni ara</button>
 *     <div data-od-success hidden>Aramanız başlatıldı…</div>
 *     <div data-od-error   hidden>Bir şeyler ters gitti.</div>
 *   </form>
 *
 * Davranış:
 *   • Client doğrulama: ad ≥ 2 karakter; telefon TR mobil formata normalize
 *     edilir (+90… / 90… / 05… → "05XXXXXXXXX"); consent işaretli olmalı.
 *     Hatalı alana .od-invalid basılır, [data-od-error] ilgili mesajla açılır.
 *   • Gönderim: JSON POST { name, phone, consent, lang, hp } → proxy.
 *     Root'a is-sending; yanıtta is-success / is-error. Çift gönderim kilidi +
 *     başarı sonrası 60 sn client cooldown (gerçek limit sunucuda).
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

    var sending = false, cooldownUntil = 0;
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
      if (sending || Date.now() < cooldownUntil) return;
      clearState();

      var name = (nameEl.value || "").trim();
      if (name.length < 2) return markInvalid(nameEl, "invalid_name");
      var phone = normalizePhone(phoneEl.value);
      if (!phone) return markInvalid(phoneEl, "invalid_phone");
      if (consentEl && !consentEl.checked) {
        return markInvalid(consentEl, "consent_required");
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
          hp: hpEl ? (hpEl.value || "") : ""
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
            cooldownUntil = Date.now() + 60000; // sunucudaki gerçek limitin gölgesi
            form.reset();
          } else {
            showError((r.body && r.body.error) || "generic");
          }
        })
        .catch(function () { showError("network"); })
        .then(function () {
          sending = false;
          root.classList.remove("is-sending");
          if (submitEl) submitEl.disabled = false;
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
