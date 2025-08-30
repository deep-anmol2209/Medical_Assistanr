import { verifyToken } from "@clerk/express";
import {config} from "dotenv";


config(); // Load environment variables
export const clerkSSEAuth = async (req, res, next) => {
    ("Clerk SSE auth middleware called");
    
  try {
    const token = req.query.token;
    ("Extracted token:", token);
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
  ("Token received:", token);
  
  (process.env.CLERK_JWT_KEY); // Log the JWT key for debugging

    const verifiedToken = await verifyToken(token, {
        jwtKey: process.env.CLERK_JWT_KEY, // Ensure this is set in your .env file
    });

    ("Token verified successfully:", verifiedToken);
    
    
    
    // Clerk puts userId in sub
    req.user = { id: verifiedToken.sub };

    next();
  } catch (err) {
    console.error("Clerk SSE auth failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};