const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Update user profile
router.put(
  "/profile",
  authenticateToken,
  [
    body("name").optional().trim().isLength({ min: 2 }),
    body("dateOfBirth").optional().isISO8601(),
    body("gender")
      .optional()
      .isIn(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
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

      const updates = {};
      const allowedFields = ["name", "dateOfBirth", "gender", "occupation"];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (req.body.dateOfBirth) {
        updates.dateOfBirth = new Date(req.body.dateOfBirth);
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updates,
        select: {
          id: true,
          name: true,
          email: true,
          dateOfBirth: true,
          gender: true,
          occupation: true,
          avatar: true,
        },
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: { user },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
      });
    }
  }
);

// Complete onboarding
router.post(
  "/onboarding/complete",
  authenticateToken,
  [
    body("mentalHealthIssues").isArray(),
    body("stressCauses").isArray(),
    body("name").trim().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const { mentalHealthIssues, stressCauses, name } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name,
          mentalHealthIssues,
          stressCauses,
          isOnboardingComplete: true,
        },
      });

      res.json({
        success: true,
        message: "Onboarding completed successfully",
        data: {
          user: {
            id: user.id,
            isOnboardingComplete: user.isOnboardingComplete,
          },
        },
      });
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to complete onboarding",
      });
    }
  }
);

module.exports = router;
