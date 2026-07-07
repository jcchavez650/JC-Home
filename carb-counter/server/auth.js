import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL = "30d";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set — using an insecure default. Set JWT_SECRET in production.");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export async function signup(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [email, passwordHash]
  );
  const user = result.rows[0];
  res.status(201).json({ token: sign(user), user: { id: user.id, email: user.email } });
}

export async function login(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const result = await query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  res.json({ token: sign(user), user: { id: user.id, email: user.email } });
}

export function me(req, res) {
  res.json({ user: { id: req.user.id, email: req.user.email } });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}
