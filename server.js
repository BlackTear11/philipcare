const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

function bookingsFile() {
  const configured = process.env.DATA_DIR;
  if (configured) return path.join(configured, "bookings.json");
  if (fs.existsSync("/var/data")) return path.join("/var/data", "bookings.json");
  return path.join(__dirname, "bookings.json");
}

const DATA_FILE = bookingsFile();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readBookings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

app.get("/api/bookings", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(readBookings());
});

app.post("/api/bookings", (req, res) => {
  const { date, period, name, time } = req.body || {};

  if (!date || !period || !name || !time) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (period !== "am" && period !== "pm") {
    return res.status(400).json({ error: "Period must be am or pm." });
  }

  const cleanName = String(name).trim().slice(0, 40);
  if (!cleanName) {
    return res.status(400).json({ error: "Name is required." });
  }

  const bookings = readBookings();
  const sameSlot = bookings.filter((b) => b.date === date && b.period === period);

  if (sameSlot.length >= 3) {
    return res.status(409).json({ error: "That slot is full (3 visits max)." });
  }

  const booking = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    period,
    name: cleanName,
    time: String(time).trim(),
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  try {
    writeBookings(bookings);
  } catch (err) {
    console.error("Could not save bookings to", DATA_FILE, err);
    return res.status(500).json({ error: "Could not save the visit. Please try again." });
  }
  res.status(201).json(booking);
});

app.listen(PORT, () => {
  console.log(`Philip Visit Tracker running at http://localhost:${PORT}`);
  console.log(`Bookings file: ${DATA_FILE}`);
});
