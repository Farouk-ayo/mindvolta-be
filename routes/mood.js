const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Log mood entry
router.post(
  "/",
  authenticateToken,
  [
    body("mood").isIn([
      "HAPPY",
      "SAD",
      "ANGRY",
      "ANXIOUS",
      "CALM",
      "EXCITED",
      "DEPRESSED",
      "STRESSED",
      "CONTENT",
      "OVERWHELMED",
    ]),
    body("intensity").isInt({ min: 1, max: 10 }),
    body("notes").optional().isString(),
    body("activities").optional().isArray(),
    body("triggers").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        mood,
        intensity,
        notes,
        activities = [],
        triggers = [],
      } = req.body;

      const moodEntry = await prisma.moodEntry.create({
        data: {
          userId: req.user.id,
          mood,
          intensity,
          notes,
          activities,
          triggers,
        },
      });

      res.status(201).json({
        success: true,
        message: "Mood logged successfully",
        data: { moodEntry },
      });
    } catch (error) {
      console.error("Mood logging error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to log mood",
      });
    }
  }
);

// Get mood history
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate },
      },
    });

    // Calculate analytics
    const totalEntries = moodEntries.length;
    const averageIntensity =
      totalEntries > 0
        ? moodEntries.reduce((sum, entry) => sum + entry.intensity, 0) /
          totalEntries
        : 0;

    const moodDistribution = moodEntries.reduce((dist, entry) => {
      dist[entry.mood] = (dist[entry.mood] || 0) + 1;
      return dist;
    }, {});

    const mostFrequentMood = Object.keys(moodDistribution).reduce(
      (a, b) => (moodDistribution[a] > moodDistribution[b] ? a : b),
      "CONTENT"
    );

    res.json({
      success: true,
      data: {
        analytics: {
          totalEntries,
          averageIntensity: parseFloat(averageIntensity.toFixed(2)),
          mostFrequentMood,
          moodDistribution,
          period: `${days} days`,
        },
      },
    });
  } catch (error) {
    console.error("Mood analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get mood analytics",
    });
  }
});

module.exports = router;
