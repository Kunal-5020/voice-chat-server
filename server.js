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

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://database_creators:GjSWaV7mJnOy5hJw@cluster0.lwyhn.mongodb.net/userdata")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// JWT Secret Key
const JWT_SECRET = "your_secret_key";

// User schema and model
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number},
    highestEducation: { type: String },
    checklist: {
      type: String ,default:''
    },
    allHistorySummary: { type: String ,default:''},
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

// Routes

// Signup Route
app.post("/signup", async (req, res) => {
  const { name, email, password, age, highestEducation } = req.body;
  try {
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
    console.error("Error during signup:", error);
    res.status(500).send({ error: "Error creating user" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
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
    res.status(200).send({ message: "Login successful", token ,user: user});
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({ error: "Error logging in" });
  }
});

// Update User Settings
app.put("/settings", async (req, res) => {
  const { id, name, email } = req.body;
  try {
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
    console.error("Error updating user:", error);
    res.status(500).send({ error: "Error updating user" });
  }
});

// Update Checklist
app.put("/checklist", async (req, res) => {
  const { id, checklist} = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $push: { "checklist.completed": {checklist} },
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send(updatedUser);
  } catch (error) {
    console.error("Error updating checklist:", error);
    res.status(500).send({ error: "Error updating checklist" });
  }
});

app.put("/updatehistory", async (req, res) => {
  const { id,allHistorySummary} = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $push: {  "allHistorySummary":{allHistorySummary}},
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send(updatedUser);
  } catch (error) {
    console.error("Error updating checklist:", error);
    res.status(500).send({ error: "Error updating checklist" });
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
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).send({ error: "Error fetching profile" });
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
