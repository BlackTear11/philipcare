const app = document.getElementById("app");

const state = {
  view: "home",
  bookings: [],
  selectedDate: null,
  selectedPeriod: null,
  error: "",
  toast: "",
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

function timesFor(period) {
  if (period === "am") {
    return ["8:00", "9:00", "10:00", "11:00"];
  }
  return ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
}

async function loadBookings() {
  const res = await fetch("/api/bookings");
  if (!res.ok) throw new Error("Could not load bookings.");
  state.bookings = await res.json();
}

async function createBooking({ date, period, name, time }) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, period, name, time }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not save booking.");
  return data;
}

function go(view, extras = {}) {
  Object.assign(state, extras, { view, error: state.error && extras.clearError === false ? state.error : "" });
  if (extras.error !== undefined) state.error = extras.error;
  if (extras.toast !== undefined) state.toast = extras.toast;
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
        <article class="day-card${isToday}" data-action="pick-day" data-date="${date}" role="button" tabindex="0">
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
        </article>
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
      ${state.toast ? `<p class="toast">${escapeHtml(state.toast)}</p>` : ""}
      <div class="calendar-scroller" id="calendar-scroller">${cards}</div>
    </section>
  `;
}

function renderDayChoice() {
  const date = state.selectedDate;
  const amCount = bookingsFor(date, "am").length;
  const pmCount = bookingsFor(date, "pm").length;

  return `
    <section class="screen panel">
      <div class="topbar">
        <h2>${escapeHtml(formatLongDate(date))}</h2>
        <button class="linkish" data-action="book">Back</button>
      </div>
      <div class="choice-list">
        <button class="choice" data-action="pick-period" data-period="am" ${amCount >= 3 ? "disabled" : ""}>
          <strong>Morning Visit</strong>
          <span>${amCount >= 3 ? "Full (3 visits)" : "8:00 – 12:00 · " + (3 - amCount) + " open"}</span>
        </button>
        <button class="choice" data-action="pick-period" data-period="pm" ${pmCount >= 3 ? "disabled" : ""}>
          <strong>Afternoon Visit</strong>
          <span>${pmCount >= 3 ? "Full (3 visits)" : "12:00 – 18:00 · " + (3 - pmCount) + " open"}</span>
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
  const options = timesFor(state.selectedPeriod)
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

function enableDragScroll(scroller) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;

  scroller.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    if (e.target.closest("button, a, input, select")) return;
    isDown = true;
    moved = false;
    startX = e.clientX;
    scrollLeft = scroller.scrollLeft;
  });

  scroller.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) <= 8) return;
    moved = true;
    scroller.classList.add("dragging");
    scroller.scrollLeft = scrollLeft - dx;
  });

  const end = () => {
    isDown = false;
    scroller.classList.remove("dragging");
  };

  scroller.addEventListener("pointerup", end);
  scroller.addEventListener("pointercancel", end);
  scroller.addEventListener("pointerleave", end);

  scroller.addEventListener(
    "click",
    (e) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    },
    true
  );
}

function wireInteractions() {
  app.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const action = el.getAttribute("data-action");
      if (action === "home") {
        state.toast = "";
        go("home");
      } else if (action === "howto") {
        go("howto");
      } else if (action === "book") {
        state.error = "";
        try {
          await loadBookings();
          go("calendar");
        } catch (err) {
          state.error = err.message;
          go("home");
          alert(err.message);
        }
      } else if (action === "pick-day") {
        state.selectedDate = el.getAttribute("data-date");
        state.selectedPeriod = null;
        go("day");
      } else if (action === "pick-period") {
        state.selectedPeriod = el.getAttribute("data-period");
        state.error = "";
        go("form");
      }
    });
  });

  const scroller = document.getElementById("calendar-scroller");
  if (scroller) enableDragScroll(scroller);

  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const time = String(data.get("time") || "").trim();
      try {
        await createBooking({
          date: state.selectedDate,
          period: state.selectedPeriod,
          name,
          time,
        });
        await loadBookings();
        state.toast = `Booked: ${name} · ${time}`;
        state.error = "";
        go("calendar");
      } catch (err) {
        state.error = err.message;
        render();
      }
    });
  }
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
