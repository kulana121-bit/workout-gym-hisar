/* =============================================================================
   The Workout Gym · Hisar — business data (single source of truth)
   -----------------------------------------------------------------------------
   Everything the website says about the gym lives here or in the page HTML.
   Edit this file (and the clearly marked "EDIT" comments in the HTML) to update
   the site. Nothing in this file is invented: each value came either from the
   gym's existing website project or from the gym's public Google Maps listing.
   See README.md → "What the owner must fill in".

   The only values that are intentionally EMPTY are `phone` and `whatsapp`:
   they must be confirmed by the gym before the number goes live. While they are
   empty the site hides every call/WhatsApp button instead of showing a dead
   link, and trial requests are handed to the member to share (never shown as a
   confirmed booking).
   ========================================================================== */
window.LF = {
  /* ---------------------------------------------------------------- identity */
  name: "The Workout Gym",
  nameHi: "द वर्कआउट जिम",
  city: "Hisar",
  region: "Haryana",
  establishedNote: "Sector 15, Hisar",

  /* ----------------------------------------------------------------- address */
  address: {
    line1: "DSS-54, Kaimri–Mangali Rd, near Royal Bar",
    line2: "Sector 15, Hisar, Haryana 125001",
    locality: "Sector 15",
    region: "Haryana",
    postalCode: "125001",
    country: "IN",
    full: "DSS-54, Kaimri–Mangali Rd, near Royal Bar, Sector 15, Hisar, Haryana 125001",
  },
  geo: { lat: 29.134891, lng: 75.720263 },

  /* -------------------------------------------------- contact (OWNER: fill) */
  // Filled from the gym's live Google Maps listing (verified 19 Nov 2026):
  // +91 90531 39388 — the number was left empty in the export on purpose
  // ("confirm before going live"); the listing confirms it, so buttons show.
  phone: "+919053139388",
  phoneDisplay: "+91 90531 39388",
  whatsapp: "919053139388",
  email: "",

  /* ------------------------------------------------------------------- links */
  links: {
    // Google Maps listing (search by name + address).
    maps:
      "https://www.google.com/maps/search/?api=1&query=The%20Workout%20Gym%2C%20Kaimri-Mangali%20Rd%2C%20Sector%2015%2C%20Hisar%2C%20Haryana%20125001",
    // Turn-by-turn directions to the pin.
    directions:
      "https://www.google.com/maps/dir/?api=1&destination=29.134891,75.720263",
    // Reviews are read on Google; the site never hosts reviews itself.
    reviews:
      "https://www.google.com/maps/search/?api=1&query=The%20Workout%20Gym%2C%20Kaimri-Mangali%20Rd%2C%20Sector%2015%2C%20Hisar%2C%20Haryana%20125001",
  },

  /* ------------------------------------------------------------------ hours */
  // Times in 24h for logic + display strings for humans. Sunday closed.
  hours: [
    { day: "Monday", open: "05:00", close: "22:00", display: "5:00 AM – 10:00 PM" },
    { day: "Tuesday", open: "05:00", close: "22:00", display: "5:00 AM – 10:00 PM" },
    { day: "Wednesday", open: "05:00", close: "22:00", display: "5:00 AM – 10:00 PM" },
    { day: "Thursday", open: "05:00", close: "22:00", display: "5:00 AM – 10:00 PM" },
    { day: "Friday", open: "05:00", close: "22:00", display: "5:00 AM – 10:00 PM" },
    { day: "Saturday", open: "05:00", close: "22:00", display: "5:00 AM – 10:00 PM" },
    { day: "Sunday", closed: true, display: "Closed" },
  ],

  /* ----------------------------------------------------------------- rating */
  // Public Google rating as displayed on the gym's listing (checked Nov 2026).
  // Never hard-code testimonials: the quotes are in the page HTML, attributed
  // to their source, and can be swapped for owner-approved ones.
  rating: { value: 4.9, count: 299, source: "Google", asOf: "Nov 2026" },

  /* ------------------------------------------------------- trial booking */
  trial: {
    daysAhead: 45, // how far ahead a date can be requested
    slots: [
      "Morning · 5:00 – 10:00 AM",
      "Midday · 10:00 AM – 4:00 PM",
      "Evening · 4:00 – 10:00 PM",
    ],
    goals: [
      "Weight loss",
      "Muscle building",
      "Strength training",
      "Personal training",
      "General fitness",
      "Not sure yet",
    ],
  },

  /* --------------------------------------------------------------- trainers */
  // Coach profiles are published ONLY with the gym's approval, so this list is
  // empty by default and the coaching page shows an honest empty-state panel.
  // No name, photograph, experience or certification is ever invented.
  // To publish a coach, add an entry like:
  //   {
  //     initials: "RS",
  //     name: "Coach name",
  //     role: "Strength & conditioning",
  //     experience: "8 years",
  //     qualifications: "Certified personal trainer, first aid",
  //     bio: "One or two sentences in the coach's own words. Only facts the
  //           gym can stand behind.",
  //     photo: "assets/img/coach-name.jpg"   // omit to show the monogram
  //   }
  trainers: [],

  /* ---------------------------------------------------------------- form */
  form: {
    // Optional: paste a form endpoint (Formspree, Google Apps Script, …) to
    // POST requests. Empty = no server, so the site hands the request to the
    // member (WhatsApp or copy) and never claims a booking is confirmed.
    endpoint: "",
  },

  /* --------------------------------------------------------------- misc */
  year: new Date().getFullYear(),
};
