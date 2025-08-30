import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/dbConfig.js";
import chatRoutes from "./routes/chatRoutes.js";
import { clerkMiddleware } from '@clerk/express';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());


// Routes
app.use("/api/chat", chatRoutes);

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  (`Server running on port ${PORT}`);
});
