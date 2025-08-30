// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true }, // Clerk's unique user ID
  email: { type: String, required: true },
  name: { type: String },
  imageUrl: { type: String }, // Clerk provides profile image
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    language: { type: String, default: "en" },
  },
});

export default mongoose.model("User", userSchema);
