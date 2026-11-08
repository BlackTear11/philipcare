const app = document.getElementById("app");

const state = {
  view: "home",
  bookings: [],
  selectedDate: null,
  selectedPeriod: null,
  error: "",
};

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLongDate(iso) {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDayHead(iso) {
  const date = parseISODate(iso);
  return {
    dow: date.toLocaleDateString(undefined, { weekday: "long" }),
    dom: date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    }),
  };
}

function nextDays(count) {
  const days = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(toISODate(d));
  }
  return days;
}

function bookingsFor(date, period) {
  return state.bookings.filter((b) => b.date === date && b.period === period);
}

function allTimes(period) {
  if (period === "am") {
    return ["8:00 am", "9:00 am", "10:00 am", "11:00 am"];
  }
  return ["12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm", "4:00 pm", "5:00 pm", "6:00 pm"];
}

function timeToMinutes(label) {
  const match = String(label).trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3].toLowerCase();
  if (suffix === "pm" && hours !== 12) hours += 12;
  if (suffix === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function slotStillOpen(date, label) {
  if (date !== todayISO()) return true;
  const start = timeToMinutes(label);
  if (start == null) return true;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes < start + 60;
}

function availableTimes(date, period) {
  return allTimes(period).filter((label) => slotStillOpen(date, label));
}

async function loadBookings() {
  const res = await fetch("/api/bookings", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load bookings.");
  state.bookings = await res.json();
}

async function createBooking({ date, period, name, time }) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ date, period, name, time }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not save booking.");
  return data;
}

function go(view, extras = {}) {
  Object.assign(state, extras, {
    view,
    error: extras.error !== undefined ? extras.error : "",
  });
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHome() {
  return `
    <section class="screen hero">
      <p class="eyebrow">Family visits</p>
      <h1>Philip Davis Visit Tracker</h1>
      <p class="lead">Space out visits so Philip gets calm, steady company.</p>
      <div class="stack">
        <button class="btn btn-primary" data-action="book">
          <strong>Book a Time</strong>
          <span>See the next 3 weeks and reserve a slot</span>
        </button>
        <button class="btn" data-action="howto">
          <strong>How to Visit</strong>
          <span>Directions, room, WiFi, and door code</span>
        </button>
      </div>
    </section>
  `;
}

function renderHowTo() {
  return `
    <section class="screen panel howto">
      <div class="topbar">
        <h2>How to visit Philip</h2>
        <button class="linkish" data-action="home">Back</button>
      </div>
      <p><strong>Care Home:</strong> Hazeldene House</p>
      <p><strong>Room 35</strong> on the ground floor (the floor you enter first).</p>
      <p>Upon entering the lobby, please sign in using the book and then come in.</p>
      <p>His room is to the right, at the end of the corridor.</p>
      <div class="note">
        <p><strong>WiFi password:</strong> grahamcare</p>
        <p><strong>To leave the building, the code is:</strong> 0708</p>
        <p>Press the yellow button in his room to call for a nurse.</p>
      </div>
      <div class="footer-actions">
        <button class="btn btn-ghost btn-block" data-action="home">Back</button>
      </div>
    </section>
  `;
}

function renderBlocks(date, period) {
  const items = bookingsFor(date, period);
  const blocks = [];
  for (let i = 0; i < 3; i += 1) {
    const booking = items[i];
    if (booking) {
      blocks.push(
        `<div class="visit-block">${escapeHtml(booking.name)} · ${escapeHtml(booking.time)}</div>`
      );
    } else {
      blocks.push(`<div class="visit-block empty">Open</div>`);
    }
  }
  return blocks.join("");
}

function renderCalendar() {
  const days = nextDays(21);
  const today = todayISO();

  const cards = days
    .map((date) => {
      const head = formatDayHead(date);
      const isToday = date === today ? " is-today" : "";
      return `
        <button type="button" class="day-card${isToday}" data-action="pick-day" data-date="${date}">
          <div class="day-head">
            <span class="dow">${head.dow}</span>
            <span class="dom">${head.dom}</span>
          </div>
          <div class="day-body">
            <div class="slot am">
              <div class="slot-label">AM</div>
              <div class="blocks">${renderBlocks(date, "am")}</div>
            </div>
            <div class="slot pm">
              <div class="slot-label">PM</div>
              <div class="blocks">${renderBlocks(date, "pm")}</div>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <section class="screen">
      <div class="topbar">
        <h2>Book a Time</h2>
        <button class="linkish" data-action="home">Back</button>
      </div>
      <p class="hint">Swipe sideways to find a day, then tap anywhere on that day to book.</p>
      <div class="calendar-scroller" id="calendar-scroller">${cards}</div>
    </section>
  `;
}

function periodSummary(date, period) {
  const count = bookingsFor(date, period).length;
  const times = availableTimes(date, period);
  if (count >= 3) return "Full (3 visits)";
  if (times.length === 0) return period === "am" ? "Morning has passed" : "Afternoon has passed";
  const start = times[0].replace(":00", "");
  const end = times[times.length - 1].replace(":00", "");
  return `${start} – ${end} · ${3 - count} open`;
}

function renderDayChoice() {
  const date = state.selectedDate;
  const amClosed = availableTimes(date, "am").length === 0 || bookingsFor(date, "am").length >= 3;
  const pmClosed = availableTimes(date, "pm").length === 0 || bookingsFor(date, "pm").length >= 3;

  return `
    <section class="screen panel">
      <div class="topbar">
        <h2>${escapeHtml(formatLongDate(date))}</h2>
        <button class="linkish" data-action="book">Back</button>
      </div>
      <div class="choice-list">
        <button class="choice" data-action="pick-period" data-period="am" ${amClosed ? "disabled" : ""}>
          <strong>Morning Visit</strong>
          <span>${periodSummary(date, "am")}</span>
        </button>
        <button class="choice" data-action="pick-period" data-period="pm" ${pmClosed ? "disabled" : ""}>
          <strong>Afternoon Visit</strong>
          <span>${periodSummary(date, "pm")}</span>
        </button>
      </div>
      <div class="footer-actions">
        <button class="btn btn-ghost btn-block" data-action="book">Back</button>
      </div>
    </section>
  `;
}

function renderForm() {
  const periodLabel = state.selectedPeriod === "am" ? "Morning" : "Afternoon";
  const options = availableTimes(state.selectedDate, state.selectedPeriod)
    .map((t) => `<option value="${t}">${t}</option>`)
    .join("");

  return `
    <section class="screen panel">
      <div class="topbar">
        <h2>${periodLabel} visit</h2>
        <button class="linkish" data-action="pick-day" data-date="${state.selectedDate}">Back</button>
      </div>
      <p class="hint">${escapeHtml(formatLongDate(state.selectedDate))}</p>
      <form class="form" id="booking-form">
        <label>
          Name
          <input name="name" type="text" autocomplete="name" maxlength="40" required placeholder="Your name" />
        </label>
        <label>
          Coming at
          <select name="time" required>
            ${options}
          </select>
        </label>
        ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ""}
        <button class="btn btn-primary btn-block" type="submit">Submit</button>
        <button class="btn btn-ghost btn-block" type="button" data-action="pick-day" data-date="${state.selectedDate}">Back</button>
      </form>
    </section>
  `;
}

function render() {
  if (state.view === "home") app.innerHTML = renderHome();
  else if (state.view === "howto") app.innerHTML = renderHowTo();
  else if (state.view === "calendar") app.innerHTML = renderCalendar();
  else if (state.view === "day") app.innerHTML = renderDayChoice();
  else if (state.view === "form") app.innerHTML = renderForm();

  wireInteractions();
}

function wireInteractions() {
  app.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const action = el.getAttribute("data-action");
      if (action === "home") {
        go("home");
      } else if (action === "howto") {
        go("howto");
      } else if (action === "book") {
        try {
          await loadBookings();
          go("calendar");
          scrollToDate(state.selectedDate);
        } catch (err) {
          go("home", { error: err.message });
          alert(err.message);
        }
      } else if (action === "pick-day") {
        state.selectedDate = el.getAttribute("data-date");
        state.selectedPeriod = null;
        go("day");
      } else if (action === "pick-period") {
        state.selectedPeriod = el.getAttribute("data-period");
        go("form", { error: "" });
      }
    });
  });

  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const time = String(data.get("time") || "").trim();
      const bookedDate = state.selectedDate;
      try {
        const booking = await createBooking({
          date: bookedDate,
          period: state.selectedPeriod,
          name,
          time,
        });
        try {
          await loadBookings();
        } catch {
          // Keep the new booking visible even if refresh fails.
        }
        if (!state.bookings.some((b) => b.id === booking.id)) {
          state.bookings = [...state.bookings, booking];
        }
        go("calendar");
        scrollToDate(bookedDate);
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  }
}

function scrollToDate(date) {
  if (!date) return;
  const scroller = document.getElementById("calendar-scroller");
  const card = scroller && scroller.querySelector(`[data-date="${date}"]`);
  if (card) card.scrollIntoView({ inline: "start", block: "nearest", behavior: "smooth" });
}

async function boot() {
  render();
  try {
    await loadBookings();
  } catch {
    // Home still works; calendar will retry.
  }
}

boot();
