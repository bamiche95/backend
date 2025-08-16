require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const http = require("http");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Server } = require("socket.io");
const xss = require('xss');
//

const app = express();
const server = http.createServer(app);
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
// Add WebSocket Server


const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});
// WebSocket connection logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for new comment
  socket.on("new-comment", (data) => {
    // Broadcast the new comment to everyone except the sender
    socket.broadcast.emit("receive-comment", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// CORS configuration
app.use(cors({
  origin: "http://localhost:5173",  // Adjust based on your frontend
  credentials: true,               // Allow credentials (cookies)
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }  // 1 week session expiry
}));

// MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.stack);
    return;
  }
  console.log("Connected to the database!");
});

// Registration API
app.post("/api/register", async (req, res) => {
  const { username, email, password, confirmPassword, firstname, lastname } = req.body;

  if (!username || !email || !password || !firstname || !lastname || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  db.query("SELECT userid FROM nearby_users WHERE username = ? OR email = ?", [username, email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length > 0) {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error hashing password:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      const query = `
        INSERT INTO nearby_users (username, email, password, firstname, lastname)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(query, [username, email, hashedPassword, firstname, lastname], (err, results) => {
        if (err) {
          console.error("Error inserting user into database:", err);
          return res.status(500).json({ error: "Database error" });
        }

        res.status(201).json({ message: "User registered successfully" });
      });
    });
  });
});

// Login endpoint with session management
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.query('SELECT * FROM nearby_users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ error: 'Password check failed' });

      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Set user session
      req.session.user = {
        id: user.userid,
        username: user.username,
        email: user.email,
        name:  `${user.firstname} ${user.lastname}`
      };

      res.json({ message: 'Login successful', user: req.session.user });
    });
  });
});

// Check if the user is logged in
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  } else {
    return res.status(401).json({ error: 'Not logged in' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Create a post with media
app.post('/api/createComment', upload.array('media', 10), (req, res) => {
  console.log('Received createComment request');

  // Check if the user is logged in
  if (!req.session.user) {
    console.error('User not logged in');
    return res.status(401).json({ error: 'User is not logged in' });
  }

  // Extract content, postId, groupId, and parentCommentId from the request body
  const { content, postId, groupId, parentCommentId } = req.body;
  console.log('Request body:', { content, postId, groupId, parentCommentId });

  // Sanitize the content to prevent XSS
  const safeContent = xss(content);
  console.log('Sanitized content:', safeContent);

  const userId = req.session.user.id;
  console.log('Current user ID:', userId);

  if (!postId) {
    console.error('Post ID is missing');
    return res.status(400).json({ error: 'Post ID is required' });
  }

  if (!safeContent && (!req.files || req.files.length === 0)) {
    console.error('Comment content or media is missing');
    return res.status(400).json({ error: 'Comment content or media is required' });
  }

  // Determine whether the comment is for a group post or global post based on groupId
  let queryComment;
  let mediaTable;
  let postTable;
  let postColumn;

  // Determine the appropriate tables and column names based on whether it's a group post or global post
  if (groupId) {
    // For group posts
    queryComment = `INSERT INTO nearby_group_comments (post_id, user_id, content, group_id, parent_comment_id) VALUES (?, ?, ?, ?, ?)`;
    mediaTable = 'nearby_group_comment_media';
    postTable = 'nearby_group_posts'; // For group posts, use the nearby_group_posts table
    postColumn = 'post_id'; // For group posts, the column is post_id
  } else {
    // For global posts
    queryComment = `INSERT INTO nearby_group_comments (post_id, user_id, content, group_id, parent_comment_id) VALUES (?, ?, ?, ?, ?)`;
    mediaTable = 'nearby_comment_media';
    postTable = 'nearby_posts'; // For global posts, use the nearby_posts table
    postColumn = 'postid'; // For global posts, the column is postid
  }

  // Check if the post exists in the respective table (group posts or global posts)
  const checkPostQuery = `SELECT 1 FROM ${postTable} WHERE ${postColumn} = ? LIMIT 1`;

  // Execute the check post query
  db.query(checkPostQuery, [postId], (err, result) => {
    if (err) {
      console.error('Error checking if post exists:', err);
      return res.status(500).json({ error: 'Failed to check if post exists' });
    }

    if (result.length === 0) {
      console.error('Post does not exist');
      return res.status(404).json({ error: 'Post not found' });
    }

    // Proceed to insert the comment after post validation
    const queryParams = [postId, userId, safeContent, groupId || null, parentCommentId || null]; // ✅ Fixed order
    db.query(queryComment, queryParams, (err, result) => {
      if (err) {
        console.error('Error inserting comment into database:', err);
        return res.status(500).json({ error: 'Failed to create comment' });
      }

      console.log('Comment inserted into database:', result);

      const commentId = result.insertId;
      const createdAt = new Date().toISOString();
      const newComment = {
        commentId,
        postId,
        userId,
        content: safeContent,
        createdAt,
        media: [],
        fullname: req.session.user.name,
        profilePicture: req.session.user.profilePic,
      };

      console.log('New comment prepared for emission:', newComment);

      const files = req.files || [];
      console.log('Uploaded files:', files);

      // If there are no files, simply return the new comment
      if (files.length === 0) {
        io.to(postId.toString()).emit("receive-comment", newComment);
        return res.status(200).json({
          message: 'Comment created successfully',
          newComment, // Only return the new comment
        });
      }

      let completed = 0;
      let hasError = false;
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
      const maxFileSize = 200 * 1024 * 1024; // 200 MB

      files.forEach((file) => {
        console.log(`Processing file: ${file.originalname}, MIME type: ${file.mimetype}, Size: ${file.size}`);

        // Check if the file's MIME type is in the allowed list
        if (!allowedMimeTypes.includes(file.mimetype)) {
          console.error(`Invalid file type for file: ${file.originalname}`);
          return res.status(400).json({ error: 'Invalid file type' });
        }

        // Check if the file's size is within the allowed limit
        if (file.size > maxFileSize) {
          console.error(`File size exceeds limit for file: ${file.originalname}`);
          return res.status(400).json({ error: 'File size is too large. Max size is 200MB' });
        }

        const mediaType = file.mimetype.startsWith('image') ? 'image' : 'video';
        const mediaUrl = `/uploads/${file.filename}`;
        const queryMedia = `INSERT INTO ${mediaTable} (comment_id, media_url, media_type) VALUES (?, ?, ?)`;

        console.log(`Inserting media into database: ${mediaUrl}, Type: ${mediaType}`);
        db.query(queryMedia, [commentId, mediaUrl, mediaType], (err) => {
          if (err) {
            console.error('Error inserting comment media:', err);
            hasError = true;
          } else {
            newComment.media.push({ url: mediaUrl, type: mediaType });
            console.log(`Media added to newComment: ${mediaUrl}`);
          }

          completed++;
          console.log(`Media upload progress: ${completed}/${files.length}`);
          if (completed === files.length) {
            if (hasError) {
              console.error('Some media failed to upload');
              return res.status(500).json({ error: 'Comment created, but failed to insert some media' });
            }
            io.to(postId.toString()).emit("receive-comment", newComment);
            return res.status(200).json({
              message: 'Comment created successfully',
              newComment,  // Return the new comment with media
            });
          }
        });
      });
    });
  });
});


// Fetch all posts and their media
// Fetch all posts and their media with an option to include reactions
app.get('/api/getAllPosts', (req, res) => {
  const userId = req.session.user?.id;  // Get the logged-in user's ID
  const { includeReactions, groupId } = req.query;  // Optional query params for reactions and groupId
  
  // Base query to fetch global posts (from nearby_posts)
  let query = `
    SELECT p.postid AS postId, p.content, p.created_at, 
           u.username, u.firstname, u.lastname, u.profile_picture,
           m.media_url, m.media_type,
           (SELECT COUNT(*) FROM nearby_post_reactions WHERE postid = p.postid) AS like_count
    FROM nearby_posts p
    INNER JOIN nearby_users u ON p.userid = u.userid
    LEFT JOIN nearby_post_media m ON p.postid = m.postid
  `;

  // If a groupId is provided, fetch group-specific posts (from nearby_group_posts)
  if (groupId) {
    query = `
      SELECT p.post_id AS postId, p.content, p.created_at, 
             u.username, u.firstname, u.lastname, u.profile_picture,
             m.media_url, m.media_type,
             (SELECT COUNT(*) FROM nearby_group_post_reactions WHERE post_id = p.post_id) AS like_count,
             r.emoji  -- Include the emoji reaction if the user has reacted
      FROM nearby_group_posts p
      INNER JOIN nearby_users u ON p.user_id = u.userid
      LEFT JOIN nearby_grouppost_media m ON p.post_id = m.post_id
      LEFT JOIN nearby_group_post_reactions r ON p.post_id = r.post_id AND r.user_id = ?  -- Current user
      WHERE p.group_id = ?  -- Filter by groupId
      ORDER BY p.created_at DESC
    `;
  }

  // If includeReactions is true, join the reactions table to fetch emojis
  if (includeReactions === 'true') {
    // If no groupId, join global reactions table
    if (!groupId) {
      query = `
        SELECT p.postid AS postId, p.content, p.created_at, 
               u.username, u.firstname, u.lastname, u.profile_picture,
               m.media_url, m.media_type,
               (SELECT COUNT(*) FROM nearby_post_reactions WHERE postid = p.postid) AS like_count,
               r.emoji  -- Include the emoji reaction if the user has reacted
        FROM nearby_posts p
        INNER JOIN nearby_users u ON p.userid = u.userid
        LEFT JOIN nearby_post_media m ON p.postid = m.postid
        LEFT JOIN nearby_post_reactions r ON p.postid = r.postid AND r.userid = ?  -- Only get reaction for the current user
        ORDER BY p.created_at DESC
      `;
    } else {
      // If groupId is provided, join group-specific reactions table
      query = `
        SELECT p.post_id AS postId, p.content, p.created_at, 
               u.username, u.firstname, u.lastname, u.profile_picture,
               m.media_url, m.media_type,
               (SELECT COUNT(*) FROM nearby_group_post_reactions WHERE post_id = p.post_id) AS like_count,
               r.emoji  -- Include the emoji reaction if the user has reacted
        FROM nearby_group_posts p
        INNER JOIN nearby_users u ON p.user_id = u.userid
        LEFT JOIN nearby_grouppost_media m ON p.post_id = m.post_id
        LEFT JOIN nearby_group_post_reactions r ON p.post_id = r.post_id AND r.user_id = ?  -- Current user
        WHERE p.group_id = ?
        ORDER BY p.created_at DESC
      `;
    }
  }

  // Run the query based on the conditions
  db.query(query, [userId, groupId], (err, results) => {
    if (err) {
      console.error('Error fetching posts from database:', err);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    const posts = [];
    let currentPost = null;

    // Format the posts with user details, media, and reactions
    results.forEach(post => {
      // If this is a new post, create a new post object
      if (!currentPost || currentPost.postId !== post.postId) {
        if (currentPost) {
          posts.push(currentPost);
        }

        currentPost = {
          postId: post.postId,  // Ensure consistent field naming
          content: post.content,
          createdAt: post.created_at,
          user: {
            username: post.username,
            fullName: `${post.firstname} ${post.lastname}`,
            profilePicture: post.profile_picture,
          },
          media: [],  // Initialize media array
          likeCount: post.like_count,  // Include the like count
        };
      }

      // Add the media item to the current post's media array if it exists
      if (post.media_url) {
        currentPost.media.push({
          mediaUrl: post.media_url,
          mediaType: post.media_type,
        });
      }

      // If reactions are included, add the user's emoji reaction to the post
      if (includeReactions === 'true' && post.emoji) {
        currentPost.reaction = post.emoji;  // Only include the emoji if the user reacted
      }
    });

    // Add the last post to the posts array
    if (currentPost) {
      posts.push(currentPost);
    }

    // Return the posts array with media, like counts, and optionally reactions
    res.status(200).json(posts);
  });
});


//dELETE ALL POSTS
// Post deletion API
app.delete('/api/deletePost/:postId', (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.id; // Get the logged-in user's ID
  const { groupId } = req.query; // Optional query param for groupId to distinguish between global and group posts

  if (!userId) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  // Query to check if the post exists and belongs to the user
  let checkQuery = '';
  if (groupId) {
    // Group post check
    checkQuery = `
      SELECT * FROM nearby_group_posts WHERE post_id = ? AND user_id = ? AND group_id = ?
    `;
  } else {
    // Global post check
    checkQuery = `
      SELECT * FROM nearby_posts WHERE postid = ? AND userid = ?
    `;
  }

  // Check ownership of the post
  db.query(checkQuery, [postId, userId, groupId].filter(Boolean), (err, result) => {
    if (err) {
      console.error('Error checking post ownership:', err);
      return res.status(500).json({ error: 'Error checking post ownership' });
    }

    if (result.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    // Delete associated media if any
    const deleteMediaQuery = groupId
      ? `DELETE FROM nearby_grouppost_media WHERE post_id = ?`
      : `DELETE FROM nearby_post_media WHERE postid = ?`;

    db.query(deleteMediaQuery, [postId], (mediaErr) => {
      if (mediaErr) {
        console.error('Error deleting post media:', mediaErr);
        return res.status(500).json({ error: 'Failed to delete media associated with the post' });
      }

      // Now delete the post itself
      const deletePostQuery = groupId
        ? `DELETE FROM nearby_group_posts WHERE post_id = ?`
        : `DELETE FROM nearby_posts WHERE postid = ?`;

      db.query(deletePostQuery, [postId], (deleteErr) => {
        if (deleteErr) {
          console.error('Error deleting post:', deleteErr);
          return res.status(500).json({ error: 'Failed to delete post' });
        }

        // Emit to the post's room on Socket.IO for real-time updates
        io.to(postId).emit('postDeleted', { postId, groupId });

        return res.status(200).json({ message: 'Post deleted successfully' });
      });
    });
  });
});


//Emoji API

app.post('/api/emoji', async (req, res) => {
  const { postId, emoji, groupId } = req.body;  // groupId is now passed in the request body
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    if (emoji === null) {
      // Delete the reaction
      if (groupId) {
        // For group posts, delete from the nearby_group_post_reactions table
        const deleteQuery = `DELETE FROM nearby_group_post_reactions WHERE post_id = ? AND user_id = ? AND group_id = ?`;
        db.query(deleteQuery, [postId, userId, groupId], (err, result) => {
          if (err) {
            console.error("Failed to delete group post reaction:", err);
            return res.sendStatus(500);
          }
          return res.status(200).json({ message: 'Group post reaction removed' });
        });
      } else {
        // For global posts, delete from the nearby_post_reactions table
        const deleteQuery = `DELETE FROM nearby_post_reactions WHERE postid = ? AND userid = ?`;
        db.query(deleteQuery, [postId, userId], (err, result) => {
          if (err) {
            console.error("Failed to delete global post reaction:", err);
            return res.sendStatus(500);
          }
          return res.status(200).json({ message: 'Global post reaction removed' });
        });
      }
    } else {
      // Insert or update the reaction
      if (groupId) {
        // For group posts, insert into the nearby_group_post_reactions table
        const insertQuery = `
          INSERT INTO nearby_group_post_reactions (post_id, user_id, emoji, group_id)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)
        `;
        db.query(insertQuery, [postId, userId, emoji, groupId], (err, result) => {
          if (err) {
            console.error("Group post reaction error", err);
            return res.sendStatus(500);
          }
          res.sendStatus(200);
        });
      } else {
        // For global posts, insert into the nearby_post_reactions table
        const insertQuery = `
          INSERT INTO nearby_post_reactions (postid, userid, emoji)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)
        `;
        db.query(insertQuery, [postId, userId, emoji], (err, result) => {
          if (err) {
            console.error("Global post reaction error", err);
            return res.sendStatus(500);
          }
          res.sendStatus(200);
        });
      }
    }
  } catch (err) {
    console.error("Reaction error", err);
    res.sendStatus(500);
  }
});


//retrieve emoji reactions from db
app.get('/api/reactions/:postId', (req, res) => {
  const { postId } = req.params;

  // SQL query to get all reactions for the specified post
  const query = `
    SELECT r.emoji, u.userid, u.username, u.profile_picture
    FROM nearby_post_reactions r
    JOIN nearby_users u ON r.userid = u.userid
    WHERE r.postid = ?
  `;

  db.query(query, [postId], (err, results) => {
    if (err) {
      console.error('Error fetching reactions from database:', err);
      return res.status(500).json({ error: 'Failed to fetch reactions' });
    }

    // Return the reactions with user information
    res.status(200).json(results);
  });
});

//retrieve emoji reactions for a specific user for a specific post

app.post('/api/reactions', (req, res) => {
  const { postIds } = req.body; // Array of postIds from the client
  const userId = req.session.user.id; // Get the logged-in user's ID from the session

  if (!Array.isArray(postIds)) {
    return res.status(400).json({ error: 'postIds must be an array' });
  }

  // Query to get all reactions for the given postIds
  const query = `
    SELECT postid, userid, COUNT(*) as total_reactions, emoji
    FROM nearby_post_reactions
    WHERE postid IN (?) AND userid = ?
    GROUP BY postid, emoji
  `;

  db.query(query, [postIds, userId], (err, results) => {
    if (err) {
      console.error('Error fetching reactions from database:', err);
      return res.status(500).json({ error: 'Failed to fetch reactions' });
    }

    // Group results by postId and include total reaction count
    const reactions = postIds.reduce((acc, postId) => {
      const reaction = results.find((r) => r.postid === postId);
      acc[postId] = {
        userReaction: reaction ? reaction.emoji : null, // Add user's reaction
        count: reaction ? reaction.total_reactions : 0, // Add total count
      };
      return acc;
    }, {});

    return res.status(200).json({ reactions });
  });
});
//Comment api
app.post('/api/createComment', upload.array('media', 10), (req, res) => {
  console.log('Received createComment request');

  // Check if the user is logged in
  if (!req.session.user) {
    console.error('User not logged in');
    return res.status(401).json({ error: 'User is not logged in' });
  }

  // Extract content and postId from the request body
  const { content, postId, isGroupPost } = req.body;  // `isGroupPost` flag determines if it's a group post or not
  console.log('Request body:', { content, postId, isGroupPost });

  // Sanitize the content to prevent XSS
  const safeContent = xss(content);
  console.log('Sanitized content:', safeContent);

  const userId = req.session.user.id;
  console.log('Current user ID:', userId);

  if (!postId) {
    console.error('Post ID is missing');
    return res.status(400).json({ error: 'Post ID is required' });
  }

  if (!safeContent && (!req.files || req.files.length === 0)) {
    console.error('Comment content or media is missing');
    return res.status(400).json({ error: 'Comment content or media is required' });
  }

  // Determine the table to insert the comment into
  let queryComment;
  let mediaTable;
  
  if (isGroupPost) {
    // Insert comment into group posts table
    queryComment = `INSERT INTO nearby_group_comments (post_id, user_id, content) VALUES (?, ?, ?)`;
    mediaTable = 'nearby_group_comment_media';
  } else {
    // Insert comment into global posts table
    queryComment = `INSERT INTO nearby_post_comments (postid, userid, content) VALUES (?, ?, ?)`;
    mediaTable = 'nearby_comment_media';
  }

  console.log('Inserting comment into database...');

  db.query(queryComment, [postId, userId, safeContent], (err, result) => {
    if (err) {
      console.error('Error inserting comment into database:', err);
      return res.status(500).json({ error: 'Failed to create comment' });
    }
    console.log('Comment inserted into database:', result);

    const commentId = result.insertId;
    const createdAt = new Date().toISOString();
    const newComment = {
      commentId,  // Fix the naming to match your app's expected format
      postId,
      userId,
      content: safeContent,
      createdAt,
      media: [],
      fullname: req.session.user.name,
      profilePicture: req.session.user.profilePic,
    };

    console.log('New comment prepared for emission:', newComment);

    const files = req.files || [];
    console.log('Uploaded files:', files);

    // If there are no files, simply return the new comment
    if (files.length === 0) {
      io.to(postId.toString()).emit("receive-comment", newComment);
      return res.status(200).json({
        message: 'Comment created successfully',
        newComment, // Only return the new comment
      });
    }

    let completed = 0;
    let hasError = false;
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    const maxFileSize = 200 * 1024 * 1024; // 200 MB

    files.forEach((file) => {
      console.log(`Processing file: ${file.originalname}, MIME type: ${file.mimetype}, Size: ${file.size}`);

      // Check if the file's MIME type is in the allowed list
      if (!allowedMimeTypes.includes(file.mimetype)) {
        console.error(`Invalid file type for file: ${file.originalname}`);
        return res.status(400).json({ error: 'Invalid file type' });
      }

      // Check if the file's size is within the allowed limit
      if (file.size > maxFileSize) {
        console.error(`File size exceeds limit for file: ${file.originalname}`);
        return res.status(400).json({ error: 'File size is too large. Max size is 200MB' });
      }

      const mediaType = file.mimetype.startsWith('image') ? 'image' : 'video';
      const mediaUrl = `/uploads/${file.filename}`;
      const queryMedia = `INSERT INTO ${mediaTable} (commentid, media_url, media_type) VALUES (?, ?, ?)`;

      console.log(`Inserting media into database: ${mediaUrl}, Type: ${mediaType}`);
      db.query(queryMedia, [commentId, mediaUrl, mediaType], (err) => {
        if (err) {
          console.error('Error inserting comment media:', err);
          hasError = true;
        } else {
          newComment.media.push({ url: mediaUrl, type: mediaType });
          console.log(`Media added to newComment: ${mediaUrl}`);
        }

        completed++;
        console.log(`Media upload progress: ${completed}/${files.length}`);
        if (completed === files.length) {
          if (hasError) {
            console.error('Some media failed to upload');
            return res.status(500).json({ error: 'Comment created, but failed to insert some media' });
          }
          io.to(postId.toString()).emit("receive-comment", newComment);
          // Return only the new comment (no need to refetch the entire list)
          return res.status(200).json({
            message: 'Comment created successfully',
            newComment,  // Return the new comment with media
          });
        }
      });
    });
  });
});

//UPDATE COMMENT-EDITING
// Backend (Node.js/Express)
app.put('/api/updateComment', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const { commentId, newContent, groupId } = req.body;

  if (!commentId || !newContent) {
    return res.status(400).json({ error: 'Comment ID and new content are required' });
  }

  const safeContent = xss(newContent);
  const userId = req.session.user.id;

  // Determine table and column names based on groupId
  const isGroup = !!groupId;
  const commentTable = isGroup ? 'nearby_group_comments' : 'nearby_post_comments';
  const commentIdColumn = isGroup ? 'comment_id' : 'commentid';
  const userIdColumn = isGroup ? 'user_id' : 'userid';

  // Check ownership
  const checkQuery = `SELECT * FROM ${commentTable} WHERE ${commentIdColumn} = ? AND ${userIdColumn} = ?`;

  db.query(checkQuery, [commentId, userId], (err, result) => {
    if (err) {
      console.error('Error checking comment ownership:', err);
      return res.status(500).json({ error: 'Error checking comment ownership' });
    }

    if (result.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to edit this comment' });
    }

    // Proceed to update
    const updateQuery = `
      UPDATE ${commentTable}
      SET content = ?, editedAt = NOW()
      WHERE ${commentIdColumn} = ? AND ${userIdColumn} = ?
    `;

    db.query(updateQuery, [safeContent, commentId, userId], (err, result) => {
      if (err) {
        console.error('Error updating comment:', err);
        return res.status(500).json({ error: 'Failed to update comment' });
      }

      res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        updatedContent: safeContent,
        editedAt: new Date().toISOString(),
      });
    });
  });
});



//Comment replies

// Create a new reply to a comment
// Updated /api/createReply endpoint to handle media uploads
// Use multer middleware in your API route for handling files
app.post('/api/createReply', upload.array('media', 10), (req, res) => {
  console.log("Multer processed files:", req.files);

  console.log('Received createReply request');

  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const { content, commentId, groupId, postId } = req.body;
  const userId = req.session.user.id;
  const safeContent = xss(content);
  console.log("Received groupId:", groupId);

  const isGroup = !!groupId;

  // Determine target tables and columns based on whether it's a group comment or a post comment
  const mediaTable = isGroup ? 'nearby_group_comment_media' : 'nearby_comment_media';
  const commentIdColumn = isGroup ? 'comment_id' : 'commentid';
  
  const postIdValue = isGroup ? null : postId;  // For group comments, postId is null
  const groupIdValue = isGroup ? groupId : null;  // For post comments, groupId is null

  if (!commentId) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }

  if (!safeContent && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: 'Reply content or media is required' });
  }

  // Check that the parent comment exists
  const checkQuery = `SELECT 1 FROM ${isGroup ? 'nearby_group_comments' : 'nearby_post_comments'} WHERE ${commentIdColumn} = ? LIMIT 1`;
  db.query(checkQuery, [commentId], (err, result) => {
    if (err) {
      console.error('Error checking comment existence:', err);
      return res.status(500).json({ error: 'Failed to check comment existence' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }

    let insertQuery;
    let insertValues;
    
    if (isGroup) {
      insertQuery = `
        INSERT INTO nearby_group_comments 
        (post_id, group_id, user_id, content, parent_comment_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
      insertValues = [postId, groupIdValue, userId, safeContent, commentId];
    } else {
      insertQuery = `
        INSERT INTO nearby_post_comments 
        (postid, userid, content, parent_comment_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())`;
      insertValues = [postId, userId, safeContent, commentId];
    }

    // Insert the reply as a new comment
    db.query(insertQuery, insertValues, (err, result) => {
      if (err) {
        console.error('Error inserting reply:', err);
        return res.status(500).json({ error: 'Failed to insert reply' });
      }

      const newCommentId = result.insertId;
      const newReply = {
        comment_id: newCommentId,
        post_id: postIdValue,
        user_id: userId,
        content: safeContent,
        parent_comment_id: commentId,
        group_id: groupIdValue,
        created_at: new Date(),
        fullname: req.session.user.name,
        profilePicture: req.session.user.profile_picture,
        media: [],
      };

      // Continue with media processing
      const files = req.files || [];
      if (files.length === 0) {
        const roomId = isGroup ? `group-${groupIdValue}` : `post-${postIdValue}`;
        io.to(roomId).emit("receive-reply", newReply);

        return res.status(201).json({ message: 'Reply created successfully', newReply });
      }

      // Media processing
      let completed = 0;
      let hasError = false;
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
      const maxFileSize = 200 * 1024 * 1024; // 200MB

      files.forEach((file) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          console.error(`Invalid file type: ${file.originalname}`);
          return res.status(400).json({ error: 'Invalid file type' });
        }

        if (file.size > maxFileSize) {
          console.error(`File too large: ${file.originalname}`);
          return res.status(400).json({ error: 'File size exceeds limit' });
        }

        const mediaType = file.mimetype.startsWith('image') ? 'image' : 'video';
        const mediaUrl = `/uploads/${file.filename}`;

        // Separate media insertion query based on group vs post
        if (isGroup) {
          // Insert into `nearby_group_comment_media` for group comments
          const mediaInsertGroup = `
            INSERT INTO nearby_group_comment_media (comment_id, media_url, media_type)
            VALUES (?, ?, ?)`;

          db.query(mediaInsertGroup, [newCommentId, mediaUrl, mediaType], (err) => {
            if (err) {
              console.error('Error inserting media into group media table:', err);
              hasError = true;
            } else {
              newReply.media.push({ url: mediaUrl, type: mediaType });
            }

            completed++;
            if (completed === files.length) {
              if (hasError) {
                return res.status(500).json({ error: 'Reply created, but some media failed' });
              }

              io.to(`group-${groupIdValue}`).emit("receive-reply", newReply);
              return res.status(201).json({ message: 'Reply and media created for group', newReply });
            }
          });
        } else {
          // Insert into `nearby_comment_media` for post comments
          const mediaInsertPost = `
            INSERT INTO nearby_comment_media (commentid, media_url, media_type)
            VALUES (?, ?, ?)`;

          db.query(mediaInsertPost, [newCommentId, mediaUrl, mediaType], (err) => {
            if (err) {
              console.error('Error inserting media into post media table:', err);
              hasError = true;
            } else {
              newReply.media.push({ url: mediaUrl, type: mediaType });
            }

            completed++;
            if (completed === files.length) {
              if (hasError) {
                return res.status(500).json({ error: 'Reply created, but some media failed' });
              }

              io.to(`post-${postIdValue}`).emit("receive-reply", newReply);
              return res.status(201).json({ message: 'Reply and media created for post', newReply });
            }
          });
        }
      });
    });
  });
});



// Endpoint to fetch comments for a specific post
app.get('/api/getComments', (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  const queryComments = `SELECT * FROM nearby_post_comments WHERE postid = ? ORDER BY created_at DESC`;

  db.query(queryComments, [postId], (err, comments) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    res.status(200).json({ comments });
  });
});

//DELETE REPLY
app.delete('/api/deleteReply/:commentId', (req, res) => {
  const { commentId } = req.params;
  const { groupId } = req.body; // read groupId from body
  const userId = req.session.user?.id;

  if (!commentId) {
    return res.status(400).json({ error: "Missing comment ID" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isGroup = !!groupId;
  const commentTable = isGroup ? 'nearby_group_comments' : 'nearby_post_comments';
  const mediaTable = isGroup ? 'nearby_group_comment_media' : 'nearby_comment_media';
  const commentIdCol = isGroup ? 'comment_id' : 'commentid';
  const userIdCol = isGroup ? 'user_id' : 'userid';

  const checkQuery = `SELECT * FROM ${commentTable} WHERE ${commentIdCol} = ? AND ${userIdCol} = ?`;

  db.query(checkQuery, [commentId, userId], (err, results) => {
    if (err) {
      console.error('Error checking reply:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: 'You can only delete your own reply' });
    }

    const deleteQuery = `DELETE FROM ${commentTable} WHERE ${commentIdCol} = ?`;
    db.query(deleteQuery, [commentId], (err) => {
      if (err) {
        console.error('Error deleting reply:', err);
        return res.status(500).json({ error: 'Failed to delete reply' });
      }

      const deleteMediaQuery = `DELETE FROM ${mediaTable} WHERE ${commentIdCol} = ?`;
      db.query(deleteMediaQuery, [commentId], (err) => {
        if (err) {
          console.error('Error deleting media:', err); // non-fatal
        }
      });

      res.status(200).json({ message: 'Reply deleted successfully' });
    });
  });
});



//Edit reply
app.put('/api/editReply', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const { replyId, newContent, groupId } = req.body;

  if (!replyId || !newContent) {
    return res.status(400).json({ error: 'Reply ID and new content are required' });
  }

  const safeContent = xss(newContent);
  const userId = req.session.user.id;

  // Choose the correct table and ID column based on groupId
  const isGroup = !!groupId;
  const commentTable = isGroup ? 'nearby_group_comments' : 'nearby_post_comments';
  const commentIdColumn = isGroup ? 'comment_id' : 'commentid';
  const userIdColumn = isGroup ? 'user_id' : 'userid';

  // Check ownership
  const checkReplyQuery = `SELECT * FROM ${commentTable} WHERE ${commentIdColumn} = ? AND ${userIdColumn} = ?`;

  db.query(checkReplyQuery, [replyId, userId], (err, result) => {
    if (err) {
      console.error('Error checking reply ownership:', err);
      return res.status(500).json({ error: 'Error checking reply ownership' });
    }

    if (result.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to edit this reply' });
    }

    // Update content
    const updateQuery = `
      UPDATE ${commentTable}
      SET content = ?, editedAt = NOW()
      WHERE ${commentIdColumn} = ? AND ${userIdColumn} = ?
    `;

    db.query(updateQuery, [safeContent, replyId, userId], (err, result) => {
      if (err) {
        console.error('Error updating reply:', err);
        return res.status(500).json({ error: 'Failed to update reply' });
      }

      if (result.affectedRows === 0) {
        return res.status(500).json({ error: 'Failed to update reply' });
      }

      res.status(200).json({
        success: true,
        message: 'Reply updated successfully',
        updatedContent: safeContent,
        editedAt: new Date().toISOString(),
      });
    });
  });
});




//Delete comment API
app.delete('/api/deleteComment/:commentId', (req, res) => {
  const { commentId } = req.params;
  const { groupId } = req.body;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const isGroup = !!groupId;
  const commentTable = isGroup ? 'nearby_group_comments' : 'nearby_post_comments';
  const mediaTable = isGroup ? 'nearby_group_comment_media' : 'nearby_comment_media';
  const commentIdCol = isGroup ? 'comment_id' : 'commentid';
  const userIdCol = isGroup ? 'user_id' : 'userid';
  const postIdCol = isGroup ? 'group_id' : 'postid';

  const checkQuery = `SELECT * FROM ${commentTable} WHERE ${commentIdCol} = ? AND ${userIdCol} = ?`;

  db.query(checkQuery, [commentId, userId], (err, result) => {
    if (err) {
      console.error('Error fetching comment:', err);
      return res.status(500).json({ error: 'Failed to fetch comment' });
    }

    if (result.length === 0) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment' });
    }

    const postId = result[0][postIdCol];

    const deleteCommentQuery = `DELETE FROM ${commentTable} WHERE ${commentIdCol} = ?`;
    const deleteMediaQuery = `DELETE FROM ${mediaTable} WHERE ${commentIdCol} = ?`;

    db.query(deleteMediaQuery, [commentId], (mediaErr) => {
      if (mediaErr) {
        console.error('Error deleting comment media:', mediaErr);
        return res.status(500).json({ error: 'Failed to delete media associated with the comment' });
      }

      db.query(deleteCommentQuery, [commentId], (deleteErr) => {
        if (deleteErr) {
          console.error('Error deleting comment:', deleteErr);
          return res.status(500).json({ error: 'Failed to delete comment' });
        }

        if (!isGroup) {
          io.to(postId).emit('commentDeleted', { commentId, postId }); // Global only
        }

        return res.status(200).json({ message: 'Comment deleted successfully' });
      });
    });
  });
});



//Likes for replies
// Like or Unlike a Reply
app.post('/api/likeReply', (req, res) => {
  const { replyId, groupId } = req.body;
  const userId = req.session.user.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  // If groupId is provided, handle group reply likes
  if (groupId) {
    // Step 1: Ensure the reply is for a group comment, link via comment_id and group_id
    const checkQueryGroup = `
      SELECT * FROM nearby_group_comment_replies_likes 
      WHERE reply_id = ? 
      AND user_id = ? 
      AND group_id = ?`;
    
    db.query(checkQueryGroup, [replyId, userId, groupId], (err, results) => {
      if (err) {
        console.error('Error checking like for group reply:', err);
        return res.status(500).json({ error: 'Failed to check like for group reply' });
      }

      if (results.length > 0) {
        // Already liked — so unlike it
        const deleteQueryGroup = `
          DELETE FROM nearby_group_comment_replies_likes 
          WHERE reply_id = ? 
          AND user_id = ? 
          AND group_id = ?`;
        
        db.query(deleteQueryGroup, [replyId, userId, groupId], (err) => {
          if (err) {
            console.error('Error unliking group reply:', err);
            return res.status(500).json({ error: 'Failed to unlike group reply' });
          }
          res.status(200).json({ liked: false });
        });
      } else {
        // Not yet liked — so like it
        const insertQueryGroup = `
          INSERT INTO nearby_group_comment_replies_likes (reply_id, user_id, group_id) 
          VALUES (?, ?, ?)`;
        
        db.query(insertQueryGroup, [replyId, userId, groupId], (err) => {
          if (err) {
            console.error('Error liking group reply:', err);
            return res.status(500).json({ error: 'Failed to like group reply' });
          }
          res.status(200).json({ liked: true });
        });
      }
    });
  } else {
    // Step 2: Handle non-group (regular) reply likes
    // First, check if the like already exists in the regular table
    const checkQuery = `SELECT * FROM nearby_reply_likes WHERE reply_id = ? AND user_id = ?`;
    db.query(checkQuery, [replyId, userId], (err, results) => {
      if (err) {
        console.error('Error checking like:', err);
        return res.status(500).json({ error: 'Failed to check like' });
      }

      if (results.length > 0) {
        // Already liked — so unlike it
        const deleteQuery = `DELETE FROM nearby_reply_likes WHERE reply_id = ? AND user_id = ?`;
        db.query(deleteQuery, [replyId, userId], (err) => {
          if (err) {
            console.error('Error unliking reply:', err);
            return res.status(500).json({ error: 'Failed to unlike reply' });
          }
          res.status(200).json({ liked: false });
        });
      } else {
        // Not yet liked — so like it
        const insertQuery = `INSERT INTO nearby_reply_likes (reply_id, user_id) VALUES (?, ?)`;
        db.query(insertQuery, [replyId, userId], (err) => {
          if (err) {
            console.error('Error liking reply:', err);
            return res.status(500).json({ error: 'Failed to like reply' });
          }
          res.status(200).json({ liked: true });
        });
      }
    });
  }
});



// Get reply likes for posts or groups
app.post('/api/getReplyLikes', (req, res) => {
  const { postIds, groupId } = req.body;

  // Validate input
  if (groupId) {
    // === GROUP REPLIES LOGIC ===
    // We ignore `postIds` when fetching group replies; instead we filter by groupId.
    const query = `
      SELECT
        c.comment_id   AS replyCommentId,
        COUNT(l.like_id) AS likeCount,
        GROUP_CONCAT(l.user_id) AS likedByUser
      FROM nearby_group_comments c
      LEFT JOIN nearby_group_comment_replies_likes l
        ON c.comment_id = l.reply_id
      WHERE c.group_id = ?
        AND c.parent_comment_id IS NOT NULL
      GROUP BY c.comment_id
    `;

    db.query(query, [groupId], (err, results) => {
      if (err) {
        console.error('Error fetching group reply likes:', err);
        return res.status(500).json({ error: 'Failed to fetch group reply likes' });
      }

      const data = results.map(row => ({
        replyCommentId: row.replyCommentId,
        likeCount:     row.likeCount || 0,
        likedByUser:   row.likedByUser ? row.likedByUser.split(',') : [],
      }));

      return res.status(200).json({ success: true, data });
    });

  } else {
    // === ORIGINAL LOGIC FOR POST REPLIES ===
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ error: 'Post IDs are required' });
    }

    const query = `
      SELECT 
        c.commentid      AS replyCommentId,
        COUNT(rl.id)     AS likeCount,
        GROUP_CONCAT(rl.user_id) AS likedByUser
      FROM nearby_post_comments c
      LEFT JOIN nearby_reply_likes rl
        ON c.commentid = rl.reply_id
      WHERE c.postid IN (?)
        AND c.parent_comment_id IS NOT NULL
      GROUP BY c.commentid
    `;

    db.query(query, [postIds], (err, results) => {
      if (err) {
        console.error('Error fetching reply likes:', err);
        return res.status(500).json({ error: 'Failed to fetch reply likes' });
      }

      const data = results.map(row => ({
        replyCommentId: row.replyCommentId,
        likeCount:      row.likeCount || 0,
        likedByUser:    row.likedByUser ? row.likedByUser.split(',') : [],
      }));

      return res.status(200).json({ success: true, data });
    });
  }
  
});




//get comments api
// Fetch comments for a specific post
app.post('/api/commentsBatch', (req, res) => {
  const { postIds, groupId } = req.body;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    return res.status(400).json({ error: 'Post IDs are required' });
  }

  let query;

  if (groupId) {
    query = `
SELECT 
  c.post_id AS postid,
  c.comment_id AS commentid, 
  c.content, 
  c.created_at, 
  c.updated_at AS editedAt,
  u.userid, 
  u.firstname, 
  u.lastname,
  u.username, 
  u.profile_picture,
  CAST(
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'url', cm.media_url,
        'type', cm.media_type
      )
    ) AS CHAR
  ) AS media,
  c.parent_comment_id
FROM nearby_group_comments c
LEFT JOIN nearby_users u ON c.user_id = u.userid
LEFT JOIN nearby_group_comment_media cm ON c.comment_id = cm.comment_id
JOIN nearby_group_posts p ON c.post_id = p.post_id
WHERE p.group_id = ? AND c.post_id IN (?) 
GROUP BY c.post_id, c.comment_id
ORDER BY c.created_at ASC;

    `;
  } else {
    query = `
      SELECT 
        c.postid, 
        c.commentid, 
        c.content, 
        c.created_at, 
        c.editedAt, 
        u.userid, 
        u.firstname, 
        u.lastname,
        u.username, 
        u.profile_picture,
        CAST(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'url', cm.media_url,
              'type', cm.media_type
            )
          ) AS CHAR
        ) AS media,
        c.parent_comment_id
      FROM nearby_post_comments c
      LEFT JOIN nearby_users u ON c.userid = u.userid
      LEFT JOIN nearby_comment_media cm ON c.commentid = cm.commentid
      WHERE c.postid IN (?)
      GROUP BY c.postid, c.commentid
      ORDER BY c.created_at ASC;
    `;
  }

  const queryParams = groupId ? [groupId, postIds] : [postIds];

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching batch comments:', err);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    const commentsData = {};
    results.forEach((row) => {
      if (!commentsData[row.postid]) {
        commentsData[row.postid] = { comments: [], commentCount: 0 };
      }

      const comment = {
        commentId: row.commentid,
        content: row.content,
        createdAt: row.created_at,
        editedAt: row.editedAt,
        userId: row.userid,
        userName: row.username,
        fullname: `${row.firstname} ${row.lastname}`,
        profilePicture: row.profile_picture,
        media: JSON.parse(row.media) || [],
        parentCommentId: row.parent_comment_id,
        replies: []
      };

      if (comment.parentCommentId) {
        const parentComment = commentsData[row.postid]?.comments.find(
          (parentComment) => parentComment.commentId === comment.parentCommentId
        );

        if (parentComment) {
          parentComment.replies.push(comment);
        }
      } else {
        commentsData[row.postid].comments.push(comment);
      }

      commentsData[row.postid].commentCount += 1;
    });

    res.status(200).json(commentsData);
  });
});



// Like a comment
app.post('/api/likeComment', (req, res) => {
  const { commentId } = req.body;
  const userId = req.session.user.id; // Get userId safely from session

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  db.query(
    'INSERT IGNORE INTO nearby_comment_likes (commentid, userid) VALUES (?, ?)',
    [commentId, userId],
    (err, result) => {
      if (err) {
        console.error('Error liking comment:', err);
        return res.status(500).json({ success: false, error: 'Something went wrong.' });
      }

      res.json({ success: true });
    }
  );
});
// Unlike a comment
app.post('/api/unlikeComment', (req, res) => {
  const { commentId } = req.body;
  const userId = req.session.user.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  db.query(
    'DELETE FROM nearby_comment_likes WHERE commentid = ? AND userid = ?',
    [commentId, userId],
    (err, result) => {
      if (err) {
        console.error('Error unliking comment:', err);
        return res.status(500).json({ success: false, error: 'Something went wrong.' });
      }

      res.json({ success: true });
    }
  );
});

// Fetch like counts and user like status
app.post('/api/getCommentLikes', (req, res) => {
  const { postIds } = req.body;
  const userId = req.session.user?.id || -1;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Post IDs are required' });
  }

  const likeCountQuery = `
    SELECT 
      c.postid,
      c.commentid,
      COUNT(l.userid) AS likeCount,
      IF(SUM(CASE WHEN l.userid = ? THEN 1 ELSE 0 END) > 0, 1, 0) AS likedByUser
    FROM 
      nearby_post_comments AS c
    LEFT JOIN 
      nearby_comment_likes AS l 
    ON 
      c.commentid = l.commentid
    WHERE 
      c.postid IN (?)
    GROUP BY 
      c.postid, c.commentid
  `;

  db.query(likeCountQuery, [userId, postIds], (err, results) => {
    if (err) {
      console.error('Error fetching batch comment likes:', err);
      return res.status(500).json({ success: false, error: 'Something went wrong.' });
    }

    // Organize the likes by postId
    const likesByPostId = {};
    results.forEach((row) => {
      if (!likesByPostId[row.postid]) {
        likesByPostId[row.postid] = [];
      }

      likesByPostId[row.postid].push({
        commentId: row.commentid,
        likeCount: row.likeCount,
        likedByUser: row.likedByUser === 1,
      });
    });

    res.json({ success: true, data: likesByPostId });
  });
});

//GROUPS API
// Create a new group
app.post('/api/createGroup', (req, res) => {
  const { group_name, description } = req.body;

  // Ensure the user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  // Validate input fields
  if (!group_name || !description) {
    return res.status(400).json({ error: 'Group name and description are required' });
  }

  // Insert the new group into the database
  const createGroupQuery = `
    INSERT INTO nearby_groups (group_name, created_by, description)
    VALUES (?, ?, ?)`;

  db.query(createGroupQuery, [group_name, userId, description], (err, result) => {
    if (err) {
      console.error('Error inserting group into database:', err);
      return res.status(500).json({ error: 'Failed to create group' });
    }

    const groupId = result.insertId;

    // Automatically add the creator as a member of the group
    const addMemberQuery = `
      INSERT INTO nearby_group_members (user_id, group_id)
      VALUES (?, ?)`;

    db.query(addMemberQuery, [userId, groupId], (err) => {
      if (err) {
        console.error('Error adding creator as group member:', err);
        return res.status(500).json({ error: 'Group created but failed to add creator as member' });
      }

      res.status(201).json({
        message: 'Group created successfully',
        groupId: groupId
      });
    });
  });
});

//  Fetch all groups
// Assuming you're using Express.js
app.get('/api/getGroups', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  // Query to get groups the user is part of (based on the `created_by` field or some other relation)
  const query = `SELECT groupid, group_name, description FROM nearby_groups`;

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching groups:', err);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    res.json({ groups: result });
  });
});
//ADD USER TO GROUP
app.post('/api/joinGroup', (req, res) => {
  const { group_id } = req.body;

  // Ensure the user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  // Validate the group_id
  if (!group_id) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  // Add the user to the group (this will depend on your DB structure)
  const query = `INSERT INTO nearby_group_members (user_id, group_id) VALUES (?, ?)`;
  db.query(query, [userId, group_id], (err, result) => {
    if (err) {
      console.error('Error joining group:', err);
      return res.status(500).json({ error: 'Failed to join the group' });
    }

    res.status(200).json({ message: 'Successfully joined the group' });
  });
});
//GET GROUPS FOR USER
app.get('/api/getUserGroups', (req, res) => {
  // Ensure the user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  // Query to get the groups that the user is a member of
  const query = `
    SELECT g.groupid, g.group_name, g.description 
    FROM nearby_groups g
    JOIN nearby_group_members gm ON gm.group_id = g.groupid
    WHERE gm.user_id = ?;
  `;

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching user groups:', err);
      return res.status(500).json({ error: 'Failed to fetch user groups' });
    }

    res.status(200).json(result);  // Send the list of groups as the response
  });
});

//Member count
// Get member count for a group
// Get member count for a specific group
app.get('/api/groupMemberCount/:groupId', (req, res) => {
  const groupId = req.params.groupId;

  const query = `SELECT COUNT(*) AS memberCount FROM nearby_group_members WHERE group_id = ?`;

  db.query(query, [groupId], (err, result) => {
    if (err) {
      console.error('Error fetching member count:', err);
      return res.status(500).json({ error: 'Failed to get member count' });
    }

    res.json({ memberCount: result[0].memberCount });
  });
});

// Assuming you're adding this in your server.js file directly

app.get('/api/getGroup/:groupId', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const { groupId } = req.params;
  const userId = req.session.user.id;

  // Get group details regardless of user role
  db.query(
    `SELECT * FROM nearby_groups WHERE groupid = ?`,
    [groupId],
    (err, results) => {
      if (err) {
        console.error('Error fetching group:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const group = results[0];
      const isAdmin = group.created_by === userId;

      // Count group members
      db.query(
        `SELECT COUNT(*) AS memberCount FROM nearby_group_members WHERE group_id = ?`,
        [groupId],
        (err, result) => {
          if (err) {
            console.error('Error fetching member count:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            group_name: group.group_name,
            description: group.description,
            isAdmin,
            groupId: group.groupid,
            memberCount: result[0].memberCount,
          });
        }
      );
    }
  );
});



//Create a new group post

// Create a post in a group
// Create a post in a group
app.post('/api/creategrouppost/:groupId/post', upload.array('media', 10), (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const { groupId } = req.params; // Get the group ID from URL
  const { content } = req.body;  // Get the content of the post
  const userId = req.session.user.id; // Get the logged-in user's ID

  if (!content && req.files.length === 0) {
    return res.status(400).json({ error: 'Content or media is required' });
  }

  // Check if the user is a member of the group
  db.query('SELECT * FROM nearby_group_members WHERE user_id = ? AND group_id = ?', [userId, groupId], (err, results) => {
    if (err) {
      console.error('Error checking if user is in group:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: 'You must be a member of the group to post' });
    }

    // Insert the post into the nearby_group_posts table
    const queryPost = `INSERT INTO nearby_group_posts (group_id, user_id, content) VALUES (?, ?, ?)`;
    db.query(queryPost, [groupId, userId, content], (err, result) => {
      if (err) {
        console.error('Error inserting post into database:', err);
        return res.status(500).json({ error: 'Failed to create post' });
      }

      const postId = result.insertId; // Get the post ID from the inserted post

      // If media files exist, insert them into the nearby_grouppost_media table
      if (req.files.length > 0) {
        let insertErrors = false;
        let insertCount = 0;

        req.files.forEach((file, index) => {
          const mediaType = file.mimetype.startsWith('image') ? 'image' : (file.mimetype.startsWith('video') ? 'video' : '');
          const mediaUrl = `/uploads/${file.filename}`;

          // Insert media into nearby_grouppost_media
          const queryMedia = `INSERT INTO nearby_grouppost_media (post_id, media_url, media_type) VALUES (?, ?, ?)`;
          db.query(queryMedia, [postId, mediaUrl, mediaType], (err, result) => {
            if (err) {
              insertErrors = true;
              console.error('Error inserting media into database:', err);
            }

            insertCount++;

            // When all media files have been processed
            if (insertCount === req.files.length) {
              if (insertErrors) {
                return res.status(500).json({ error: 'Failed to insert some media' });
              } else {
                return res.status(201).json({ message: 'Post with media created successfully' });
              }
            }
          });
        });
      } else {
        return res.status(201).json({ message: 'Post created successfully' });
      }
    });
  });
});


// Check if a user is a member of a group
app.post('/api/checkMembership', (req, res) => {
  const { group_id } = req.body;

  // Ensure the user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  // Validate the group_id
  if (!group_id) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  // Check if the user is a member of the group
  const query = `SELECT * FROM nearby_group_members WHERE user_id = ? AND group_id = ?`;
  db.query(query, [userId, group_id], (err, result) => {
    if (err) {
      console.error('Error checking membership:', err);
      return res.status(500).json({ error: 'Failed to check membership' });
    }

    if (result.length > 0) {
      // User is a member of the group
      return res.status(200).json({ isMember: true });
    } else {
      // User is not a member of the group
      return res.status(200).json({ isMember: false });
    }
  });
});



// Listen to client connections and manage rooms
io.on('connection', (socket) => {
 //console.log('a user connected');

  // Join the post's room so that the client can receive comments in real-time
  socket.on('joinPostRoom', (postId) => {
    socket.join(postId); // Join a room for the specific post
   //console.log(`Socket joined room: ${postId}`);
  });

  socket.on('disconnect', () => {
    //console.log('user disconnected');
  });
});

// Start server
const port = 5000;
server.listen(port, () => {
  console.log(`Server with WebSocket is running on http://localhost:${port}`);
});