const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get music tracks
router.get("/tracks", authenticateToken, async (req, res) => {
  try {
    const { mood, genre } = req.query;

    let whereClause = {};
    if (mood) {
      whereClause.moodTags = { has: mood.toLowerCase() };
    }
    if (genre) {
      whereClause.genre = genre;
    }

    const tracks = await prisma.musicTrack.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { tracks },
    });
  } catch (error) {
    console.error("Get music tracks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get music tracks",
    });
  }
});

// Get recommended playlist based on mood
router.get("/playlist/recommended", authenticateToken, async (req, res) => {
  try {
    // Get user's recent mood
    const recentMood = await prisma.moodEntry.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    let moodTag = "calm"; // default
    if (recentMood) {
      const moodMapping = {
        HAPPY: "energetic",
        SAD: "calm",
        ANGRY: "calm",
        ANXIOUS: "calm",
        CALM: "peaceful",
        EXCITED: "energetic",
        DEPRESSED: "uplifting",
        STRESSED: "relaxing",
        CONTENT: "peaceful",
      };
      moodTag = moodMapping[recentMood.mood] || "calm";
    }

    const tracks = await prisma.musicTrack.findMany({
      where: {
        moodTags: { has: moodTag },
      },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        playlist: {
          name: `${moodTag.charAt(0).toUpperCase() + moodTag.slice(1)} Vibes`,
          description: `Curated for your current mood`,
          tracks,
        },
      },
    });
  } catch (error) {
    console.error("Get recommended playlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommended playlist",
    });
  }
});

module.exports = router;
