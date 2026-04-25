const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const { readDb, writeDb, nowIso } = require("./store");
const { signUser, authRequired } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the existing static site.
app.use("/", express.static(path.join(__dirname, "..", "website")));

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidTimeHHMM(time) {
  return /^\d{2}:\d{2}$/.test(time);
}

function isValidDateYYYYMMDD(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function withinClinicHours(time) {
  // 09:00 - 17:00, 30-min increments
  if (!isValidTimeHHMM(time)) return false;
  const [h, m] = time.split(":").map(Number);
  const minutes = h * 60 + m;
  if (minutes < 9 * 60 || minutes > 17 * 60) return false;
  return m === 0 || m === 30;
}

function listSlotsForDate(date) {
  const slots = [];
  for (let minutes = 9 * 60; minutes <= 17 * 60; minutes += 30) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function isSlotBooked(db, date, time) {
  return db.appointments.some((a) => a.appointment_date === date && a.appointment_time === time && a.status === "booked");
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const db = readDb();
  const exists = db.users.some((u) => u.email === email);
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = { id: db.nextUserId++, name, email, passwordHash, createdAt: nowIso() };
  db.users.push(user);
  writeDb(db);

  const token = signUser(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const db = readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signUser(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/slots", (req, res) => {
  const date = String(req.query?.date || "");
  if (!isValidDateYYYYMMDD(date)) return res.status(400).json({ error: "Invalid date" });

  const db = readDb();
  const allSlots = listSlotsForDate(date);
  const available = allSlots.filter((t) => !isSlotBooked(db, date, t));
  res.json({ date, slots: available });
});

app.post("/api/appointments", authRequired, (req, res) => {
  const appointment_date = String(req.body?.appointment_date || "");
  const appointment_time = String(req.body?.appointment_time || "");

  if (!isValidDateYYYYMMDD(appointment_date)) return res.status(400).json({ error: "Invalid date" });
  if (!withinClinicHours(appointment_time)) return res.status(400).json({ error: "Invalid time slot" });

  const db = readDb();
  if (isSlotBooked(db, appointment_date, appointment_time)) {
    return res.status(409).json({ error: "This time slot is already booked" });
  }

  const appt = {
    id: db.nextAppointmentId++,
    userId: req.user.id,
    patient_name: req.user.name,
    appointment_date,
    appointment_time,
    status: "booked",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  db.appointments.push(appt);
  writeDb(db);
  res.json({ appointment: appt });
});

app.get("/api/appointments", authRequired, (req, res) => {
  const db = readDb();
  const appts = db.appointments
    .filter((a) => a.userId === req.user.id)
    .sort((a, b) => {
      const aKey = `${a.appointment_date} ${a.appointment_time}`;
      const bKey = `${b.appointment_date} ${b.appointment_time}`;
      return aKey.localeCompare(bKey);
    });
  res.json({ appointments: appts });
});

app.delete("/api/appointments/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const db = readDb();
  const appt = db.appointments.find((a) => a.id === id);
  if (!appt) return res.status(404).json({ error: "Not found" });
  if (appt.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (appt.status !== "booked") return res.status(409).json({ error: "Appointment already cancelled" });

  appt.status = "cancelled";
  appt.updatedAt = nowIso();
  writeDb(db);
  res.json({ appointment: appt });
});

app.patch("/api/appointments/:id/reschedule", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const appointment_date = String(req.body?.appointment_date || "");
  const appointment_time = String(req.body?.appointment_time || "");

  if (!isValidDateYYYYMMDD(appointment_date)) return res.status(400).json({ error: "Invalid date" });
  if (!withinClinicHours(appointment_time)) return res.status(400).json({ error: "Invalid time slot" });

  const db = readDb();
  const appt = db.appointments.find((a) => a.id === id);
  if (!appt) return res.status(404).json({ error: "Not found" });
  if (appt.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  if (appt.status !== "booked") return res.status(409).json({ error: "Cannot reschedule a cancelled appointment" });

  if (isSlotBooked(db, appointment_date, appointment_time)) {
    return res.status(409).json({ error: "This time slot is already booked" });
  }

  appt.appointment_date = appointment_date;
  appt.appointment_time = appointment_time;
  appt.updatedAt = nowIso();
  writeDb(db);
  res.json({ appointment: appt });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

