// db.js
import mongoose from "mongoose"
import {config} from "dotenv"

config()
mongoose.set('strictQuery', true);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    (' MongoDB connected');
  } catch (error) {
    console.error(' MongoDB connection error:', error);
  }

  mongoose.connection.on('connected', () => {
    (' Mongoose connection open');
  });

  mongoose.connection.on('error', (err) => {
    console.error(' Mongoose connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(' Mongoose disconnected');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    (' Mongoose connection closed on app termination');
    process.exit(0);
  });
};

export default connectDB
