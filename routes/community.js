const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get community posts
router.get("/posts", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const skip = (page - 1) * limit;

    let whereClause = {};
    if (tag) {
      whereClause.tags = { has: tag };
    }

    const posts = await prisma.communityPost.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    const totalPosts = await prisma.communityPost.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
          hasNextPage: skip + posts.length < totalPosts,
        },
      },
    });
  } catch (error) {
    console.error("Get community posts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get community posts",
    });
  }
});

// Create community post
router.post(
  "/posts",
  authenticateToken,
  [
    body("title").trim().isLength({ min: 5, max: 200 }),
    body("content").trim().isLength({ min: 10, max: 2000 }),
    body("tags").optional().isArray(),
    body("isAnonymous").optional().isBoolean(),
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

      const { title, content, tags = [], isAnonymous = false } = req.body;

      const post = await prisma.communityPost.create({
        data: {
          userId: req.user.id,
          title,
          content,
          tags,
          isAnonymous,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: { post },
      });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create post",
      });
    }
  }
);

// Add comment to post
router.post(
  "/posts/:postId/comments",
  authenticateToken,
  [
    body("content").trim().isLength({ min: 1, max: 500 }),
    body("isAnonymous").optional().isBoolean(),
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

      const { postId } = req.params;
      const { content, isAnonymous = false } = req.body;

      // Check if post exists
      const post = await prisma.communityPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      const comment = await prisma.communityComment.create({
        data: {
          postId,
          userId: req.user.id,
          content,
          isAnonymous,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: { comment },
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add comment",
      });
    }
  }
);

module.exports = router;
