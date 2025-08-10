const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get user insights dashboard
router.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Mood insights
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const weeklyMoods = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Chat activity
    const chatMessages = await prisma.message.findMany({
      where: {
        senderId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Calculate insights
    const averageMoodIntensity =
      moodEntries.length > 0
        ? moodEntries.reduce((sum, entry) => sum + entry.intensity, 0) /
          moodEntries.length
        : 0;

    const weeklyAverage =
      weeklyMoods.length > 0
        ? weeklyMoods.reduce((sum, entry) => sum + entry.intensity, 0) /
          weeklyMoods.length
        : 0;

    const moodTrend =
      weeklyAverage > averageMoodIntensity
        ? "improving"
        : weeklyAverage < averageMoodIntensity
        ? "declining"
        : "stable";

    const mostCommonMood =
      moodEntries.length > 0
        ? moodEntries.reduce((acc, entry) => {
            acc[entry.mood] = (acc[entry.mood] || 0) + 1;
            return acc;
          }, {})
        : {};

    const topMood = Object.keys(mostCommonMood).reduce(
      (a, b) => (mostCommonMood[a] > mostCommonMood[b] ? a : b),
      "CONTENT"
    );

    const insights = {
      moodInsights: {
        averageIntensity: parseFloat(averageMoodIntensity.toFixed(2)),
        weeklyAverage: parseFloat(weeklyAverage.toFixed(2)),
        trend: moodTrend,
        mostCommonMood: topMood,
        totalEntries: moodEntries.length,
      },
      activityInsights: {
        chatMessagesCount: chatMessages.length,
        averageMessagesPerDay: parseFloat(
          (chatMessages.length / 30).toFixed(1)
        ),
        engagementLevel:
          chatMessages.length > 30
            ? "high"
            : chatMessages.length > 10
            ? "medium"
            : "low",
      },
      recommendations: generateRecommendations(
        moodTrend,
        topMood,
        chatMessages.length
      ),
    };

    res.json({
      success: true,
      data: { insights },
    });
  } catch (error) {
    console.error("Dashboard insights error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get insights",
    });
  }
});

// Get thought of the day
router.get("/thought-of-the-day", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get a random active thought for today
    const thoughtsCount = await prisma.thoughtOfTheDay.count({
      where: { isActive: true },
    });

    const randomSkip = Math.floor(Math.random() * thoughtsCount);

    const thought = await prisma.thoughtOfTheDay.findFirst({
      where: { isActive: true },
      skip: randomSkip,
    });

    res.json({
      success: true,
      data: { thought },
    });
  } catch (error) {
    console.error("Thought of the day error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get thought of the day",
    });
  }
});

function generateRecommendations(trend, mood, chatActivity) {
  const recommendations = [];

  if (trend === "declining") {
    recommendations.push({
      type: "mood",
      title: "Your mood trend needs attention",
      description:
        "Consider talking to our AI or a therapist about what you're experiencing.",
      action: "Start a chat session",
    });
  }

  if (mood === "ANXIOUS" || mood === "STRESSED") {
    recommendations.push({
      type: "activity",
      title: "Try relaxation techniques",
      description:
        "Breathing exercises and calming music can help reduce anxiety.",
      action: "Listen to calming music",
    });
  }

  if (chatActivity < 10) {
    recommendations.push({
      type: "engagement",
      title: "Stay connected",
      description:
        "Regular check-ins can help track your mental health journey.",
      action: "Chat with MindVolta AI",
    });
  }

  return recommendations;
}

module.exports = router;
