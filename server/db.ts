import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to add your MongoDB connection string?",
  );
}

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});
