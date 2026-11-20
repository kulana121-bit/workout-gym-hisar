/* =============================================================================
   The Workout Gym · Hisar — site behaviour
   Progressive enhancement only: with JavaScript disabled the pages stay
   readable, every link still works and every form still shows its fields.
   Reads configuration from assets/js/business.js (window.LF).

   Modules
     utils          tiny helpers
     contact        phone / WhatsApp / maps links driven by config
     openState      "Open now" logic from the gym's hours
     header         sticky header, scroll progress, hide-on-scroll
     drawer         mobile navigation drawer with focus handling
     reveal         scroll reveal + counters + parallax + statement highlight
     programmes     interactive programme list (desktop preview)
     slider         testimonials carousel
     lightbox       facility gallery viewer
     bmi            BMI calculator
     forms          trial / enquiry forms: validation, WhatsApp handoff, copy
     prefill        ?plan= / ?programme= deep links into the forms
   ========================================================================== */
(function () {
  "use strict";

  var LF = window.LF || {};
  var doc = document;
  var root = doc.documentElement;
  root.classList.add("js");

  /* ------------------------------------------------------------------ utils */
  function $(sel, ctx) {
    return (ctx || doc).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  }
  function on(el, ev, fn, opts) {
    if (el) el.addEventListener(ev, fn, opts);
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function localISO(date) {
    // toISOString() is UTC and can shift the day; build the string locally.
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + m + "-" + d;
  }

  function dayKey(date) {
    return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
  }

  /* The gym is in Hisar, so "open now" must follow India Standard Time even when
     the visitor is in another timezone or their device clock is set oddly. */
  var GYM_TZ = "Asia/Kolkata";
  function gymClock(date) {
    date = date || new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: GYM_TZ,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(date);
      var map = {};
      parts.forEach(function (p) {
        map[p.type] = p.value;
      });
      var keys = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };
      var key = keys[map.weekday] || dayKey(date);
      var order = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      return {
        key: key,
        idx: (order[key] + 6) % 7,
        mins: (parseInt(map.hour, 10) % 24) * 60 + parseInt(map.minute, 10),
      };
    } catch (err) {
      var fallback = dayKey(date);
      return {
        key: fallback,
        idx: (date.getDay() + 6) % 7,
        mins: date.getHours() * 60 + date.getMinutes(),
      };
    }
  }

  function reducedMotion() {
    try {
      return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (err) {
      // A broken matchMedia must never stop content from being shown.
      return false;
    }
  }
  var supportsIO =
    typeof window.IntersectionObserver === "function" && "IntersectionObserver" in window;

  /* ---------------------------------------------------------------- contact */
  /* Phone and WhatsApp buttons only exist when the gym's number is filled in
     business.js. Nothing is ever rendered as a fake or placeholder number.
     The flags are getters so a late config change (or a phone number added by
     the owner after launch) is picked up on the next interaction. */
  var contact = {
    get hasPhone() {
      return !!LF.phone;
    },
    get hasWhatsapp() {
      return !!(LF.whatsapp || LF.phone);
    },
    callHref: function () {
      return "tel:" + (LF.phone || "").replace(/[^\d+]/g, "");
    },
    whatsappNumber: function () {
      return (LF.whatsapp || LF.phone || "").replace(/\D/g, "");
    },
    whatsappHref: function (message) {
      var n = contact.whatsappNumber();
      if (!n) return "";
      return "https://wa.me/" + n + "?text=" + encodeURIComponent(message || "");
    },
  };

  function applyContactLinks() {
    $$("[data-contact]").forEach(function (el) {
      var kind = el.getAttribute("data-contact");
      var available =
        kind === "call" ? contact.hasPhone : kind === "whatsapp" ? contact.hasWhatsapp : true;
      if (!available) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      if (kind === "call") el.setAttribute("href", contact.callHref());
      if (kind === "whatsapp" && !el.hasAttribute("data-wa-managed")) {
        el.setAttribute(
          "href",
          contact.whatsappHref(
            "Namaste " + (LF.name || "The Workout Gym") + "! I found you online and I'd like to know more about joining."
          )
        );
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      }
      if (kind === "call") {
        var label = LF.phoneDisplay || LF.phone;
        if (label && !el.hasAttribute("data-label-kept")) el.setAttribute("aria-label", "Call " + label);
      }
    });
    $$("[data-phone-text]").forEach(function (el) {
      el.textContent = LF.phoneDisplay || LF.phone || "";
    });
    // Action bar columns follow what is actually available.
    var bar = $("[data-actionbar]");
    if (bar) {
      var cols = $$("a", bar).filter(function (a) {
        return !a.hidden;
      }).length;
      bar.classList.toggle("actionbar--3", cols >= 3);
    }
  }

  /* -------------------------------------------------------------- openState */
  function openState(now) {
    now = now || new Date();
    var hours = LF.hours || [];
    if (hours.length !== 7) return null;
    var clock = gymClock(now);
    var idx = clock.idx; // 0 = Monday, matches LF.hours order
    var mins = clock.mins;
    function toMin(t) {
      var p = String(t).split(":");
      return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    }
    function pretty(t) {
      var p = String(t).split(":"),
        h = parseInt(p[0], 10),
        m = p[1],
        ampm = h >= 12 ? "PM" : "AM",
        hh = h % 12 === 0 ? 12 : h % 12;
      return hh + ":" + m + " " + ampm;
    }
    var today = hours[idx];
    if (!today.closed) {
      var o = toMin(today.open),
        c = toMin(today.close);
      if (mins >= o && mins < c) {
        return { open: true, text: "Open now · until " + pretty(today.close) };
      }
      if (mins < o) {
        return { open: false, text: "Closed · opens today " + pretty(today.open) };
      }
    }
    for (var i = 1; i <= 7; i++) {
      var d = hours[(idx + i) % 7];
      if (!d.closed) {
        var when = i === 1 ? "tomorrow" : d.day;
        return { open: false, text: "Closed · opens " + when + " " + pretty(d.open) };
      }
    }
    return null;
  }

  function applyOpenState() {
    var state = openState();
    if (!state) return;
    $$("[data-open-status]").forEach(function (el) {
      el.textContent = state.text;
    });
    var dot = $("[data-open-dot]");
    if (dot) dot.dataset.state = state.open ? "open" : "closed";
    // Highlight today's row. Rows declare the days they cover, so a compact
    // "Mon–Sat" row is highlighted on six days a week and a seven-row table
    // highlights exactly one.
    var today = gymClock().key;
    $$("[data-hours-row]").forEach(function (row) {
      var spec = row.getAttribute("data-days") || row.getAttribute("data-day") || "";
      var covered = spec.split(/[\s,]+/).filter(Boolean);
      var isToday = covered.indexOf(today) !== -1;
      row.classList.toggle("is-today", isToday);
      var badge = $("[data-today-badge]", row);
      if (badge) badge.hidden = !isToday;
    });
  }

  /* ----------------------------------------------------------------- header */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;
    var progress = $("[data-progress]");
    var last = window.scrollY;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      header.classList.toggle("is-solid", y > 24);
      var down = y > last && y > 320;
      var drawerOpen = doc.body.classList.contains("nav-open");
      header.classList.toggle("is-hidden", down && !drawerOpen);
      last = y;
      if (progress) {
        var h = doc.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (h > 0 ? clamp(y / h, 0, 1) * 100 : 0).toFixed(2) + "%";
      }
      var bar = $("[data-actionbar]");
      if (bar) bar.classList.toggle("is-shown", y > 420);
    }
    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    on(window, "scroll", request, { passive: true });
    on(window, "resize", request);
    update();
  }

  /* ----------------------------------------------------------------- drawer */
  function initDrawer() {
    var toggle = $("[data-nav-toggle]");
    if (!toggle) return;
    var drawer = $("[data-drawer]");
    var focusables = function () {
      return $$("a[href], button:not([disabled])", drawer).filter(function (el) {
        return el.offsetParent !== null;
      });
    };
    function openDrawer() {
      doc.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      var first = focusables()[0];
      if (first) first.focus({ preventScroll: true });
    }
    function closeDrawer(returnFocus) {
      doc.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      if (returnFocus) toggle.focus({ preventScroll: true });
    }
    on(toggle, "click", function () {
      if (doc.body.classList.contains("nav-open")) closeDrawer(true);
      else openDrawer();
    });
    $$("a", drawer).forEach(function (a) {
      on(a, "click", function () {
        closeDrawer(false);
      });
    });
    on(doc, "keydown", function (e) {
      if (!doc.body.classList.contains("nav-open")) return;
      if (e.key === "Escape") {
        closeDrawer(true);
        return;
      }
      if (e.key !== "Tab") return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    on(window, "resize", function () {
      if (window.innerWidth >= 1040 && doc.body.classList.contains("nav-open")) closeDrawer(false);
    });
  }

  /* ----------------------------------------------------------------- reveal */
  /* Scroll reveals are progressive enhancement only. Content must appear even
     if this module, IntersectionObserver, or the whole script fails. Four
     independent safety nets, in order of how early they act:
       1. above-the-fold .rv elements are revealed here, synchronously;
       2. anything still pending is revealed after REVEAL_FALLBACK_MS;
       3. `load`, `pageshow`, print and orientation changes sweep the rest;
       4. the inline <head> script adds html.reveal-fallback if site.js never
          boots at all. CSS handles a JS-disabled browser by itself. */
  var REVEAL_FALLBACK_MS = 3000;

  function revealAll() {
    $$(".rv").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  function initReveal() {
    var items = $$(".rv");
    if (!items.length) return;
    // Show what the visitor can already see, without waiting for a callback.
    var viewport = window.innerHeight || root.clientHeight || 0;
    var pending = [];
    items.forEach(function (el) {
      var box;
      try {
        box = el.getBoundingClientRect();
      } catch (err) {
        box = null;
      }
      // In a layout-less environment (jsdom, print, some embedded views) every
      // rect is 0, which deliberately falls through to "show it".
      if (!box || !viewport || box.top < viewport * 0.92) {
        el.classList.add("is-in");
      } else {
        pending.push(el);
      }
    });

    // Time-based net. It only fires while this module is alive, so it can never
    // hide anything the CSS fallback has already made readable.
    window.setTimeout(revealAll, REVEAL_FALLBACK_MS);
    on(window, "load", function () {
      window.setTimeout(revealAll, 1200);
    });
    on(window, "pageshow", function (e) {
      if (e.persisted) revealAll();
    });
    on(window, "beforeprint", revealAll);
    on(window, "orientationchange", function () {
      window.setTimeout(revealAll, 600);
    });

    if (!pending.length || !supportsIO || reducedMotion()) {
      pending.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }

    var io;
    try {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
    } catch (err) {
      // Older or locked-down browsers: fall back to showing everything.
      pending.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }

    pending.forEach(function (el) {
      try {
        io.observe(el);
      } catch (err) {
        el.classList.add("is-in");
      }
    });
  }

  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
      var dur = 1400;
      var t0 = null;
      if (reducedMotion()) {
        el.textContent = target.toFixed(dec);
        return;
      }
      function step(t) {
        if (t0 === null) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!supportsIO) {
      els.forEach(run);
      return;
    }
    try {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              run(entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      els.forEach(function (el) {
        io.observe(el);
      });
    } catch (err) {
      els.forEach(run);
    }
  }

  function initScrollProse() {
    var wrap = $("[data-statement]");
    var hero = $("[data-hero-media]");
    var pars = $$("[data-par]");
    if (!wrap && !hero && !pars.length) return;
    var words = [];
    if (wrap) {
      // Build the word spans once, so the highlight can travel through the
      // sentence as it scrolls. `data-accent` words turn gold when lit.
      var accents = (wrap.getAttribute("data-accent") || "")
        .split(",")
        .map(function (s) {
          return s.trim().toLowerCase();
        })
        .filter(Boolean);
      var parts = wrap.textContent.replace(/\s+/g, " ").trim().split(" ");
      wrap.textContent = "";
      parts.forEach(function (word, i) {
        var span = doc.createElement("span");
        span.className = "w";
        var bare = word.replace(/[^A-Za-z'-]/g, "").toLowerCase();
        if (accents.indexOf(bare) !== -1) span.classList.add("accent");
        span.textContent = word;
        wrap.appendChild(span);
        if (i < parts.length - 1) wrap.appendChild(doc.createTextNode(" "));
        words.push(span);
      });
    }
    var ticking = false;

    function frame() {
      ticking = false;
      var vh = window.innerHeight;
      if (hero && !reducedMotion()) {
        var hy = clamp(window.scrollY / Math.max(vh, 1), 0, 1);
        hero.style.transform = "translate3d(0," + (hy * 26).toFixed(1) + "px,0) scale(" + (1 + hy * 0.06).toFixed(3) + ")";
      }
      if (words.length) {
        var box = wrap.getBoundingClientRect();
        var p = clamp((vh * 0.86 - box.top) / (box.height + vh * 0.5), 0, 1);
        var lit = Math.round(p * words.length * 1.18);
        words.forEach(function (w, i) {
          w.classList.toggle("on", i < lit);
        });
      }
      pars.forEach(function (el) {
        var b = el.getBoundingClientRect();
        if (b.bottom < -80 || b.top > vh + 80) return;
        var q = (b.top + b.height / 2 - vh / 2) / vh;
        el.style.transform = "translate3d(0," + (-q * 18).toFixed(2) + "px,0)";
      });
    }
    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }
    on(window, "scroll", request, { passive: true });
    on(window, "resize", request);
    frame();
  }

  /* ------------------------------------------------------------- programmes */
  function initProgrammes() {
    var list = $("[data-prog-list]");
    if (!list) return;
    var rows = $$("[data-prog]", list);
    if (!rows.length) return;
    var preview = $("[data-prog-preview]");
    var images = preview ? $$("img", preview) : [];
    var caption = preview ? $("[data-prog-caption]", preview) : null;

    function activate(slug) {
      rows.forEach(function (row) {
        row.classList.toggle("is-active", row.getAttribute("data-prog") === slug);
      });
      images.forEach(function (img) {
        img.classList.toggle("is-shown", img.getAttribute("data-slug") === slug);
      });
      if (caption) {
        var row = rows.filter(function (r) {
          return r.getAttribute("data-prog") === slug;
        })[0];
        if (row) caption.textContent = row.getAttribute("data-prog-label") || "";
      }
    }

    rows.forEach(function (row) {
      var slug = row.getAttribute("data-prog");
      on(row, "mouseenter", function () {
        activate(slug);
      });
      on(row, "focus", function () {
        activate(slug);
      });
      on(row, "touchstart", function () {
        activate(slug);
      }, { passive: true });
    });
    // On first view, show the first programme.
    activate(rows[0].getAttribute("data-prog"));

    if (images.length) {
      images.forEach(function (img, i) {
        if (i > 0) {
          img.loading = "lazy";
          img.decoding = "async";
        }
      });
    }
  }

  /* ----------------------------------------------------------------- slider */
  function initSlider() {
    $$("[data-slider]").forEach(function (slider) {
      var track = $("[data-slider-track]", slider);
      var slides = $$("[data-slide]", slider);
      if (!track || slides.length < 2) return;
      var dotsWrap = $("[data-slider-dots]", slider);
      var prev = $("[data-slider-prev]", slider);
      var next = $("[data-slider-next]", slider);
      var pause = $("[data-slider-pause]", slider);
      var index = 0;
      var timer = null;
      var hovering = false;
      var paused = false;
      on(slider, "mouseenter", function () {
        hovering = true;
      });
      on(slider, "mouseleave", function () {
        hovering = false;
      });

      slides.forEach(function (s, i) {
        if (!s.id) s.id = "slide-" + (i + 1);
      });
      var dots = slides.map(function (_, i) {
        if (!dotsWrap) return null;
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "slider__dot";
        b.setAttribute("aria-label", "Show review " + (i + 1) + " of " + slides.length);
        if (i === 0) b.setAttribute("aria-current", "true");
        on(b, "click", function () {
          go(i, true);
        });
        dotsWrap.appendChild(b);
        return b;
      });

      function go(i, userInitiated) {
        index = (i + slides.length) % slides.length;
        track.style.transform = "translate3d(" + -index * 100 + "%,0,0)";
        slides.forEach(function (s, si) {
          s.setAttribute("aria-hidden", si === index ? "false" : "true");
          $$("a, button", s).forEach(function (el) {
            if (si === index) el.removeAttribute("tabindex");
            else el.setAttribute("tabindex", "-1");
          });
        });
        dots.forEach(function (d, di) {
          if (!d) return;
          if (di === index) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        });
        if (userInitiated) restart();
      }
      function restart() {
        if (timer) clearInterval(timer);
        timer = null;
        if (paused || reducedMotion() || slides.length < 2) return;
        timer = setInterval(function () {
          if (doc.hidden || hovering) return;
          go(index + 1);
        }, 7000);
      }
      on(prev, "click", function () {
        go(index - 1, true);
      });
      on(next, "click", function () {
        go(index + 1, true);
      });
      // WCAG 2.2.2: any automatically rotating content needs a visible pause.
      function setPaused(nextState) {
        paused = nextState;
        if (pause) {
          pause.setAttribute("aria-pressed", paused ? "true" : "false");
          pause.textContent = paused ? "Play" : "Pause";
          pause.setAttribute("aria-label", paused ? "Resume automatic review rotation" : "Pause automatic review rotation");
        }
        restart();
      }
      on(pause, "click", function () {
        setPaused(!paused);
      });
      if (pause && reducedMotion()) pause.hidden = true;
      on(slider, "keydown", function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(index - 1, true);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(index + 1, true);
        }
      });
      on(slider, "focusin", function () {
        if (timer) clearInterval(timer);
      });
      on(slider, "focusout", restart);
      // touch swipe
      var x0 = null;
      on(slider, "touchstart", function (e) {
        x0 = e.touches[0].clientX;
      }, { passive: true });
      on(slider, "touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1), true);
        x0 = null;
      });
      go(0);
      restart();
    });
  }

  /* ---------------------------------------------------------------- lightbox */
  function initLightbox() {
    var figures = $$("[data-lightbox-item]");
    var dlg = $("[data-lightbox]");
    if (!figures.length || !dlg) return;
    var img = $("[data-lightbox-img]", dlg);
    var cap = $("[data-lightbox-caption]", dlg);
    var counter = $("[data-lightbox-counter]", dlg);
    var index = 0;
    var lastFocus = null;

    function show(i) {
      index = (i + figures.length) % figures.length;
      var fig = figures[index];
      var full = fig.getAttribute("data-full");
      var caption = fig.getAttribute("data-caption") || "";
      if (img) {
        img.setAttribute("src", full);
        img.setAttribute("alt", caption);
      }
      if (cap) cap.textContent = caption;
      if (counter) counter.textContent = index + 1 + " / " + figures.length;
    }
    function open(i) {
      lastFocus = doc.activeElement;
      show(i);
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
      var close = $("[data-lightbox-close]", dlg);
      if (close) close.focus();
    }
    function close() {
      if (typeof dlg.close === "function" && dlg.open) dlg.close();
      else dlg.removeAttribute("open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    figures.forEach(function (fig, i) {
      on(fig, "click", function (e) {
        e.preventDefault();
        open(i);
      });
    });
    on($("[data-lightbox-close]", dlg), "click", close);
    on($("[data-lightbox-prev]", dlg), "click", function () {
      show(index - 1);
    });
    on($("[data-lightbox-next]", dlg), "click", function () {
      show(index + 1);
    });
    on(dlg, "keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    on(dlg, "click", function (e) {
      if (e.target === dlg) close();
    });
    on(dlg, "close", function () {
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    var x0 = null;
    on(dlg, "touchstart", function (e) {
      x0 = e.touches[0].clientX;
    }, { passive: true });
    on(dlg, "touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ------------------------------------------------------------------- BMI */
  function initBmi() {
    var box = $("[data-bmi]");
    if (!box) return;
    var unit = "metric";
    var heightEl = $("[data-bmi-height]", box);
    var heightLabel = $("[data-bmi-height-label]", box);
    var weightEl = $("[data-bmi-weight]", box);
    var weightLabel = $("[data-bmi-weight-label]", box);
    var valueEl = $("[data-bmi-value]", box);
    var catEl = $("[data-bmi-category]", box);
    var rangeEl = $("[data-bmi-range]", box);
    var noteEl = $("[data-bmi-note]", box);
    var scale = $$("[data-bmi-scale] span", box);
    var heightFt = $("[data-bmi-height-ft]", box);
    var heightIn = $("[data-bmi-height-in]", box);
    if (!heightEl || !weightEl || !valueEl || !catEl) return;

    function setUnit(next) {
      unit = next;
      $$("[data-bmi-unit]", box).forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-bmi-unit") === unit ? "true" : "false");
      });
      if (heightLabel) heightLabel.setAttribute("for", unit === "metric" ? "bmi-height" : "bmi-height-ft");
      if (unit === "metric") {
        heightLabel.textContent = "Height (cm)";
        weightLabel.textContent = "Weight (kg)";
        heightEl.hidden = false;
        if (heightFt) heightFt.hidden = true;
        if (heightIn) heightIn.hidden = true;
        weightEl.setAttribute("placeholder", "e.g. 72");
      } else {
        heightLabel.textContent = "Height";
        weightLabel.textContent = "Weight (lb)";
        heightEl.hidden = true;
        if (heightFt) heightFt.hidden = false;
        if (heightIn) heightIn.hidden = false;
        weightEl.setAttribute("placeholder", "e.g. 158");
      }
      compute();
    }

    function readHeightM() {
      if (unit === "metric") {
        var cm = parseFloat(heightEl.value);
        return isFinite(cm) && cm > 60 && cm < 260 ? cm / 100 : null;
      }
      var ft = parseFloat(heightFt.value) || 0;
      var inch = parseFloat(heightIn.value) || 0;
      var total = ft * 12 + inch;
      return total > 39 && total < 102 ? (total * 2.54) / 100 : null;
    }
    function readWeightKg() {
      var v = parseFloat(weightEl.value);
      if (!isFinite(v) || v <= 0) return null;
      if (unit === "metric") return v > 25 && v < 320 ? v : null;
      return v > 55 && v < 700 ? v / 2.20462 : null;
    }
    function category(bmi) {
      if (bmi < 18.5) return { label: "Underweight", step: 0 };
      if (bmi < 25) return { label: "Healthy range", step: 1 };
      if (bmi < 30) return { label: "Overweight", step: 2 };
      return { label: "Obese", step: 3 };
    }
    function compute() {
      var h = readHeightM(),
        w = readWeightKg();
      scale.forEach(function (s) {
        s.classList.remove("is-on");
      });
      if (!h || !w) {
        valueEl.textContent = "—";
        valueEl.classList.add("is-empty");
        catEl.textContent = "Enter your height and weight";
        catEl.className = "tag";
        rangeEl.textContent = "";
        noteEl.textContent = "BMI needs a height and a weight to calculate.";
        return;
      }
      var bmi = w / (h * h);
      var cat = category(bmi);
      valueEl.textContent = bmi.toFixed(1);
      valueEl.classList.remove("is-empty");
      catEl.textContent = cat.label;
      catEl.className = "tag " + (cat.step === 1 ? "tag--gold" : "");
      var lo = (18.5 * h * h).toFixed(1),
        hi = (24.9 * h * h).toFixed(1);
      var loDisp = unit === "metric" ? lo + " kg" : (lo * 2.20462).toFixed(1) + " lb";
      var hiDisp = unit === "metric" ? hi + " kg" : (hi * 2.20462).toFixed(1) + " lb";
      rangeEl.textContent = "Healthy weight range for this height: " + loDisp + " – " + hiDisp;
      scale.forEach(function (s, i) {
        if (i <= cat.step) s.classList.add("is-on");
      });
      noteEl.textContent =
        "BMI is a rough screening number. It does not measure body fat, muscle or fitness, and it is less reliable for athletes, growing teenagers, pregnant women, older adults and anyone with a medical condition. Use it as a starting point for a conversation, never as a diagnosis.";
    }

    $$("[data-bmi-unit]", box).forEach(function (b) {
      on(b, "click", function () {
        setUnit(b.getAttribute("data-bmi-unit"));
      });
    });
    [heightEl, weightEl, heightFt, heightIn].forEach(function (el) {
      on(el, "input", compute);
    });
    setUnit("metric");
  }

  /* ----------------------------------------------------------------- forms */
  var PHONE_RE = /^[6-9]\d{9}$/;

  function cleanPhone(raw) {
    var v = String(raw || "").replace(/[\s()\-.]/g, "");
    v = v.replace(/^(\+91|91|0)/, "");
    return v;
  }

  function fieldWrap(input) {
    if (!input) return null;
    return (input.closest && input.closest(".field")) || input.parentNode || input;
  }

  function setError(input, message) {
    var wrap = fieldWrap(input);
    wrap.classList.add("is-invalid");
    wrap.classList.remove("is-valid");
    input.setAttribute("aria-invalid", "true");
    var err = $(".field__error", wrap);
    if (err) {
      err.textContent = message;
      err.hidden = false;
    }
    if (!err) {
      input.setAttribute("data-error", message);
    }
  }

  function clearError(input) {
    var wrap = fieldWrap(input);
    wrap.classList.remove("is-invalid");
    if (input.value !== "") wrap.classList.add("is-valid");
    input.removeAttribute("aria-invalid");
    var err = $(".field__error", wrap);
    if (err) err.hidden = true;
  }

  function validateField(input) {
    var name = input.getAttribute("data-rule") || input.name || "";
    var value = String(input.value || "").trim();
    if (input.type === "hidden" || input.type === "submit") return true;

    if (input.hasAttribute("required") && value === "") {
      setError(
        input,
        input.getAttribute("data-error-required") || "This field is needed to send your request."
      );
      return false;
    }
    if (value === "") {
      clearError(input);
      return true;
    }
    if (name === "phone" || input.type === "tel") {
      var digits = cleanPhone(value);
      if (!PHONE_RE.test(digits)) {
        setError(
          input,
          "Enter a 10-digit mobile number starting with 6, 7, 8 or 9 (you can add +91 if you like)."
        );
        return false;
      }
      input.value = digits;
    }
    if (name === "name" || input.autocomplete === "name") {
      if (value.replace(/[^\p{L}]/gu, "").length < 2) {
        setError(input, "Please enter the name the team should ask for.");
        return false;
      }
    }
    if (name === "message" && input.tagName === "TEXTAREA" && value.length < 10) {
      setError(input, "Please add a little more detail — ten characters or more helps the gym reply properly.");
      return false;
    }
    if (input.type === "date") {
      var picked = new Date(value + "T00:00:00");
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var max = new Date(today.getTime() + (LF.trial && LF.trial.daysAhead ? LF.trial.daysAhead : 45) * 86400000);
      if (isNaN(picked.getTime())) {
        setError(input, "Choose the day you'd like to visit.");
        return false;
      }
      if (picked < today) {
        setError(input, "That date has passed — pick today or a day ahead.");
        return false;
      }
      if (picked > max) {
        setError(input, "Please pick a day within the next " + (LF.trial ? LF.trial.daysAhead : 45) + " days.");
        return false;
      }
      if (picked.getDay() === 0) {
        setError(input, "The gym is closed on Sundays — pick another day.");
        return false;
      }
    }
    clearError(input);
    return true;
  }

  function formatDate(value) {
    if (!value) return "";
    var d = new Date(value + "T00:00:00");
    if (isNaN(d.getTime())) return value;
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function formSummary(form) {
    var rows = [];
    var plan = form.getAttribute("data-plan-label");
    var prog = form.getAttribute("data-programme-label");
    if (plan) rows.push(["Plan of interest", plan]);
    if (prog) rows.push(["Programme", prog]);
    $$("input, select, textarea", form).forEach(function (el) {
      if (el.type === "hidden" || el.type === "submit" || el.classList.contains("hp")) return;
      var label = el.getAttribute("data-label") || el.name || "";
      var value = String(el.value || "").trim();
      if (!value || !label) return;
      if (el.type === "phone" || el.name === "phone" || el.type === "tel") value = "+91 " + value;
      if (el.type === "date") value = formatDate(value);
      rows.push([label, value]);
    });
    return rows;
  }

  function summaryText(form) {
    var rows = formSummary(form);
    var kind = form.getAttribute("data-kind") === "question" ? "Question" : "Free trial request";
    var lines = [kind + " — " + (LF.name || "The Workout Gym") + ", " + (LF.city || "Hisar")];
    rows.forEach(function (r) {
      lines.push(r[0] + ": " + r[1]);
    });
    lines.push("");
    lines.push(
      form.getAttribute("data-kind") === "question"
        ? "(Sent from the website. Nothing is booked by sending this question.)"
        : "(Sent from the website. The gym confirms every slot before it is booked.)"
    );
    return lines.join("\n");
  }

  function applyDateBounds(input) {
    var ahead = (LF.trial && LF.trial.daysAhead) || 45;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var max = new Date(today.getTime() + ahead * 86400000);
    input.min = localISO(today);
    input.max = localISO(max);
  }

  /* Give each error message an id and point its field at it, so a screen reader
     announces the message as part of the field. */
  function wireFieldDescriptions(form) {
    $$(".field", form).forEach(function (field, i) {
      var control = $("input, select, textarea", field);
      if (!control) return;
      var ids = [];
      var hint = $(".field__hint", field);
      if (hint) {
        if (!hint.id) hint.id = (control.id || "field-" + i) + "-hint";
        ids.push(hint.id);
      }
      var err = $(".field__error", field);
      if (err) {
        if (!err.id) err.id = (control.id || "field-" + i) + "-error";
        ids.push(err.id);
      }
      if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
    });
  }

  function initForms() {
    $$("[data-form]").forEach(function (form) {
      wireFieldDescriptions(form);
      $$("input[type=date]", form).forEach(applyDateBounds);
      var status = $("[data-form-status]", form);
      var submit = $("button[type=submit]", form);
      var submitText = submit ? $("[data-submit-text]", submit) : null;
      var started = Date.now();

      function setBusy(busy) {
        if (!submit) return;
        submit.disabled = busy;
        if (submitText) submitText.textContent = busy ? "Sending…" : submit.getAttribute("data-label") || "Send request";
      }

      function paint(msg, kind) {
        if (!status) return;
        status.hidden = false;
        status.className = "status is-shown " + (kind === "error" ? "status--error" : "status--ok");
        status.innerHTML = "";
        var t = doc.createElement("p");
        t.className = "status__title";
        t.textContent = kind === "error" ? "Please check the highlighted fields" : "Request ready";
        var b = doc.createElement("p");
        b.textContent = msg;
        status.appendChild(t);
        status.appendChild(b);
        return status;
      }

      function showReady(message, summary) {
        if (!status) return;
        status.hidden = false;
        status.className = "status is-shown status--ok";
        status.innerHTML = "";
        var t = doc.createElement("p");
        t.className = "status__title";
        t.textContent = "Ready to send";
        var m = doc.createElement("p");
        m.textContent = message;
        var pre = doc.createElement("pre");
        pre.textContent = summary;
        pre.setAttribute("data-copy-source", "");
        var actions = doc.createElement("div");
        actions.className = "status__actions";
        var copy = doc.createElement("button");
        copy.type = "button";
        copy.className = "btn btn--outline btn--sm";
        copy.textContent = "Copy request details";
        on(copy, "click", function () {
          var text = pre.textContent;
          function done(ok) {
            copy.textContent = ok ? "Copied" : "Select the text to copy";
            setTimeout(function () {
              copy.textContent = "Copy request details";
            }, 2600);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
              function () {
                done(true);
              },
              function () {
                done(false);
              }
            );
          } else {
            var r = doc.createRange();
            r.selectNodeContents(pre);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            done(false);
          }
        });
        actions.appendChild(copy);
        if (contact.hasPhone) {
          var call = doc.createElement("a");
          call.className = "btn btn--gold btn--sm";
          call.href = contact.callHref();
          call.textContent = "Call " + (LF.phoneDisplay || LF.phone);
          actions.appendChild(call);
        }
        status.appendChild(t);
        status.appendChild(m);
        status.appendChild(pre);
        status.appendChild(actions);
        if (status.scrollIntoView) status.scrollIntoView({ block: "nearest" });
        status.setAttribute("tabindex", "-1");
        try {
          status.focus({ preventScroll: true });
        } catch (e) {
          status.focus();
        }
      }

      function handleSubmit(e) {
        e.preventDefault();
        // simple spam traps: hidden field + too-fast submissions
        var hp = $("input.hp", form);
        if (hp && hp.value !== "") return;
        var minFill = parseInt(form.getAttribute("data-min-fill-time") || "1200", 10);
        if (Date.now() - started < minFill) {
          paint("That was quick! Please take a moment, then send your request again.", "error");
          return;
        }
        var inputs = $$("input, select, textarea", form).filter(function (el) {
          return el.type !== "hidden" && !el.classList.contains("hp");
        });
        var firstBad = null;
        inputs.forEach(function (el) {
          if (!validateField(el) && !firstBad) firstBad = el;
        });
        if (firstBad) {
          paint(
            "Some details are missing or need a fix. Nothing was sent, and no booking has been made.",
            "error"
          );
          firstBad.focus();
          return;
        }
        var message = summaryText(form);
        var endpoint = LF.form && LF.form.endpoint;
        var waHref = contact.hasWhatsapp ? contact.whatsappHref(message) : "";

        if (endpoint) {
          setBusy(true);
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              name: (form.elements.name && form.elements.name.value) || "",
              phone: (form.elements.phone && form.elements.phone.value) || "",
              message: message,
            }),
          })
            .then(function (res) {
              if (!res.ok) throw new Error("Request failed");
              form.reset();
              showReady(
                "Your request reached the gym's inbox. It is not a confirmed booking yet — the team will call or message you to lock the slot.",
                message
              );
            })
            .catch(function () {
              paint(
                "The request could not be sent right now. Please try again, or share the details with the gym directly.",
                "error"
              );
            })
            .then(function () {
              setBusy(false);
            });
          return;
        }

        if (waHref) {
          var waWin = window.open(waHref, "_blank", "noopener");
          form.reset();
          showReady(
            waWin
              ? "WhatsApp opened with your details. Press send there and the gym will confirm your slot — until they reply, nothing is booked."
              : "Your browser blocked the WhatsApp window. Open WhatsApp below and send the message to confirm your slot with the gym.",
            message
          );
          if (!waWin && status) {
            var link = doc.createElement("a");
            link.className = "btn btn--gold btn--sm";
            link.href = waHref;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = "Open WhatsApp";
            var actions = $(".status__actions", status);
            if (actions) actions.insertBefore(link, actions.firstChild);
          }
          return;
        }

        form.reset();
        showReady(
          form.getAttribute("data-kind") === "question"
            ? "Your question is ready below. This site is not connected to a booking server yet, so nothing has been sent — copy it and pass it to the gym."
            : "Your details are ready below. This site is not connected to a booking server yet, so nothing has been sent — copy the details and share them with the gym to confirm your slot.",
          message
        );
      }

      on(form, "submit", handleSubmit);
      $$("input, select, textarea", form).forEach(function (el) {
        on(el, "blur", function () {
          if (el.value !== "" || el.hasAttribute("required")) validateField(el);
        });
        on(el, "input", function () {
          var wrap = fieldWrap(el);
          if (wrap.classList.contains("is-invalid")) validateField(el);
        });
      });
      var hint = $("[data-form-opened-note]", form);
      if (hint) hint.hidden = !!contact.hasWhatsapp;
    });
  }

  /* --------------------------------------------------------------- prefill */
  var PLAN_LABELS = {
    monthly: "Monthly · 1 month",
    quarterly: "Quarterly · 3 months",
    "half-yearly": "Half-yearly · 6 months",
    annual: "Annual · 12 months",
  };
  var PROGRAMME_LABELS = {
    "weight-loss": "Weight loss",
    "muscle-building": "Muscle building",
    strength: "Strength training",
    "personal-training": "Personal training",
    "general-fitness": "General fitness",
  };

  /* One place that records what a visitor came for. Used by the query-string
     deep links (?plan=…, ?programme=…, ?goal=…) and by in-page links carrying
     data-prefill-* attributes, so a plan card or programme link lands on a form
     that already knows the answer. */
  function setFormContext(form, ctx) {
    if (!form || form.getAttribute("data-kind") === "question") return;
    if (ctx.plan && PLAN_LABELS[ctx.plan]) {
      form.setAttribute("data-plan-label", PLAN_LABELS[ctx.plan]);
      form.setAttribute("data-plan-value", ctx.plan);
    }
    if (ctx.programme && PROGRAMME_LABELS[ctx.programme]) {
      form.setAttribute("data-programme-label", PROGRAMME_LABELS[ctx.programme]);
      form.setAttribute("data-programme-value", ctx.programme);
    }
    var wanted = ctx.goal || (ctx.programme ? PROGRAMME_LABELS[ctx.programme] : null);
    if (wanted && form.elements.goal) {
      $$("option", form.elements.goal).forEach(function (o) {
        if (o.value === wanted || o.textContent.trim() === wanted) form.elements.goal.value = o.value;
      });
    }
    var bits = [];
    if (ctx.plan && PLAN_LABELS[ctx.plan]) bits.push("Plan: " + PLAN_LABELS[ctx.plan]);
    if (ctx.programme && PROGRAMME_LABELS[ctx.programme]) {
      bits.push("Programme: " + PROGRAMME_LABELS[ctx.programme]);
    }
    if (ctx.goal) bits.push("Goal: " + ctx.goal);
    if (!bits.length) return;
    var existing = $("[data-form-context]", form);
    if (existing) existing.parentNode.removeChild(existing);
    var chip = doc.createElement("p");
    chip.className = "form__note";
    chip.setAttribute("data-form-context", "");
    chip.textContent = bits.join(" · ") + " — tell the desk if you change your mind.";
    if (form.firstElementChild) form.insertBefore(chip, form.firstElementChild);
    else form.appendChild(chip);
  }

  function initPrefill() {
    function mainForm() {
      return $('[data-form]:not([data-kind="question"])') || $("[data-form]");
    }
    var params = new URLSearchParams(window.location.search);
    var ctx = {
      plan: params.get("plan"),
      programme: params.get("programme"),
      goal: params.get("goal"),
    };
    if (ctx.plan || ctx.programme || ctx.goal) {
      $$("[data-form]").forEach(function (form) {
        setFormContext(form, ctx);
      });
    }
    // In-page CTAs: click sets the context before the anchor scrolls to the form.
    doc.addEventListener("click", function (e) {
      var target = e.target;
      var link = target && target.closest
        ? target.closest("[data-prefill-plan], [data-prefill-programme], [data-prefill-goal]")
        : null;
      if (!link) return;
      setFormContext(mainForm(), {
        plan: link.getAttribute("data-prefill-plan"),
        programme: link.getAttribute("data-prefill-programme"),
        goal: link.getAttribute("data-prefill-goal"),
      });
    });
  }

  /* ---------------------------------------------------------------- coaches */
  /* Coach profiles come from LF.trainers (assets/js/business.js). While that
     list is empty the page keeps its honest "profile pending" tiles, so the
     site never invents a name, a qualification or a photograph. */
  function initCoaches() {
    var grid = $("[data-coaches]");
    if (!grid) return;
    var trainers = (LF.trainers || []).filter(function (t) {
      return t && t.name;
    });
    if (!trainers.length) return;

    grid.hidden = false;
    grid.innerHTML = "";
    trainers.forEach(function (t, i) {
      var card = doc.createElement("article");
      card.className = "coach rv is-in";
      card.style.setProperty("--d", (i * 0.06).toFixed(2) + "s");

      if (t.photo) {
        var media = doc.createElement("img");
        media.className = "coach__media";
        media.src = t.photo;
        media.alt = t.name + (t.role ? ", " + t.role : "");
        media.loading = "lazy";
        media.decoding = "async";
        card.appendChild(media);
      } else {
        var mono = doc.createElement("div");
        mono.className = "coach__media";
        mono.setAttribute("aria-hidden", "true");
        mono.textContent = t.initials || "LF";
        card.appendChild(mono);
      }

      var head = doc.createElement("h3");
      head.className = "h4";
      head.textContent = t.name;
      card.appendChild(head);

      [
        ["Role", t.role],
        ["Experience", t.experience],
        ["Qualifications", t.qualifications],
        ["About", t.bio],
      ].forEach(function (row) {
        if (!row[1]) return;
        var wrap = doc.createElement("dl");
        wrap.className = "coach__row";
        var k = doc.createElement("dt");
        k.className = "coach__k";
        k.textContent = row[0];
        var v = doc.createElement("dd");
        v.className = "coach__v";
        v.textContent = row[1];
        wrap.appendChild(k);
        wrap.appendChild(v);
        card.appendChild(wrap);
      });
      grid.appendChild(card);
    });
    var note = $("[data-coaches-note]");
    if (note) note.hidden = true;
  }

  /* ------------------------------------------------------------------ boot */
  var booted = false;

  // A single optional feature must never take the rest of the page down with
  // it. Each module is isolated; failures are reported but do not propagate.
  function warn(scope, err) {
    if (window.console && typeof window.console.warn === "function") {
      window.console.warn("[The Workout Gym] " + scope + " skipped:", err);
    }
  }
  function safe(scope, fn) {
    try {
      fn();
    } catch (err) {
      warn(scope, err);
    }
  }

  function boot() {
    // The script is loaded with `defer`, so it can run before OR after
    // DOMContentLoaded depending on the browser. Boot exactly once.
    if (booted) return;
    booted = true;

    // Reveal runs first: if anything else below fails, the page is still
    // readable. It also disarms the 1.5 s fallback in <head>.
    try {
      initReveal();
    } catch (err) {
      warn("reveal", err);
      revealAll();
    }
    window.__lfRevealReady = true;

    safe("contact links", applyContactLinks);
    safe("open state", applyOpenState);
    safe("typing-aware action bar", function () {
      // The fixed mobile action bar must not cover the field being typed in.
      on(doc, "focusin", function (e) {
        var t = e.target;
        if (t && t.closest && t.closest("form")) doc.body.classList.add("is-typing");
      });
      on(doc, "focusout", function (e) {
        var t = e.target;
        if (!t || !t.closest || !t.closest("form")) return;
        setTimeout(function () {
          var active = doc.activeElement;
          if (!active || !active.closest || !active.closest("form")) {
            doc.body.classList.remove("is-typing");
          }
        }, 0);
      });
    });
    // The mobile action bar is fixed to the bottom of the viewport, so the page
    // reserves room for it on small screens.
    safe("action bar", function () {
      if ($("[data-actionbar]")) doc.body.classList.add("has-actionbar");
    });
    safe("header", initHeader);
    safe("drawer", initDrawer);
    safe("counters", initCounters);
    safe("scroll prose", initScrollProse);
    safe("programmes", initProgrammes);
    safe("slider", initSlider);
    safe("lightbox", initLightbox);
    safe("bmi", initBmi);
    safe("forms", initForms);
    safe("coaches", initCoaches);
    safe("prefill", initPrefill);
    safe("year", function () {
      $$("[data-year]").forEach(function (el) {
        el.textContent = LF.year || new Date().getFullYear();
      });
    });
    // static ticker: clone the set once so the loop is seamless
    safe("ticker", function () {
      var tickerSet = $("[data-ticker-set]");
      if (tickerSet && !reducedMotion()) {
        var clone = tickerSet.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.removeAttribute("data-ticker-set");
        tickerSet.parentNode.appendChild(clone);
      }
    });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
