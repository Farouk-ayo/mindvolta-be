const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { PrismaClient } = require("@prisma/client");
const http = require("http");
const socketIo = require("socket.io");

console.log("Starting MindVolta API Server...");

require("dotenv").config();

// Initialize Prisma
const prisma = new PrismaClient();

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chat");
const moodRoutes = require("./routes/mood");
const musicRoutes = require("./routes/music");
const insightsRoutes = require("./routes/insights");
const communityRoutes = require("./routes/community");
const surveyRoutes = require("./routes/survey");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));
app.use(limiter);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/survey", surveyRoutes);

// Socket.io for real-time chat
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_chat", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      // Save message to database
      const message = await prisma.message.create({
        data: {
          content: data.message,
          senderId: data.userId,
          receiverId: data.receiverId || "ai",
          isAI: false,
        },
      });

      // Emit to user
      io.to(`user_${data.userId}`).emit("receive_message", {
        id: message.id,
        text: message.content,
        isUser: true,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Generate AI response (simplified - integrate with OpenAI)
      const aiResponse = await generateAIResponse(data.message);

      const aiMessage = await prisma.message.create({
        data: {
          content: aiResponse,
          senderId: "ai",
          receiverId: data.userId,
          isAI: true,
        },
      });

      // Emit AI response
      setTimeout(() => {
        io.to(`user_${data.userId}`).emit("receive_message", {
          id: aiMessage.id,
          text: aiResponse,
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
        });
      }, 1000);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// AI Response Generator (basic implementation)
async function generateAIResponse(message) {
  // This is a simplified version. In production, integrate with OpenAI API
  const responses = {
    greeting:
      "Hello! I'm here to help with your mental health journey. How are you feeling today?",
    sad: "I understand you're going through a difficult time. It's okay to feel sad, and I'm here to support you. Would you like to talk about what's bothering you?",
    anxious:
      "Anxiety can be overwhelming, but you're not alone. Let's try some breathing exercises together. Take a deep breath in for 4 counts, hold for 4, and out for 4.",
    happy:
      "I'm so glad to hear you're feeling good today! What's bringing you joy?",
    default:
      "Thank you for sharing that with me. Can you tell me more about how you're feeling? I'm here to listen and support you.",
  };

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return responses.greeting;
  } else if (
    lowerMessage.includes("sad") ||
    lowerMessage.includes("depressed")
  ) {
    return responses.sad;
  } else if (
    lowerMessage.includes("anxious") ||
    lowerMessage.includes("anxiety")
  ) {
    return responses.anxious;
  } else if (lowerMessage.includes("happy") || lowerMessage.includes("good")) {
    return responses.happy;
  } else {
    return responses.default;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("/{*any}", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 MindVolta API Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});
// Add this code RIGHT BEFORE your route definitions in app.js
// This will help identify which route is causing the issue
