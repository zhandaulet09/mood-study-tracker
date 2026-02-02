require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const app = express();
app.use(cors());    
app.use(express.json());
app.use(express.static("public"));


// ===== MongoDB connection =====
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ===== Schemas & Models =====

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "user" },
});

// Embedded subject schema
const subjectSchema = new mongoose.Schema(
  {
    name: String,
    minutes: Number,
  },
  { _id: false }
);

// Entry schema
const entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  studyMinutes: { type: Number, default: 0 },
  sleepHours: { type: Number, default: 0 },
  mood: { type: Number, min: 1, max: 5, required: true },
  subjects: [subjectSchema],
  tags: [String],
});

// index (optimization requirement)
entrySchema.index({ userId: 1, date: -1 });

// Models
const User = mongoose.model("User", userSchema);
const Entry = mongoose.model("Entry", entrySchema);

// ===== Create User (POST /api/users) =====
app.post("/api/users", async (req, res) => {
  try {
    const { username, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(400).json({ error: "User creation failed" });
  }
});


// ===== Get all Users (GET /api/users) =====
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ===== Create Entry (POST /api/entries) =====
app.post("/api/entries", authMiddleware, async (req, res) => {
  try {
    const {
      date,
      studyMinutes,
      sleepHours,
      mood,
      subjects,
      tags,
    } = req.body;

    const entry = await Entry.create({
      userId: req.userId, 
      date,
      studyMinutes,
      sleepHours,
      mood,
      subjects,
      tags,
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error("Create entry error:", err);
    res.status(400).json({ error: "Entry creation failed" });
  }
});


// ===== Get all Entries (GET /api/entries) =====
app.get("/api/entries", authMiddleware, async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.userId })
  .populate("userId", "username");
    res.json(entries);
  } catch (err) {
    console.error("Get entries error:", err);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// ===== Update Entry (PUT /api/entries/:id) =====
app.put("/api/entries/:id", async (req, res) => {
  try {
    const {
      date,
      studyMinutes,
      sleepHours,
      mood,
      subjects,
      tags,
    } = req.body;

    const updated = await Entry.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          date,
          studyMinutes,
          sleepHours,
          mood,
          subjects,
          tags,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update entry error:", err);
    res.status(400).json({ error: "Entry update failed" });
  }
});

// ===== Delete Entry (DELETE /api/entries/:id) =====
app.delete("/api/entries/:id", async (req, res) => {
  try {
    const deleted = await Entry.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Entry not found" });
    }
    res.json({ message: "Entry deleted" });
  } catch (err) {
    console.error("Delete entry error:", err);
    res.status(400).json({ error: "Entry delete failed" });
  }
});

// ===== Add Tag to Entry =====
app.patch("/api/entries/:id/add-tag", async (req, res) => {
  try {
    const { tag } = req.body;

    const updated = await Entry.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { tags: tag } }, 
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Add tag error:", err);
    res.status(400).json({ error: "Add tag failed" });
  }
});

// ===== Increase subject minutes =====
app.patch("/api/entries/:id/inc-subject", async (req, res) => {
  try {
    const { subjectName, minutes } = req.body;

    const updated = await Entry.findOneAndUpdate(
      { _id: req.params.id, "subjects.name": subjectName },
      { $inc: { "subjects.$.minutes": minutes } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Entry or subject not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Inc subject error:", err);
    res.status(400).json({ error: "Increase subject minutes failed" });
  }
});


// ===== Remove Tag from Entry =====
app.patch("/api/entries/:id/remove-tag", async (req, res) => {
  try {
    const { tag } = req.body;

    const updated = await Entry.findByIdAndUpdate(
      req.params.id,
      { $pull: { tags: tag } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Remove tag error:", err);
    res.status(400).json({ error: "Remove tag failed" });
  }
});


// ===== Test endpoint =====
app.get("/api/ping", (req, res) => {
  res.json({ message: "Models loaded and MongoDB working!" });
});

// ===== Stats Summary (GET /api/stats/summary?userId=...) =====
app.get("/api/stats/summary", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId query param is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // General statistics by day
    const summary = await Entry.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: "$userId",
          avgMood: { $avg: "$mood" },
          avgSleep: { $avg: "$sleepHours" },
          totalStudy: { $sum: "$studyMinutes" }
        }
      }
    ]);

    // Subject statistics
    const bySubjects = await Entry.aggregate([
      { $match: { userId: userObjectId } },
      { $unwind: "$subjects" },
      {
        $group: {
          _id: "$subjects.name",
          totalMinutes: { $sum: "$subjects.minutes" }
        }
      },
      { $sort: { totalMinutes: -1 } }
    ]);

    res.json({
      summary: summary[0] || null,
      subjects: bySubjects
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Stats calculation failed" });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;

// ===== Login (POST /api/login) =====
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.json({
  token,
  userId: user._id,
  username: user.username,
});

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ===== Auth Middleware =====
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    );
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
