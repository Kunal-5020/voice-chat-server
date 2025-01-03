require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Initialize app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Load environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if the database connection fails
  });

// User schema and model
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number },
    highestEducation: { type: String },
    checklist: { type: String, default: "" },
    allHistorySummary: { type: String, default: "" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).send({ error: err.message });
});

// Routes

// Signup Route
app.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, age, highestEducation } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      age,
      highestEducation,
    });

    await newUser.save();
    res.status(201).send({ message: "User created successfully" });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

// Login Route
app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).send({ message: "Login successful", token, user });
  } catch (error) {
    next(error);
  }
});

// Update User Settings
app.put("/settings", async (req, res, next) => {
  try {
    const { id, name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ error: "Access denied" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Protected Route Example
app.get("/profile", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
