/*!
 * legal-addresses.js v1.0.0
 * Reads the visible office-address blocks in the footer and emits a matching
 * Organization JSON-LD schema automatically — so the address text you see on
 * the page and the structured data Google/AI assistants read are always the
 * same, written once.
 *
 * DOM (Webflow) — fill in real text, the script only reads it:
 *   <div data-legal-addresses>
 *     <div data-legal-address>
 *       <h4 data-legal-address-city>İstanbul, Türkiye</h4>
 *       <p data-legal-address-street>Açık adres satırı 1, Açık adres satırı 2</p>
 *       <p data-legal-address-phone>+90 ...</p>
 *     </div>
 *     <div data-legal-address> ... ofis 2 ... </div>
 *     <div data-legal-address> ... ofis 3 ... </div>
 *     <div data-legal-address> ... ofis 4 ... </div>
 *   </div>
 *
 * Attributes (all read as plain text, exactly as typed in Webflow):
 *   data-legal-addresses          wraps every office block (required)
 *   data-legal-address            one office (required, repeatable)
 *   data-legal-address-city       "City, Country" — split on the last comma
 *   data-legal-address-street     street address (street + any locality info)
 *   data-legal-address-postal     postal/zip code (optional)
 *   data-legal-address-phone      phone number (optional)
 *
 * The script injects ONE <script type="application/ld+json"> with an
 * Organization node whose "address" is an array of PostalAddress entries —
 * it does not touch or duplicate any visible markup.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function text(el, sel) {
    var node = el.querySelector(sel);
    return node ? node.textContent.trim() : "";
  }

  function splitCity(value) {
    var parts = value.split(",");
    var country = parts.pop().trim();
    var locality = parts.join(",").trim();
    return { locality: locality, country: country };
  }

  function buildAddress(block) {
    var city   = splitCity(text(block, "[data-legal-address-city]"));
    var street = text(block, "[data-legal-address-street]");
    var postal = text(block, "[data-legal-address-postal]");
    var phone  = text(block, "[data-legal-address-phone]");

    var address = {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city.locality,
      addressCountry: city.country,
    };
    if (postal) address.postalCode = postal;

    return { address: address, phone: phone };
  }

  /**
   * Reads every [data-legal-address] block inside [data-legal-addresses] and
   * injects a single Organization JSON-LD schema built from them.
   * @param {string} [selector="[data-legal-addresses]"]
   */
  function initLegalAddresses(selector) {
    var wrap = global.document.querySelector(selector || "[data-legal-addresses]");
    if (!wrap) return;

    var blocks = wrap.querySelectorAll("[data-legal-address]");
    if (!blocks.length) return;

    var addresses = [];
    var phones = [];
    Array.prototype.forEach.call(blocks, function (block) {
      var entry = buildAddress(block);
      addresses.push(entry.address);
      if (entry.phone) phones.push(entry.phone);
    });

    var org = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Sestek",
      url: global.location.origin,
      address: addresses,
    };
    if (phones.length) org.contactPoint = phones.map(function (phone) {
      return { "@type": "ContactPoint", telephone: phone, contactType: "customer service" };
    });

    var script = global.document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(org);
    global.document.head.appendChild(script);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLegalAddresses = initLegalAddresses;

})(typeof window !== "undefined" ? window : this);
