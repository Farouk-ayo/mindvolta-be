const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get chat history
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: req.user.id }, { receiverId: req.user.id }],
      },
      orderBy: { createdAt: "asc" },
      take: 100, // Limit to last 100 messages
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      text: msg.content,
      isUser: msg.senderId === req.user.id,
      timestamp: msg.createdAt.toLocaleTimeString(),
      showButtons: msg.content.includes("Dr. Saheed"), // Show contact buttons for therapist recommendations
    }));

    res.json({
      success: true,
      data: { messages: formattedMessages },
    });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat history",
    });
  }
});

// Send message (for manual API calls)
router.post("/message", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        content: message,
        senderId: req.user.id,
        receiverId: "ai",
        isAI: false,
      },
    });

    // Generate AI response (basic implementation)
    const aiResponseText = generateBasicAIResponse(message);

    // Save AI response
    const aiMessage = await prisma.message.create({
      data: {
        content: aiResponseText,
        senderId: "ai",
        receiverId: req.user.id,
        isAI: true,
      },
    });

    res.json({
      success: true,
      data: {
        userMessage: {
          id: userMessage.id,
          text: userMessage.content,
          isUser: true,
          timestamp: userMessage.createdAt.toLocaleTimeString(),
        },
        aiMessage: {
          id: aiMessage.id,
          text: aiMessage.content,
          isUser: false,
          timestamp: aiMessage.createdAt.toLocaleTimeString(),
          showButtons: aiMessage.content.includes("Dr. Saheed"),
        },
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

function generateBasicAIResponse(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("therapist") || lowerMessage.includes("doctor")) {
    return "I understand you'd like to speak with a professional. I recommend Dr. Saheed, a qualified psychiatrist at Psychiatric Hospital, Aro, Abeokuta. He specializes in anxiety, depression, and addiction therapy for young people.";
  }

  if (lowerMessage.includes("sad") || lowerMessage.includes("depressed")) {
    return "I hear that you're going through a difficult time. It's completely normal to feel sad sometimes, and it's brave of you to reach out. Would you like to try some coping strategies, or would you prefer to talk about what's troubling you?";
  }

  if (lowerMessage.includes("anxious") || lowerMessage.includes("anxiety")) {
    return "Anxiety can feel overwhelming, but there are ways to manage it. Let's start with a simple breathing exercise: Breathe in slowly for 4 counts, hold for 4, then breathe out for 4. Repeat this a few times. How are you feeling right now?";
  }

  return "Thank you for sharing that with me. I'm here to listen and support you through your mental health journey. Can you tell me more about how you're feeling today?";
}

module.exports = router;
