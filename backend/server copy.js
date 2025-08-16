import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const MySQLStore = require('express-mysql-session')(session);
import https from 'https';
import express from 'express';

import cors from 'cors';
import bcrypt from 'bcrypt';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import xss from 'xss';
import sanitizeHtml from 'sanitize-html';
import dotenv from 'dotenv';
import pool, { withConnection } from './dbpool.js';
import mime from 'mime';
import { fileURLToPath } from 'url';
dotenv.config();
// For asynchronous, promise-based file operations in your routes (e.g., mkdir, unlink)
const fsPromises = fs.promises;
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "https://localhost:5173",
  credentials: true,
}));
// Workaround for __dirname in ES modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Setup express app


// HTTPS options (use correct relative path or absolute)
const httpsOptions = {
  key: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '../certs/localhost.pem')),
};



// Add WebSocket Server
const httpsServer = https.createServer(httpsOptions, app);
const io = new Server(httpsServer, {
  cors: {
    origin: "https://localhost:5173",
    credentials: true,
  },
});

// ✅ Attach io to app so it’s accessible in routes via req.app.get('io')
app.set('io', io);




// Finally, start the HTTPS server
httpsServer.listen(5000, () => {
  console.log("Backend HTTPS server running on https://localhost:5000");
});

////
////
////

// Middleware
const sessionStore = new MySQLStore({}, pool); // Reuse your existing MySQL pool

const sessionMiddleware = session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'none'
  }
});

app.use(sessionMiddleware);




function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => (err ? reject(err) : resolve(conn)));
  });
}

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to database via pool!");
    conn.release();
  } catch (err) {
    console.error("Database pool connection failed:", err);
  }
}
testConnection();



await withConnection(async (conn) => {
  const [rows] = await conn.query('SELECT 1');
  console.log(rows);
});




// -------------------FILE STORAGE SETUP------------

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



// New multer storage for profile pictures (using the existing uploads directory)
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a separate folder for profile pictures
    const profilePicDir = path.join(uploadDir, 'profile_pictures');

    if (!fs.existsSync(profilePicDir)) {
      fs.mkdirSync(profilePicDir, { recursive: true });
    }

    cb(null, profilePicDir);  // Store profile pictures in the profile_pictures folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Create a multer instance for handling profile picture uploads
const uploadProfilePicture = multer({
  storage: profilePicStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for profile picture
});

// event Media storage
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {

    const eventMediaDir = path.join(uploadDir, 'event_media');

    if (!fs.existsSync(eventMediaDir)) {
      fs.mkdirSync(eventMediaDir, { recursive: true });
    }

    cb(null, eventMediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `event-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Create a multer instance for handling profile picture uploads
const uploadEventMedia = multer({
  storage: eventStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for profile picture
});


const questionsImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const questionsImagesDir = path.join(uploadDir, 'questions_images');
    if (!fs.existsSync(questionsImagesDir)) {
      fs.mkdirSync(questionsImagesDir, { recursive: true });
    }
    cb(null, questionsImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `question-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
// Create a multer instance for handling question images
const uploadQuestionImages = multer({
  storage: questionsImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for question images
});

const questionsAnswerImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const questionsAnswerImagesDir = path.join(uploadDir, 'questions_answer_images');
    if (!fs.existsSync(questionsAnswerImagesDir)) {
      fs.mkdirSync(questionsAnswerImagesDir, { recursive: true });
    }
    cb(null, questionsAnswerImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `answer-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
// Create a multer instance for handling question answer images 
const uploadQuestionAnswerImages = multer({
  storage: questionsAnswerImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for question answer images
});

//Product image Path
const productImagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productImagesDir = path.join(uploadDir, 'product_images');
    if (!fs.existsSync(productImagesDir)) {
      fs.mkdirSync(productImagesDir, { recursive: true });
    }
    cb(null, productImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadProductImages = multer({
  storage: productImagesStorage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB limit per file
});

//profile banner upload route
// New multer storage for profile banner images
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bannerDir = path.join(uploadDir, 'profile_banners');

    if (!fs.existsSync(bannerDir)) {
      fs.mkdirSync(bannerDir, { recursive: true });
    }

    cb(null, bannerDir); // Store banner images in the profile_banners folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `banner-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

//Storage for all Message media

const messageMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaDir = path.join(uploadDir, 'message_media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `media-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadMessageMedia = multer({
  storage: messageMediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB limit per file
});


// Create a multer instance for handling banner image uploads
const uploadBannerImage = multer({
  storage: bannerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for banner image
});

//Alert storage
const alertStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const alertDir = path.join(uploadDir, 'alerts_images');

    if (!fs.existsSync(alertDir)) {
      fs.mkdirSync(alertDir, { recursive: true });
    }

    cb(null, alertDir); // Store alert images in the alerts folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `alert-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
// Create a multer instance for handling alert image uploads
const uploadAlertImage = multer({
  storage: alertStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for alert image
});



const tipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tipDir = path.join(uploadDir, 'tip_media');
    if (!fs.existsSync(tipDir)) {
      fs.mkdirSync(tipDir, { recursive: true });
    }
    cb(null, tipDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `tip-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadTipMedia = multer({
  storage: tipStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

//Media storage for Discussion post type
const discussionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tipDir = path.join(uploadDir, 'discussion_media');
    if (!fs.existsSync(tipDir)) {
      fs.mkdirSync(tipDir, { recursive: true });
    }
    cb(null, tipDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `discussion-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadDiscussionMedia = multer({
  storage: discussionStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});


//handle Group post media
const groupPostStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const groupDir = path.join(uploadDir, 'group_media');
    if (!fs.existsSync(groupDir)) {
      fs.mkdirSync(groupDir, { recursive: true });
    }
    cb(null, groupDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `group-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadGroupMedia = multer({
  storage: groupPostStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

//DELETE UPLOADS FROM SERVER
//Delete tip, alert and question post  images
const UPLOADS_BASE_DIR = path.join(__dirname, '../uploads');

const deleteFilesFromServer = (urls) => {
  urls.forEach(url => {
    // Ensure the URL starts with '/uploads/' as expected from your DB storage
    if (!url || !url.startsWith('/uploads/')) {
      console.warn(`Skipping deletion for invalid URL: ${url}. Expected it to start with /uploads/`);
      return;
    }

    // Get the path relative to the 'uploads' directory (e.g., 'tip_media/some_file.jpg')
    const relativePath = url.substring('/uploads/'.length);

    // Construct the full absolute file path on the server's disk
    const filePath = path.join(UPLOADS_BASE_DIR, relativePath);

    console.log(`[DEBUG] Attempting to delete file from disk: ${filePath}`); // Crucial debug log

    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`[ERROR] Failed to delete file ${filePath} from server:`, unlinkErr);
        // Check if the error is "No such file or directory"
        if (unlinkErr.code === 'ENOENT') {
          console.error(`[INFO] File not found at path: ${filePath}. It might have been deleted already or the path is incorrect.`);
        }
      } else {
        console.log(`[SUCCESS] Successfully deleted file from server: ${filePath}`);
      }
    });
  });
};



const BusinessMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a separate folder for profile pictures
    const businessMediaDir = path.join(uploadDir, 'business_media');

    if (!fs.existsSync(businessMediaDir)) {
      fs.mkdirSync(businessMediaDir, { recursive: true });
    }

    cb(null, businessMediaDir);  // Store profile pictures in the profile_pictures folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `business-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Create a multer instance for handling profile picture uploads
const uploadBusinessMedia = multer({
  storage: BusinessMediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB for profile picture
});




//-----END OF FILE STORAGE AND DELETION

function getMySQLDatetime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return (
    now.getFullYear() +
    "-" +
    pad(now.getMonth() + 1) +
    "-" +
    pad(now.getDate()) +
    " " +
    pad(now.getHours()) +
    ":" +
    pad(now.getMinutes()) +
    ":" +
    pad(now.getSeconds())
  );
}


const notifyUnreadCount = (recipientId) => {
  const query = `
    SELECT COUNT(*) AS unread_count
    FROM nearby_message
    WHERE recipient_id = ?
      AND recipient_type = 'user'
      AND read_at IS NULL
  `;

  pool.getConnection((err, connection) => {
    if (err) return console.error('Error getting connection:', err);

    connection.query(query, [recipientId], (error, results) => {
      connection.release();

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      const unreadCount = results[0]?.unread_count || 0;

      // Emit to the user’s notification room
      io.to(`business_notifications:${recipientId}`).emit('unread_count_updated', {
        unread_count: unreadCount,
      });
    });
  });
};







// Socket.io setup
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});


// WebSocket connection logic
io.on("connection", (socket) => {
  const session = socket.request.session;

  if (session?.user?.id) {
    const userId = session.user.id;
    socket.join(`user_${userId}`);
    //console.log(`✅ Socket ${socket.id} joined room user_${userId}`);
  } else {
    console.warn(`❌ No session user found for socket ${socket.id}`);
  }

  // ✅ Handle room joins
  socket.on("join", (roomName) => {
    socket.join(roomName);
    console.log(`✅ Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on("leave", (roomName) => {
    socket.leave(roomName);
    console.log(`🚪 Socket ${socket.id} left room: ${roomName}`);
  });

  socket.on("new-comment", (data) => {
    socket.broadcast.emit("receive-comment", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});



io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join a default room for private messaging if needed, or handle on a per-conversation basis
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("sendMessage", async ({ from, to, text, roomId, replyToMessageId = null, productId = null }) => {
    const safeContent = xss(text);
    const isProductMessage = !!productId;

    try {
      await withConnection(async (connection) => {
        const insertQuery = isProductMessage
          ? `
                        INSERT INTO nearby_message (room_id, sender_id, recipient_id, text, reply_to_message_id, product_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                      `
          : `
                        INSERT INTO nearby_message (room_id, sender_id, recipient_id, text, reply_to_message_id)
                        VALUES (?, ?, ?, ?, ?)
                      `;

        const params = isProductMessage
          ? [roomId, from, to, safeContent, replyToMessageId, productId]
          : [roomId, from, to, safeContent, replyToMessageId];

        const [result] = await connection.query(insertQuery, params);

        const message = {
          message_id: result.insertId,
          from,
          to,
          text: safeContent,
          created_at: new Date().toISOString(), // Use server time for consistency
          replyToMessageId,
          product_id: productId || null,
          room_id: roomId,
          reactions: [] // Initialize empty, reactions are fetched separately
        };

        io.to(roomId).emit("receiveMessage", message);

        // Emit to the recipient only so they can update unread count in real time
        io.to(to.toString()).emit("newUnreadMessage", {
          roomId: roomId,
          lastMessageTime: message.created_at,
        });
        notifyUnreadCount(to);
      });
    } catch (err) {
      console.error("Error handling sendMessage:", err);
      // Optionally emit an error back to the sender
      socket.emit("messageError", { error: "Failed to send message." });
    }
  });



  socket.on("typing", ({ roomId, userId, isTyping }) => {
    socket.to(roomId).emit("userTyping", { userId, isTyping });
  });

  socket.on("markMessagesAsRead", async ({ userId, roomId }) => {
    try {
      await withConnection(async (connection) => {
        const query = `
                    UPDATE nearby_message
                    SET read_at = NOW()
                    WHERE recipient_id = ? AND room_id = ? AND read_at IS NULL
                `;
        const [result] = await connection.query(query, [userId, roomId]);

        // console.log(`Marked ${result.affectedRows} messages as read for user ${userId} in room ${roomId}`);

        io.to(userId.toString()).emit("unreadCountUpdated", { roomId });
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
      // Optionally handle error for the client
    }
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
  });

  socket.on("sendReaction", async ({ messageId, userId, emoji, roomId }) => {
    try {
      await withConnection(async (connection) => {
        const insertReaction = `
                    INSERT INTO nearby_message_reactions (message_id, user_id, emoji)
                    VALUES (?, ?, ?)
                `;
        await connection.query(insertReaction, [messageId, userId, emoji]);

        // console.log(`Broadcasting messageReaction to room ${roomId}`, { messageId, userId, emoji });

        io.to(roomId).emit("messageReaction", {
          messageId,
          userId,
          emoji
        });
      });
    } catch (err) {
      console.error("Error saving reaction:", err);
      // Optionally handle error for the client
    }
  });

  socket.on("removeReaction", async ({ messageId, userId, emoji, roomId }) => {
    try {
      await withConnection(async (connection) => {
        const deleteQuery = `
                    DELETE FROM nearby_message_reactions
                    WHERE message_id = ? AND user_id = ? AND emoji = ?
                `;
        await connection.query(deleteQuery, [messageId, userId, emoji]);

        io.to(roomId).emit("messageReactionRemoved", {
          messageId,
          userId,
          emoji,
        });
      });
    } catch (err) {
      console.error("Error removing reaction:", err);
      // Optionally handle error for the client
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


/**
 * POST /api/register
 * Handles user registration with all multi-step form data,
 * including optional profile picture upload, occupation, and location.
 * Uses `multer` middleware for file uploads.
 */

app.post("/api/register", uploadProfilePicture.single('profile_picture'), async (req, res) => {
  // console.log('--- Received Registration Request ---');
  //  console.log('req.body:', req.body);
  // console.log('req.file:', req.file);
  // console.log('-----------------------------------');

  const {
    username, email, password, confirmPassword, firstname, lastname, occupation, latitude, longitude, address, // <-- Add 'address' here
  } = req.body;

  const profilePicturePath = req.file ? `/uploads/profile_pictures/${req.file.filename}` : null;

  try {
    // Add 'address' to the validation check
    if (!username || !email || !password || !confirmPassword || !firstname || !lastname || !occupation || !latitude || !longitude || !address) {
      if (req.file) {
        await fsPromises.unlink(req.file.path).catch(unlinkErr => console.error("Error deleting uploaded file:", unlinkErr));
      }
      return res.status(400).json({ error: "All required fields are required." });
    }

    if (password !== confirmPassword) {
      if (req.file) {
        await fsPromises.unlink(req.file.path).catch(unlinkErr => console.error("Error deleting uploaded file:", unlinkErr));
      }
      return res.status(400).json({ error: "Passwords do not match" });
    }



    await withConnection(async (connection) => {
      const [existingUsers] = await connection.query(
        "SELECT userid FROM nearby_users WHERE username = ? OR email = ?",
        [username, email]
      );

      if (existingUsers.length > 0) {
        if (req.file) {
          await fsPromises.unlink(req.file.path).catch(unlinkErr => console.error("Error deleting uploaded file:", unlinkErr));
        }
        return res.status(409).json({ error: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [insertResult] = await connection.query(
        `INSERT INTO nearby_users
          (username, email, password, firstname, lastname, occupation, profile_picture, latitude, longitude, address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // <-- Add 'address' placeholder here
        [
          username,
          email,
          hashedPassword,
          firstname,
          lastname,
          occupation,
          profilePicturePath,
          parseFloat(latitude),
          parseFloat(longitude),
          address // <-- Add 'address' value here
        ]
      );

      const newUserId = insertResult.insertId;

      const [users] = await connection.query('SELECT * FROM nearby_users WHERE userid = ?', [newUserId]);

      if (users.length === 0) {
        throw new Error('Newly registered user not found immediately after insert.');
      }

      const newUser = users[0];

      // --- Create Session for the newly registered user ---
      req.session.user = {
        id: newUser.userid,
        username: newUser.username,
        email: newUser.email,
        name: `${newUser.firstname} ${newUser.lastname}`,
        profilePic: newUser.profile_picture || null,
        location: newUser.address || null, // <-- Use newUser.address for location in session
        bio: newUser.bio || null,
        latitude: newUser.latitude || null,
        longitude: newUser.longitude || null,
      };
      req.session.userId = newUser.id;
      // *** Explicitly save the session after modification (optional but helpful for debugging) ***
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after registration:', err);
          return res.status(500).json({ error: 'Failed to create session after registration.' });
        }
        // console.log('Session created successfully for new user:', req.session.user.username);
        // Send success response AFTER session is saved
        res.status(201).json({ message: "User registered successfully", user: req.session.user });
      });
    });

  } catch (err) {
    console.error("Registration error:", err);
    if (req.file) {
      await fsPromises.unlink(req.file.path).catch(unlinkErr => console.error("Error deleting uploaded file during error handling:", unlinkErr));
    }
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error during registration." });
    }
  }
});





// Endpoint to check if a username already exists

app.get("/api/check-username", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Username query parameter is required." });
  }

  try {
    const exists = await withConnection(async (connection) => {
      const [existingUsers] = await connection.query(
        "SELECT userid FROM nearby_users WHERE username = ?",
        [username]
      );
      return existingUsers.length > 0;
    });
    res.json({ exists });
  } catch (err) {
    console.error("Error checking username:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error during username check." });
    }
  }
});

// Endpoint to check if an email already exists
app.get("/api/check-email", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required." });
  }

  try {
    const exists = await withConnection(async (connection) => {
      const [existingUsers] = await connection.query(
        "SELECT userid FROM nearby_users WHERE email = ?",
        [email]
      );
      return existingUsers.length > 0;
    });
    res.json({ exists });
  } catch (err) {
    console.error("Error checking email:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error during email check." });
    }
  }
});




// Login endpoint with session management
// --- EXISTING Login Endpoint (using withConnection) ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const loginResult = await withConnection(async (connection) => {
      const [users] = await connection.query('SELECT * FROM nearby_users WHERE email = ?', [email]);

      if (users.length === 0) {
        return { status: 401, error: 'Invalid email or password' };
      }

      const user = users[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return { status: 401, error: 'Invalid email or password' };
      }

      // Prepare session user object
      const sessionUser = {
        id: user.userid,
        username: user.username,
        email: user.email,
        name: `${user.firstname} ${user.lastname}`,
        profilePic: user.profile_picture || null,
        location: user.address || null,
        bio: user.bio || null,
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        type: 'user',
      };

      // Set session after successful login
      req.session.user = sessionUser;

      return { status: 200, message: 'Login successful', user: sessionUser };
    });

    // Send response based on loginResult
    if (loginResult.status === 200) {
      res.json({ message: loginResult.message, user: loginResult.user });
    } else {
      res.status(loginResult.status).json({ error: loginResult.error });
    }

  } catch (err) {
    console.error("Login error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});




// Check if the user is logged in
app.get('/api/session', (req, res) => {
  // console.log('Accessing /api/session. req.session:', req.session); // More verbose logging
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.status(401).json({ error: 'Not logged in' });
});

app.post('/api/logout', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log out' });
  }
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
  //console.log('Request body:', { content, postId, groupId, parentCommentId });

  // Sanitize the content to prevent XSS
  const safeContent = xss(content);
  // console.log('Sanitized content:', safeContent);

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
    postTable = 'nearby_group_posts';
    postColumn = 'post_id';
  } else {
    // For global posts
    queryComment = `INSERT INTO nearby_post_comments (postid, userid, content, parent_comment_id) VALUES (?, ?, ?, ?)`; // ✅ use correct table
    mediaTable = 'nearby_comment_media';
    postTable = 'nearby_posts';
    postColumn = 'postid';
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
    const queryParams = groupId
      ? [postId, userId, safeContent, groupId || null, parentCommentId || null]
      : [postId, userId, safeContent, parentCommentId || null];

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
          // console.log(`Media upload progress: ${completed}/${files.length}`);
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
  const sessionUserId = req.session.user?.id;   // logged-in user
  const { includeReactions, groupId, userId: userFilter } = req.query;

  const isUserOnly = Boolean(userFilter);

  let queryParams = [];
  let query = '';

  if (isUserOnly) {
    // 1) PROFILE PAGE: fetch only posts by userFilter, exclude blocked relations
    queryParams = [userFilter, sessionUserId, sessionUserId];
    query = `
      SELECT p.postid AS postId,
             p.content,
             p.created_at,
             u.username,
             u.firstname,
             u.lastname,
             u.profile_picture,
             m.media_url,
             m.media_type,
             (SELECT COUNT(*) FROM nearby_post_reactions WHERE postid = p.postid) AS like_count,
             false AS isGroupPost,
             u.userid AS userId
      FROM nearby_posts p
      INNER JOIN nearby_users u ON p.userid = u.userid
      LEFT JOIN nearby_post_media m ON p.postid = m.postid
      WHERE p.userid = ?
        AND u.userid NOT IN (
          SELECT blocked_id FROM nearby_blocked_users WHERE blocker_id = ?
        )
        AND u.userid NOT IN (
          SELECT blocker_id FROM nearby_blocked_users WHERE blocked_id = ?
        )
      ORDER BY p.created_at DESC
    `;

    // If also want user’s group posts when groupId is present:
    if (groupId) {
      queryParams = [sessionUserId, groupId, sessionUserId, sessionUserId];
      query = `
        SELECT p.post_id AS postId,
               p.content,
               p.created_at,
               u.username,
               u.firstname,
               u.lastname,
               u.profile_picture,
               m.media_url,
               m.media_type,
               (SELECT COUNT(*) FROM nearby_group_post_reactions WHERE post_id = p.post_id) AS like_count,
               r.emoji,
               true AS isGroupPost,
               u.userid AS userId
        FROM nearby_group_posts p
        INNER JOIN nearby_users u ON p.user_id = u.userid
        LEFT JOIN nearby_grouppost_media m ON p.post_id = m.post_id
        LEFT JOIN nearby_group_post_reactions r 
          ON p.post_id = r.post_id AND r.user_id = ?
        WHERE p.group_id = ?
          AND u.userid NOT IN (
            SELECT blocked_id FROM nearby_blocked_users WHERE blocker_id = ?
          )
          AND u.userid NOT IN (
            SELECT blocker_id FROM nearby_blocked_users WHERE blocked_id = ?
          )
        ORDER BY p.created_at DESC
      `;
      // queryParams = [sessionUserId (r.user_id), groupId, sessionUserId, sessionUserId]
    }

  } else if (groupId) {
    // 2) GROUP PAGE: exclude blocked relations
    queryParams = [sessionUserId, groupId, sessionUserId, sessionUserId];
    query = `
      SELECT p.post_id AS postId,
             p.content,
             p.created_at,
             u.username,
             u.firstname,
             u.lastname,
             u.profile_picture,
             m.media_url,
             m.media_type,
             (SELECT COUNT(*) FROM nearby_group_post_reactions WHERE post_id = p.post_id) AS like_count,
             r.emoji,
             true AS isGroupPost,
             u.userid AS userId
      FROM nearby_group_posts p
      INNER JOIN nearby_users u ON p.user_id = u.userid
      LEFT JOIN nearby_grouppost_media m ON p.post_id = m.post_id
      LEFT JOIN nearby_group_post_reactions r 
        ON p.post_id = r.post_id AND r.user_id = ?
      WHERE p.group_id = ?
        AND u.userid NOT IN (
          SELECT blocked_id FROM nearby_blocked_users WHERE blocker_id = ?
        )
        AND u.userid NOT IN (
          SELECT blocker_id FROM nearby_blocked_users WHERE blocked_id = ?
        )
      ORDER BY p.created_at DESC
    `;

  } else {
    // 3) GLOBAL FEED: exclude blocked relations
    queryParams = [sessionUserId, sessionUserId, sessionUserId];
    query = `
      SELECT p.postid AS postId,
             p.content,
             p.created_at,
             u.username,
             u.firstname,
             u.lastname,
             u.profile_picture,
             m.media_url,
             m.media_type,
             (SELECT COUNT(*) FROM nearby_post_reactions WHERE postid = p.postid) AS like_count,
             r.emoji,
             false AS isGroupPost,
             u.userid AS userId
      FROM nearby_posts p
      INNER JOIN nearby_users u ON p.userid = u.userid
      LEFT JOIN nearby_post_media m ON p.postid = m.postid
      LEFT JOIN nearby_post_reactions r 
        ON p.postid = r.postid AND r.userid = ?
      WHERE u.userid NOT IN (
        SELECT blocked_id FROM nearby_blocked_users WHERE blocker_id = ?
      )
      AND u.userid NOT IN (
        SELECT blocker_id FROM nearby_blocked_users WHERE blocked_id = ?
      )
      ORDER BY p.created_at DESC
    `;
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching posts:', err);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    const posts = [];
    let currentPost = null;

    results.forEach(post => {
      if (!currentPost || currentPost.postId !== post.postId) {
        if (currentPost) posts.push(currentPost);
        currentPost = {
          postId: post.postId,
          content: post.content,
          createdAt: post.created_at,
          user: {
            username: post.username,
            fullName: `${post.firstname} ${post.lastname}`,
            profilePicture: post.profile_picture,
            userId: post.userId
          },
          media: [],
          likeCount: post.like_count,
          isGroupPost: post.isGroupPost,
        };
      }
      if (post.media_url) {
        currentPost.media.push({
          mediaUrl: post.media_url,
          mediaType: post.media_type,
        });
      }
      if (includeReactions === 'true' && post.emoji) {
        currentPost.reaction = post.emoji;
      }
    });

    if (currentPost) posts.push(currentPost);
    res.json(posts);
  });
});



//dELETE ALL POSTS
// Post deletion API
app.delete('/api/deletePost/:postId', (req, res) => {
  const { postId } = req.params;
  const userId = req.session.user?.id;
  const { groupId } = req.query;

  if (!userId) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const checkQuery = groupId
    ? `SELECT * FROM nearby_group_posts WHERE post_id = ? AND user_id = ? AND group_id = ?`
    : `SELECT * FROM nearby_posts WHERE postid = ? AND userid = ?`;

  db.query(checkQuery, [postId, userId, groupId].filter(Boolean), (err, result) => {
    if (err) return res.status(500).json({ error: 'Error checking post ownership' });
    if (result.length === 0) return res.status(403).json({ error: 'Unauthorized to delete this post' });

    const deleteMediaQuery = groupId
      ? `DELETE FROM nearby_grouppost_media WHERE post_id = ?`
      : `DELETE FROM nearby_post_media WHERE postid = ?`;

    db.query(deleteMediaQuery, [postId], (mediaErr) => {
      if (mediaErr) return res.status(500).json({ error: 'Failed to delete media' });

      // Delete replies first
      // Delete replies first
      // Delete replies (comments with parent_comment_id NOT NULL)
      const deleteRepliesQuery = groupId
        ? `DELETE FROM nearby_group_comments WHERE post_id = ? AND parent_comment_id IS NOT NULL`
        : `DELETE FROM nearby_post_comments WHERE postid = ? AND parent_comment_id IS NOT NULL`;



      db.query(deleteRepliesQuery, [postId], (repliesErr) => {
        if (repliesErr) return res.status(500).json({ error: 'Failed to delete replies' });

        // Delete comments
        const deleteCommentsQuery = groupId
          ? `DELETE FROM nearby_group_comments WHERE post_id = ?`
          : `DELETE FROM nearby_post_comments WHERE postid = ?`;

        db.query(deleteCommentsQuery, [postId], (commentsErr) => {
          if (commentsErr) return res.status(500).json({ error: 'Failed to delete comments' });

          // Delete post
          const deletePostQuery = groupId
            ? `DELETE FROM nearby_group_posts WHERE post_id = ?`
            : `DELETE FROM nearby_posts WHERE postid = ?`;

          db.query(deletePostQuery, [postId], (deleteErr) => {
            if (deleteErr) return res.status(500).json({ error: 'Failed to delete post' });

            io.to(postId).emit('postDeleted', { postId, groupId });
            return res.status(200).json({ message: 'Post and related content deleted successfully' });
          });
        });
      });
    });
  });
});


//Create post API

app.post('/api/createPost', upload.array('media'), (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const content = xss(req.body.content || '');
  const files = req.files;

  // Insert post content
  const insertPostQuery = `
    INSERT INTO nearby_posts (userid, content, created_at)
    VALUES (?, ?, NOW())
  `;

  db.query(insertPostQuery, [userId, content], (err, result) => {
    if (err) {
      console.error('Error inserting post:', err);
      return res.status(500).json({ error: 'Failed to create post' });
    }

    const postId = result.insertId;

    if (!files || files.length === 0) {
      // No media files, return basic post data
      return res.status(201).json({
        postId,
        content,
        createdAt: new Date().toISOString(),
        user: {
          fullName: `${user.firstname} ${user.lastname}`,
          username: user.username,
          profilePicture: user.profile_picture || null,
        },
        media: [],
        likeCount: 0,
      });
    }

    // Prepare media inserts
    const mediaInserts = files.map(file => [
      postId,
      `/uploads/${file.filename}`,
      file.mimetype.startsWith('video') ? 'video' : 'image'
    ]);

    const insertMediaQuery = `
      INSERT INTO nearby_post_media (postid, media_url, media_type)
      VALUES ?
    `;

    db.query(insertMediaQuery, [mediaInserts], (err) => {
      if (err) {
        console.error('Error inserting media:', err);
        return res.status(500).json({ error: 'Failed to save media' });
      }

      res.status(201).json({
        postId,
        content,
        createdAt: new Date().toISOString(),
        user: {
          fullName: `${user.firstname} ${user.lastname}`,
          username: user.username,
          profilePicture: user.profile_picture || null,
        },
        media: mediaInserts.map(([_, url, type]) => ({
          mediaUrl: url,
          mediaType: type,
        })),
        likeCount: 0,
      });
    });
  });
});

// Route
app.put('/api/updatePost/:postId', upload.array('media'), (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const postId = req.params.postId;
  const updatedContent = xss(req.body.content || '');
  const files = req.files;
  const groupId = req.query.groupId;

  if (groupId) {
    // === Handle Group Post ===
    const updateGroupPostQuery = `
      UPDATE nearby_group_posts
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE post_id = ? AND user_id = ? AND group_id = ?
    `;

    db.query(updateGroupPostQuery, [updatedContent, postId, user.id, groupId], (err, result) => {
      if (err) {
        console.error('Error updating group post:', err);
        return res.status(500).json({ error: 'Failed to update group post' });
      }

      if (files && files.length > 0) {
        const deleteGroupMediaQuery = `DELETE FROM nearby_grouppost_media WHERE post_id = ?`;
        db.query(deleteGroupMediaQuery, [postId], (delErr) => {
          if (delErr) {
            console.error('Error deleting group post media:', delErr);
            return res.status(500).json({ error: 'Failed to delete old media' });
          }

          const mediaInserts = files.map(file => [
            postId,
            `/uploads/${file.filename}`,
            file.mimetype.startsWith('video') ? 'video' : 'image'
          ]);

          const insertGroupMediaQuery = `
            INSERT INTO nearby_grouppost_media (post_id, media_url, media_type)
            VALUES ?
          `;

          db.query(insertGroupMediaQuery, [mediaInserts], (insertErr) => {
            if (insertErr) {
              console.error('Error inserting group media:', insertErr);
              return res.status(500).json({ error: 'Failed to update group media' });
            }

            res.status(200).json({ message: 'Group post and media updated successfully' });
          });
        });
      } else {
        res.status(200).json({ message: 'Group post updated without changing media' });
      }
    });

  } else {
    // === Handle Global Post ===
    const updatePostQuery = `
      UPDATE nearby_posts
      SET content = ?
      WHERE postid = ? AND userid = ?
    `;

    db.query(updatePostQuery, [updatedContent, postId, user.id], (err, result) => {
      if (err) {
        console.error('Error updating post:', err);
        return res.status(500).json({ error: 'Failed to update post' });
      }

      if (files && files.length > 0) {
        const deleteMediaQuery = `DELETE FROM nearby_post_media WHERE postid = ?`;
        db.query(deleteMediaQuery, [postId], (delErr) => {
          if (delErr) {
            console.error('Error deleting old media:', delErr);
            return res.status(500).json({ error: 'Failed to delete old media' });
          }

          const mediaInserts = files.map(file => [
            postId,
            `/uploads/${file.filename}`,
            file.mimetype.startsWith('video') ? 'video' : 'image'
          ]);

          const insertMediaQuery = `
            INSERT INTO nearby_post_media (postid, media_url, media_type)
            VALUES ?
          `;

          db.query(insertMediaQuery, [mediaInserts], (insertErr) => {
            if (insertErr) {
              console.error('Error inserting updated media:', insertErr);
              return res.status(500).json({ error: 'Failed to update media' });
            }

            res.status(200).json({ message: 'Post and media updated successfully' });
          });
        });
      } else {
        res.status(200).json({ message: 'Post updated without changing media' });
      }
    });
  }
});

// Error handler middleware (Multer file size)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File size exceeds the 100MB limit' });
  }
  next(err); // Default error handling
});



//Edit post API
app.put('/api/editPost', upload.array('media'), (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { postId, content, groupId } = req.body;
  const sanitizedContent = xss(content);
  const files = req.files;

  const postTable = groupId ? 'nearby_group_posts' : 'nearby_posts';
  const mediaTable = groupId ? 'nearby_grouppost_media' : 'nearby_post_media';
  const postIdCol = groupId ? 'post_id' : 'postid';
  const userIdCol = groupId ? 'user_id' : 'userid';

  const updatePostQuery = `UPDATE ${postTable} SET content = ?, updated_at = NOW() WHERE ${postIdCol} = ? AND ${userIdCol} = ?`;

  db.query(updatePostQuery, [sanitizedContent, postId, user.id], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to update post' });

    if (!files || files.length === 0) {
      return res.status(200).json({ postId, content, media: [] });
    }

    // Optionally: delete old media or let front-end handle this
    const mediaInserts = files.map(file => [
      postId,
      `/uploads/${file.filename}`,
      file.mimetype.startsWith('video') ? 'video' : 'image'
    ]);

    const insertMediaQuery = `
      INSERT INTO ${mediaTable} (${postIdCol}, media_url, media_type)
      VALUES ?
    `;

    db.query(insertMediaQuery, [mediaInserts], (err2) => {
      if (err2) return res.status(500).json({ error: 'Failed to save media' });

      res.status(200).json({
        postId,
        content,
        media: mediaInserts.map(([_, url, type]) => ({ mediaUrl: url, mediaType: type }))
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
  const userId = req.session.user?.id; // Get the logged-in user's ID from the session

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
  // console.log("Multer processed files:", req.files);

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

// Add this new endpoint to your backend (e.g., app.js or routes/user.js)

app.get('/api/user/:userId/likes-summary', async (req, res) => {
  const { userId } = req.params; // The ID of the profile being viewed

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Query to get total likes for discussion/question posts by this user
    const discussionLikesQuery = `
            SELECT COUNT(nl.id) AS totalLikes
            FROM nearby_likes nl
            JOIN nearby_posts np ON nl.post_id = np.postid
            WHERE nl.post_type IN ('discussion', 'question') AND np.userId = ?;
        `;
    const [discussionLikesResult] = await connection.query(discussionLikesQuery, [userId]);
    const discussionLikes = discussionLikesResult[0].totalLikes;

    // Query to get total likes for tip posts by this user
    const tipLikesQuery = `
            SELECT COUNT(nl.id) AS totalLikes
            FROM nearby_likes nl
            JOIN nearby_tips nt ON nl.post_id = nt.id
            WHERE nl.post_type = 'tip' AND nt.user_id = ?;
        `;
    const [tipLikesResult] = await connection.query(tipLikesQuery, [userId]);
    const tipLikes = tipLikesResult[0].totalLikes;

    // Query to get total likes for alert posts by this user
    const alertLikesQuery = `
            SELECT COUNT(nl.id) AS totalLikes
            FROM nearby_likes nl
            JOIN nearby_alerts na ON nl.post_id = na.alertId
            WHERE nl.post_type = 'alert' AND na.userId = ?;
        `;
    const [alertLikesResult] = await connection.query(alertLikesQuery, [userId]);
    const alertLikes = alertLikesResult[0].totalLikes;

    // Sum all likes
    const totalUserLikes = discussionLikes + tipLikes + alertLikes;

    res.status(200).json({ totalLikes: totalUserLikes });

  } catch (err) {
    console.error(`Error fetching like summary for user ${userId}:`, err);
    res.status(500).json({ error: 'Failed to fetch like summary.' });
  } finally {
    if (connection) connection.release();
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
        likeCount: row.likeCount || 0,
        likedByUser: row.likedByUser ? row.likedByUser.split(',') : [],
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
        likeCount: row.likeCount || 0,
        likedByUser: row.likedByUser ? row.likedByUser.split(',') : [],
      }));

      return res.status(200).json({ success: true, data });
    });
  }

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



app.get('/api/user/:userId/saves-summary-excluding-own', async (req, res) => {
  const { userId } = req.params; // The ID of the profile being viewed

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Get total saves for discussion/question posts by this user, excluding their own saves
    const discussionSavesQuery = `
            SELECT COUNT(nsp.id) AS totalSaves
            FROM nearby_saved_posts nsp
            JOIN nearby_posts np ON nsp.post_id = np.postid
            WHERE np.userId = ?                  -- Post belongs to the profile user
              AND nsp.post_type IN ('discussion', 'question')
              AND nsp.user_id != ?;               -- Saved by someone OTHER THAN the profile user
        `;
    const [discussionSavesResult] = await connection.query(discussionSavesQuery, [userId, userId]);
    const discussionSaves = discussionSavesResult[0].totalSaves;

    // 2. Get total saves for tip posts by this user, excluding their own saves
    const tipSavesQuery = `
            SELECT COUNT(nsp.id) AS totalSaves
            FROM nearby_saved_posts nsp
            JOIN nearby_tips nt ON nsp.post_id = nt.id
            WHERE nt.user_id = ?                 -- Post belongs to the profile user
              AND nsp.post_type = 'tip'
              AND nsp.user_id != ?;              -- Saved by someone OTHER THAN the profile user
        `;
    const [tipSavesResult] = await connection.query(tipSavesQuery, [userId, userId]);
    const tipSaves = tipSavesResult[0].totalSaves;

    // 3. Get total saves for alert posts by this user, excluding their own saves
    const alertSavesQuery = `
            SELECT COUNT(nsp.id) AS totalSaves
            FROM nearby_saved_posts nsp
            JOIN nearby_alerts na ON nsp.post_id = na.alertId
            WHERE na.userId = ?                  -- Post belongs to the profile user
              AND nsp.post_type = 'alert'
              AND nsp.user_id != ?;              -- Saved by someone OTHER THAN the profile user
        `;
    const [alertSavesResult] = await connection.query(alertSavesQuery, [userId, userId]);
    const alertSaves = alertSavesResult[0].totalSaves;

    // Sum all saves
    const totalUserSavesExcludingOwn = discussionSaves + tipSaves + alertSaves;

    res.status(200).json({ totalSaves: totalUserSavesExcludingOwn });

  } catch (err) {
    console.error(`Error fetching total saves (excluding own) for user ${userId}:`, err);
    res.status(500).json({ error: 'Failed to fetch total saves.' });
  } finally {
    if (connection) connection.release();
  }
});























//GROUPS API
// Create a new group
app.post('/api/createGroup', async (req, res) => {
  const { group_name, description } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  if (!group_name || !description) {
    return res.status(400).json({ error: 'Group name and description are required' });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO nearby_groups (group_name, created_by, description) VALUES (?, ?, ?)`,
      [group_name, userId, description]
    );

    const groupId = result.insertId;

    await connection.query(
      `INSERT INTO nearby_group_members (user_id, group_id) VALUES (?, ?)`,
      [userId, groupId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Group created successfully',
      groupId,
    });

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group' });
  } finally {
    if (connection) connection.release();
  }
});


//Update group details
app.post('/api/updateGroupDetails', async (req, res) => {
  const { groupId, groupName, groupDescription } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  if (!groupId || !groupName || !groupDescription) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    // Check if the user is the creator of the group
    const [results] = await connection.query(
      `SELECT * FROM nearby_groups WHERE groupid = ? AND created_by = ?`,
      [groupId, userId]
    );

    if (results.length === 0) {
      return res.status(403).json({ error: 'Unauthorized: Only the group creator can update this group' });
    }

    // Update group details
    await connection.query(
      `UPDATE nearby_groups SET group_name = ?, description = ? WHERE groupid = ?`,
      [groupName, groupDescription, groupId]
    );

    // Emit WebSocket event
    const io = req.app.get('io');
    const payload = {
      groupId: parseInt(groupId, 10),
      groupName,
      groupDescription,
    };

    console.log("📣 Emitting groupDetailsUpdated:", payload);
    io.to(groupId.toString()).emit('groupDetailsUpdated', payload);

    res.status(200).json({ message: 'Group updated successfully' });
  } catch (err) {
    console.error('Failed to update group:', err);
    res.status(500).json({ error: 'Failed to update group details' });
  } finally {
    if (connection) connection.release();
  }
});


//Fetch group posts count
app.get('/api/grouppostcount/:groupId/postCount', async (req, res) => {
  const { groupId } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT COUNT(*) AS postCount FROM nearby_group_posts WHERE group_id = ?`,
      [groupId]
    );

    const count = results[0]?.postCount || 0;
    res.status(200).json({ postCount: count });
  } catch (err) {
    console.error('Error fetching group post count:', err);
    res.status(500).json({ error: 'Failed to fetch post count' });
  } finally {
    if (connection) connection.release();
  }
});

//  Fetch all groups
// Assuming you're using Express.js
app.get('/api/getGroups', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Adjust query if you want to fetch only groups the user is a member of or created
    const query = `SELECT groupid, group_name, description, banner_image FROM nearby_groups`;

    const [result] = await connection.query(query, [userId]);

    res.json({ groups: result });
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  } finally {
    if (connection) connection.release();
  }
});


//ADD USER TO GROUP
app.post('/api/joinGroup', async (req, res) => {
  const { group_id } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;

  if (!group_id) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `INSERT INTO nearby_group_members (user_id, group_id) VALUES (?, ?)`;
    await connection.query(query, [userId, group_id]);

    res.status(200).json({ message: 'Successfully joined the group' });
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ error: 'Failed to join the group' });
  } finally {
    if (connection) connection.release();
  }
});




//GET GROUPS FOR USER
app.get('/api/getUserGroups', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    const query = `
      SELECT g.groupid, g.group_name, g.description, g.banner_image 
      FROM nearby_groups g
      JOIN nearby_group_members gm ON gm.group_id = g.groupid
      WHERE gm.user_id = ?;
    `;

    const [result] = await connection.query(query, [userId]);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching user groups:', err);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  } finally {
    if (connection) connection.release();
  }
});


//Member count
// Get member count for a group
// Get member count for a specific group
app.get('/api/groupMemberCount/:groupId', async (req, res) => {
  const groupId = req.params.groupId;
  let connection;

  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      `SELECT COUNT(*) AS memberCount FROM nearby_group_members WHERE group_id = ?`,
      [groupId]
    );
    res.json({ memberCount: result[0].memberCount });
  } catch (err) {
    console.error('Error fetching member count:', err);
    res.status(500).json({ error: 'Failed to get member count' });
  } finally {
    if (connection) connection.release();
  }
});

// Get group details with admin check and member count
app.get('/api/getGroup/:groupId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  const { groupId } = req.params;
  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Get group details
    const [groupResults] = await connection.query(
      `SELECT * FROM nearby_groups WHERE groupid = ?`,
      [groupId]
    );

    if (groupResults.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResults[0];

    // Get user role in the group
    const [userRoleResults] = await connection.query(
      `SELECT role FROM nearby_group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );

    const isAdmin =
      userRoleResults.length > 0 &&
      (group.created_by === userId || userRoleResults[0].role === 'admin');

    // Get member count
    const [memberCountResult] = await connection.query(
      `SELECT COUNT(*) AS memberCount FROM nearby_group_members WHERE group_id = ?`,
      [groupId]
    );

    res.json({
      group_name: group.group_name,
      description: group.description,
      isAdmin,
      groupId: group.groupid,
      memberCount: memberCountResult[0].memberCount,
      bannerImage: group.banner_image,
      createdAt: group.created_at,
    });
  } catch (err) {
    console.error('Error fetching group details:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});






// Check if a user is a member of a group
app.post('/api/checkMembership', async (req, res) => {
  const { group_id } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }

  if (!group_id) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      `SELECT * FROM nearby_group_members WHERE user_id = ? AND group_id = ?`,
      [userId, group_id]
    );

    res.status(200).json({ isMember: result.length > 0 });
  } catch (err) {
    console.error('Error checking membership:', err);
    res.status(500).json({ error: 'Failed to check membership' });
  } finally {
    if (connection) connection.release();
  }
});

// Leave a group
app.post('/api/leaveGroup', async (req, res) => {
  const { group_id } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: 'User is not logged in' });
  }
  if (!group_id) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Check group creator
    const [creatorResults] = await connection.query(
      'SELECT created_by FROM nearby_groups WHERE groupid = ?',
      [group_id]
    );

    if (creatorResults.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (creatorResults[0].created_by === userId) {
      return res.status(403).json({ error: 'Group creator cannot leave the group' });
    }

    // Remove user from group
    const [deleteResult] = await connection.query(
      'DELETE FROM nearby_group_members WHERE user_id = ? AND group_id = ?',
      [userId, group_id]
    );

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'User was not a member of the group' });
    }

    res.status(200).json({ message: 'Successfully left the group' });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ error: 'Failed to leave the group' });
  } finally {
    if (connection) connection.release();
  }
});

// Group Banner upload API
app.post('/api/groupbanner/:groupId/banner', upload.single('banner'), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { groupId } = req.params;
  const userId = req.session.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const bannerPath = `/uploads/${req.file.filename}`;
  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      'SELECT * FROM nearby_groups WHERE groupid = ? AND created_by = ?',
      [groupId, userId]
    );

    if (result.length === 0) {
      return res.status(403).json({ error: 'You must be the group creator to upload a banner' });
    }

    await connection.query(
      'UPDATE nearby_groups SET banner_image = ? WHERE groupid = ?',
      [bannerPath, groupId]
    );

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.to(groupId.toString()).emit('groupUpdated', {
      groupId: parseInt(groupId),
      bannerImage: bannerPath
    });

    res.json({ message: 'Banner uploaded successfully', imageUrl: bannerPath });
  } catch (err) {
    console.error('Error uploading banner:', err);
    res.status(500).json({ error: 'Failed to update banner' });
  } finally {
    if (connection) connection.release();
  }
});

// Fetch group banner
app.get('/api/groupbanner/:groupId/banner', async (req, res) => {
  const { groupId } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      'SELECT banner_image FROM nearby_groups WHERE groupid = ?',
      [groupId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ banner_image: result[0].banner_image });
  } catch (err) {
    console.error('Error fetching banner:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Fetch group details
app.get('/api/groupdetails/:groupId', async (req, res) => {
  const { groupId } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      'SELECT group_name, description FROM nearby_groups WHERE groupid = ?',
      [groupId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({
      groupName: result[0].group_name,
      groupDescription: result[0].description
    });
  } catch (err) {
    console.error('Error fetching group details:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});



// Fetch group users with pagination (50 users per page)
// Get paginated users in a group with roles
app.get('/api/getgroupUserList/:groupId/users', async (req, res) => {
  const { groupId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  let connection;

  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(
      `
      SELECT u.userid, u.username, u.firstname, u.lastname, u.profile_picture, gm.role
      FROM nearby_group_members gm
      JOIN nearby_users u ON gm.user_id = u.userid
      WHERE gm.group_id = ?
      LIMIT ? OFFSET ?
      `,
      [groupId, limit, offset]
    );

    const [totalResult] = await connection.query(
      `SELECT COUNT(*) AS total FROM nearby_group_members WHERE group_id = ?`,
      [groupId]
    );

    res.json({ users, total: totalResult[0].total });
  } catch (err) {
    console.error('Error fetching group users:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Add or update user role in group
app.post('/api/addUserToGroup', async (req, res) => {
  const { userId, groupId, role } = req.body;

  if (!userId || !groupId) {
    return res.status(400).json({ error: 'Missing userId or groupId' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    await connection.query(
      `
      INSERT INTO nearby_group_members (user_id, group_id, role)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE role = VALUES(role)
      `,
      [userId, groupId, role || 'member']
    );

    res.json({ success: true, message: 'User added to group' });
  } catch (err) {
    console.error('Error adding user to group:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Search for users to add
app.get('/api/searchUsers', async (req, res) => {
  const searchTerm = req.query.q;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const likeSearchTerm = `%${searchTerm}%`;

    const [results] = await connection.query(
      `
      SELECT userid, username, email, firstname, lastname, profile_picture
      FROM nearby_users
      WHERE email LIKE ? OR username LIKE ?
      LIMIT 10
      `,
      [likeSearchTerm, likeSearchTerm]
    );

    res.json(results);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Remove user from group
app.post('/api/removeUserFromGroup', async (req, res) => {
  const { userId, groupId } = req.body;

  if (!userId || !groupId) {
    return res.status(400).json({ error: 'Missing userId or groupId' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      `
      DELETE FROM nearby_group_members
      WHERE user_id = ? AND group_id = ?
      `,
      [userId, groupId]
    );

    res.json({ success: true, message: 'User removed from group' });
  } catch (err) {
    console.error('Error removing user from group:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});



// Demote a user from admin to member in a group
// POST /api/demoteGroupAdmin/:groupId/user/:userId
app.post('/api/demoteGroupAdmin/:groupId/user/:userId', async (req, res) => {
  const { groupId, userId } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    // Check group creator
    const [groupResult] = await connection.query(
      'SELECT created_by FROM nearby_groups WHERE groupid = ?',
      [groupId]
    );

    if (groupResult.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const creatorId = groupResult[0].created_by;

    if (parseInt(userId) === parseInt(creatorId)) {
      return res.status(400).json({ error: 'The group creator cannot be demoted' });
    }

    // Demote user from admin to member
    const [updateResult] = await connection.query(
      `UPDATE nearby_group_members
       SET role = 'member'
       WHERE group_id = ? AND user_id = ? AND role = 'admin'`,
      [groupId, userId]
    );

    if (updateResult.affectedRows > 0) {
      res.json({ message: 'User demoted to member.' });
    } else {
      res.status(400).json({ error: 'User is not an admin or could not be demoted.' });
    }
  } catch (err) {
    console.error('Error demoting user:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// POST /api/makeGroupadmin/:groupId/user/:userId/makeAdmin
app.post('/api/makeGroupadmin/:groupId/user/:userId/makeAdmin', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { groupId, userId } = req.params;
  const loggedInUserId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Check if logged-in user is admin in the group
    const [adminCheck] = await connection.query(
      'SELECT * FROM nearby_group_members WHERE group_id = ? AND user_id = ? AND role = "admin"',
      [groupId, loggedInUserId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ error: 'You must be an admin to perform this action' });
    }

    // Promote the user to admin
    await connection.query(
      'UPDATE nearby_group_members SET role = "admin" WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    res.json({ message: 'User promoted to admin' });
  } catch (err) {
    console.error('Error promoting user to admin:', err);
    res.status(500).json({ error: 'Failed to make user admin' });
  } finally {
    if (connection) connection.release();
  }
});

// DELETE /api/deleteGroup/:groupId
app.delete('/api/deleteGroup/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.session.user?.id;

  if (!userId || !groupId) {
    return res.status(400).json({ error: 'Missing userId or groupId' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    // Verify user is the group creator
    const [creatorResult] = await connection.query(
      'SELECT created_by FROM nearby_groups WHERE groupid = ?',
      [groupId]
    );

    if (creatorResult.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (parseInt(creatorResult[0].created_by) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Only the group creator can delete the group' });
    }

    // Define deletion queries with placeholders for groupId
    const deletionQueries = [
      `DELETE FROM nearby_group_comment_media WHERE comment_id IN (
          SELECT comment_id FROM nearby_group_comments WHERE group_id = ?
        )`,

      `DELETE FROM nearby_group_comments WHERE group_id = ? AND parent_comment_id IS NOT NULL`,

      `DELETE FROM nearby_group_comments WHERE group_id = ?`,

      `DELETE FROM nearby_grouppost_media WHERE post_id IN (
          SELECT post_id FROM nearby_group_posts WHERE group_id = ?
        )`,

      `DELETE FROM nearby_group_posts WHERE group_id = ?`,

      `DELETE FROM nearby_group_members WHERE group_id = ?`,

      `DELETE FROM nearby_groups WHERE groupid = ?`,
    ];

    // Execute queries sequentially
    for (const query of deletionQueries) {
      await connection.query(query, [groupId]);
    }

    res.json({ success: true, message: 'Group and all related data deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Database error during deletion' });
  } finally {
    if (connection) connection.release();
  }
});


// Fetch user profile
// 1. Logged-in user's profile (already in place)
// GET logged-in user profile
app.get('/api/user/profile', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      `SELECT userid, username, email, firstname, lastname, profile_picture, occupation, bio, created_at, banner_image, longitude, latitude, address
       FROM nearby_users
       WHERE userid = ?`,
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// GET public user profile by userId
app.get('/api/user/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      `SELECT userid, username, firstname, lastname, profile_picture, occupation, bio, created_at, banner_image
       FROM nearby_users
       WHERE userid = ?`,
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// PUT update logged-in user profile
app.put('/api/user/profile', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const {
    firstname,
    lastname,
    occupation,

    bio,
    profile_picture,
    latitude,
    longitude,
    address
  } = req.body;

  let connection;

  try {
    connection = await pool.getConnection();
    const updatedAt = getMySQLDatetime();
    await connection.query(
      `UPDATE nearby_users
   SET firstname = ?, lastname = ?, occupation = ?, bio = ?, profile_picture = ?, latitude = ?, longitude = ?, updated_at = ?, address = ?
   WHERE userid = ?`,
      [firstname, lastname, occupation, bio, profile_picture || null, latitude || null, longitude || null, updatedAt, address, userId]
    );


    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});


// POST upload profile picture
app.post('/api/user/profile-picture', uploadProfilePicture.single('profilePicture'), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const profilePicPath = `/uploads/profile_pictures/${req.file.filename}`;
  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Get current profile picture
    const [results] = await connection.query('SELECT profile_picture FROM nearby_users WHERE userid = ?', [userId]);
    const oldPic = results[0]?.profile_picture;

    // Delete old picture if not default and exists
    if (oldPic && oldPic !== '/default-avatar.png') {
      const oldPath = path.join(__dirname, '..', oldPic);
      fs.unlink(oldPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn('Failed to delete old profile picture:', err.message);
        }
      });
    }

    // Update database with new picture path
    await connection.query('UPDATE nearby_users SET profile_picture = ? WHERE userid = ?', [profilePicPath, userId]);

    res.json({ success: true, imageUrl: profilePicPath });
  } catch (err) {
    console.error('Database error updating profile picture:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

//Profile picture banner image
// Route for uploading a banner image
// Upload banner image
app.post('/api/user/banner-image', uploadBannerImage.single('bannerImage'), async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const bannerImagePath = `/uploads/profile_banners/${req.file.filename}`;
  const userId = req.session.user.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Fetch old banner
    const [results] = await connection.query('SELECT banner_image FROM nearby_users WHERE userid = ?', [userId]);
    const oldBanner = results[0]?.banner_image;

    // Delete old banner if not default
    if (oldBanner && oldBanner !== '/default-banner.png') {
      const oldPath = path.join(__dirname, '..', oldBanner);
      fs.unlink(oldPath, err => {
        if (err && err.code !== 'ENOENT') {
          console.warn('Failed to delete old banner image:', err.message);
        }
      });
    }

    // Update new banner path
    await connection.query('UPDATE nearby_users SET banner_image = ? WHERE userid = ?', [bannerImagePath, userId]);
    res.json({ success: true, imageUrl: bannerImagePath });

  } catch (err) {
    console.error('Error updating banner image:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Create or update product
app.post('/api/products', uploadProductImages.array('images', 5), async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const {
    product_id, name, description = '', price, is_free, category_id,
    deletedImages = [],
    business_id // 🔧 NEW: Optional
  } = req.body;

  if (!name || !category_id) return res.status(400).json({ error: 'Name and category are required' });

  const cleanName = xss(name);
  const cleanDescription = xss(description);
  const priceNum = parseFloat(price) || 0;
  const freeFlag = is_free === 'true' || priceNum === 0;

  let connection;

  try {
    connection = await pool.getConnection();

    if (product_id) {
      // UPDATE flow: Check ownership
      const [ownerResult] = await connection.query(
        `SELECT user_id, business_id FROM nearby_products WHERE product_id = ?`,
        [product_id]
      );
      if (ownerResult.length === 0) return res.status(404).json({ error: 'Product not found' });

      const product = ownerResult[0];
      const isUserOwner = product.user_id === userId;
      const isBusinessOwner = product.business_id
        ? (await connection.query(
          `SELECT 1 FROM nearby_businesses WHERE business_id = ? AND user_id = ?`,
          [product.business_id, userId]
        ))[0].length > 0
        : false;

      if (!isUserOwner && !isBusinessOwner)
        return res.status(403).json({ error: 'Unauthorized to update this product' });

      await connection.query(
        `UPDATE nearby_products
         SET name = ?, description = ?, price = ?, is_free = ?, category_id = ?
         WHERE product_id = ?`,
        [cleanName, cleanDescription, priceNum, freeFlag, category_id, product_id]
      );

      // Delete image logic (same as before) ...
      // Add new image logic (same as before) ...

      return res.json({ message: 'Product updated successfully' });

    } else {
      // CREATE flow 🔧
      let insertQuery = `
        INSERT INTO nearby_products 
          (user_id, business_id, name, description, price, is_free, category_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const [insertResult] = await connection.query(
        insertQuery,
        [
          userId,              // always set userId
          business_id || null, // optional business_id
          cleanName,
          cleanDescription,
          priceNum,
          freeFlag,
          category_id
        ]
      );


      const newProductId = insertResult.insertId;

      if (req.files?.length > 0) {
        const imageValues = req.files.map(file => [
          newProductId,
          `/uploads/product_images/${file.filename}`
        ]);
        await connection.query(
          'INSERT INTO nearby_product_images (product_id, image_url) VALUES ?',
          [imageValues]
        );
      }

      // Emit full product
      const [productRows] = await connection.query(
        `SELECT p.*, u.username, c.name AS category
         FROM nearby_products p
         LEFT JOIN nearby_users u ON p.user_id = u.userid
         JOIN nearby_product_categories c ON p.category_id = c.category_id
         WHERE p.product_id = ?`,
        [newProductId]
      );

      const [imageRows] = await connection.query(
        'SELECT image_url FROM nearby_product_images WHERE product_id = ?',
        [newProductId]
      );

      const fullProduct = {
        ...productRows[0],
        images: imageRows.map(i => i.image_url),
      };

      io.to('all_products').emit('new-product', fullProduct);

      return res.status(201).json({ message: 'Product created successfully' });
    }

  } catch (err) {
    console.error('Product API error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});


//This query is for the Create product form:
app.get('/api/my-businesses', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [businesses] = await pool.query(
      `SELECT business_id, name, logo_url
       FROM nearby_businesses
       WHERE user_id = ?`,
      [userId]
    );
    res.json({ businesses });
  } catch (err) {
    console.error('Fetch businesses error:', err);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});




// Get Product Categories
app.get('/api/categories', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(`SELECT category_id, name FROM nearby_product_categories ORDER BY name ASC`);
    res.json({ categories: results });
  } catch (err) {
    console.error('DB error fetching categories:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Fetch ALL products with pagination
app.get('/api/products/all', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  let connection;

  const query = `
   SELECT 
  p.product_id, p.name, p.description, p.price, p.is_free, p.created_at,
  p.business_id AS product_business_id,
  c.name AS category,
  u.username AS owner,
  u.email AS owner_email,
  (SELECT GROUP_CONCAT(image_url) FROM nearby_product_images WHERE product_id = p.product_id) AS images

    FROM nearby_products p
    JOIN nearby_product_categories c ON p.category_id = c.category_id
    JOIN nearby_users u ON p.user_id = u.userid
    ORDER BY p.created_at DESC, p.product_id DESC
    LIMIT ? OFFSET ?
  `;

  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, [limit, offset]);
    const products = results.map(p => ({
      product_id: p.product_id,
      name: p.name,
      description: p.description,
      price: p.price,
      is_free: p.is_free,
      created_at: p.created_at,
      category: p.category,
      owner: p.owner,
      owner_email: p.owner_email,
      business_id: p.product_business_id,
      images: p.images ? p.images.split(',') : []
    }));

    res.json({ products });
  } catch (err) {
    console.error('Error fetching all products:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// Fetch products by category with pagination
app.get('/api/products', async (req, res) => {
  const category = req.query.category;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  let connection;
  try {
    connection = await pool.getConnection();

    let query = `
      SELECT 
        p.product_id, p.name, p.description, p.price, p.is_free, p.created_at, p.business_id, 
        c.name AS category, 
        u.username AS owner,
        u.email AS owner_email,
        (SELECT GROUP_CONCAT(image_url) FROM nearby_product_images WHERE product_id = p.product_id) AS images
      FROM nearby_products p
      JOIN nearby_product_categories c ON p.category_id = c.category_id
      JOIN nearby_users u ON p.user_id = u.userid
    `;

    const params = [];

    if (category) {
      query += ` WHERE c.name = ?`;
      params.push(category);
    }

    query += ` ORDER BY p.created_at DESC, p.product_id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [results] = await connection.query(query, params);

    const products = results.map(p => ({
      ...p,
      images: p.images ? p.images.split(',') : []
    }));

    res.json({ products });
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

// View single product by ID
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  let connection;

  const query = `
    SELECT 
      p.product_id, p.name, p.description, p.price, p.is_free, p.created_at, 
      p.business_id AS product_business_id, -- ✅ Added this line
      c.name AS category, 
      u.username AS owner, u.email AS owner_email,
      p.user_id AS owner_id,
      (SELECT GROUP_CONCAT(image_url) FROM nearby_product_images WHERE product_id = p.product_id) AS images
    FROM nearby_products p
    JOIN nearby_product_categories c ON p.category_id = c.category_id
    JOIN nearby_users u ON p.user_id = u.userid
    WHERE p.product_id = ?
  `;

  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, [productId]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = results[0];
    product.images = product.images ? product.images.split(',') : [];

    res.json({ product });
  } catch (err) {
    console.error('SQL error fetching product:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});


// Fetch products for current user
app.get('/api/products/user', async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: 'Unauthorized: Please log in' });
  }

  const userId = req.session.user.id;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  let connection;

  const query = `
    SELECT 
      p.product_id, p.name, p.description, p.price, p.is_free, p.created_at,
      c.name AS category,
      u.username AS owner,
      (SELECT GROUP_CONCAT(image_url) FROM nearby_product_images WHERE product_id = p.product_id) AS images
    FROM nearby_products p
    JOIN nearby_product_categories c ON p.category_id = c.category_id
    JOIN nearby_users u ON p.user_id = u.userid
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC, p.product_id DESC
    LIMIT ? OFFSET ?
  `;

  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, [userId, limit, offset]);

    const products = results.map(p => ({
      ...p,
      images: p.images ? p.images.split(',') : []
    }));

    res.json({ products });
  } catch (err) {
    console.error('Error fetching user products:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/editproducts/:id', async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user?.id;
  let connection;

  const query = `
    SELECT 
      p.product_id, p.name, p.description, p.price, p.is_free,
      c.category_id,
      c.name AS category,
      p.user_id AS owner_id,
      (
        SELECT GROUP_CONCAT(image_url)
        FROM nearby_product_images
        WHERE product_id = p.product_id
      ) AS images
    FROM nearby_products p
    JOIN nearby_product_categories c ON p.category_id = c.category_id
    WHERE p.product_id = ?
  `;

  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, [productId]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = results[0];
    product.images = product.images ? product.images.split(',') : [];

    if (product.owner_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ product });
  } catch (err) {
    console.error('Database error in editproducts:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});


//Messages
app.get("/messages/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const { productId } = req.query;
  let connection;

  const hasProductId = productId !== undefined;

  const query = `
    SELECT 
      m.*, 
      IFNULL(JSON_ARRAYAGG(
        JSON_OBJECT('userId', r.user_id, 'emoji', r.emoji)
      ), JSON_ARRAY()) AS reactions,
      reply.message_id AS reply_id,
      reply.text AS reply_text,
      reply.sender_id AS reply_sender_id,
      reply.created_at AS reply_created_at
    FROM nearby_message m
    LEFT JOIN nearby_message_reactions r ON m.message_id = r.message_id
    LEFT JOIN nearby_message reply ON m.reply_to_message_id = reply.message_id
    WHERE m.room_id = ? ${hasProductId ? "AND m.product_id = ?" : "AND m.product_id IS NULL"}
    GROUP BY m.message_id
    ORDER BY m.created_at ASC
  `;

  const queryParams = hasProductId ? [roomId, productId] : [roomId];

  try {
    connection = await pool.getConnection();
    const [messageRows] = await connection.query(query, queryParams);

    const allMessageIds = messageRows.map(row => row.message_id);
    const replyIds = messageRows
      .map(row => row.reply_id)
      .filter(id => !!id && !allMessageIds.includes(id));

    const uniqueMediaIds = [...new Set([...allMessageIds, ...replyIds])];

    if (uniqueMediaIds.length === 0) {
      return res.json([]);
    }

    const mediaQuery = `
      SELECT message_id, media_url, media_type
      FROM nearby_message_media
      WHERE message_id IN (?)
    `;

    const [mediaRows] = await connection.query(mediaQuery, [uniqueMediaIds]);

    const mediaMap = {};
    mediaRows.forEach(media => {
      if (!mediaMap[media.message_id]) {
        mediaMap[media.message_id] = [];
      }
      mediaMap[media.message_id].push(media);
    });

    const messages = messageRows.map(msg => {
      const replyTo = msg.reply_id
        ? {
          message_id: msg.reply_id,
          text: msg.reply_text,
          sender_id: msg.reply_sender_id,
          created_at: msg.reply_created_at,
          media: mediaMap[msg.reply_id] || [],
        }
        : null;

      return {
        message_id: msg.message_id,
        room_id: msg.room_id,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        text: msg.text,
        created_at: msg.created_at,
        reactions: deduplicateReactions(msg.reactions),
        media: mediaMap[msg.message_id] || [],
        replyTo,
      };
    });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  } finally {
    if (connection) connection.release();
  }
});


// Optional: remove duplicates by userId + emoji
function deduplicateReactions(reactions) {
  const seen = new Set();
  return reactions.filter((r) => {
    const key = `${r.userId}-${r.emoji}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


app.get("/api/messages/conversations", async (req, res) => {
  const currentUserId = req.session.user?.id;
  let connection;

  if (!currentUserId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const query = `
SELECT 
  u.userid,
  u.firstname,
  u.lastname,
  u.username,
  u.profile_picture,
  m.product_id,
  m.room_id,
  p.name AS product_title,
  pi.image_url AS product_image,
  MAX(m.created_at) AS last_message_time,
  COALESCE(unread_counts.unread_count, 0) AS unread_count
FROM nearby_message m
JOIN nearby_users u
  ON (
    (m.sender_id = ? AND m.recipient_id = u.userid AND m.recipient_type = 'user')
    OR
    (m.recipient_id = ? AND m.sender_id = u.userid AND m.sender_type = 'user')
  )
LEFT JOIN nearby_products p
  ON m.product_id = p.product_id
LEFT JOIN (
  SELECT product_id, MIN(image_id) as min_image_id
  FROM nearby_product_images
  GROUP BY product_id
) first_image ON first_image.product_id = p.product_id
LEFT JOIN nearby_product_images pi
  ON pi.product_id = first_image.product_id AND pi.image_id = first_image.min_image_id
LEFT JOIN (
  SELECT room_id, COUNT(*) AS unread_count
  FROM nearby_message
  WHERE recipient_id = ? AND read_at IS NULL
  GROUP BY room_id
) unread_counts 
  ON unread_counts.room_id = m.room_id
WHERE (m.sender_id = ? OR m.recipient_id = ?)
  AND m.room_id NOT LIKE 'chat_business_%'   -- <--- added this line
GROUP BY u.userid, m.product_id, m.room_id
ORDER BY last_message_time DESC

`;


  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(query, [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  } finally {
    if (connection) connection.release();
  }
});




app.post("/messages/send", uploadMessageMedia.array("media"), async (req, res) => {
  const {
    from,
    to,
    roomId,
    message,
    replyToMessageId,
    productId = null
  } = req.body;

  const safeContent = xss(message || "");
  const createdAt = getMySQLDatetime();
  const normalizedReplyTo = replyToMessageId === "" ? null : replyToMessageId;
  const isProductMessage = !!productId;

  const insertMessageQuery = isProductMessage
    ? `
      INSERT INTO nearby_message (room_id, sender_id, recipient_id, text, created_at, reply_to_message_id, product_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    : `
      INSERT INTO nearby_message (room_id, sender_id, recipient_id, text, created_at, reply_to_message_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

  const params = isProductMessage
    ? [roomId, from, to, safeContent, createdAt, normalizedReplyTo, productId]
    : [roomId, from, to, safeContent, createdAt, normalizedReplyTo];

  let connection;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(insertMessageQuery, params);
    const messageId = result.insertId;

    if (req.files && req.files.length > 0) {
      const mediaInserts = req.files.map(file => [
        messageId,
        `/uploads/message_media/${file.filename}`,
        file.mimetype.startsWith("video/") ? "video" : "image",
      ]);

      const mediaQuery = `
        INSERT INTO nearby_message_media (message_id, media_url, media_type)
        VALUES ?
      `;

      await connection.query(mediaQuery, [mediaInserts]);
    }

    res.json({ success: true, messageId, replyToMessageId });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to save message or media" });
  } finally {
    if (connection) connection.release();
  }
});


//Funtion for direct messages
app.get("/api/messages/conversations/direct", async (req, res) => {
  const currentUserId = req.session.user?.id;
  let connection;

  if (!currentUserId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const query = `
    SELECT
      u.userid,
      u.firstname,
      u.lastname,
      u.username,
      u.profile_picture,
      NULL AS product_id,
      m.room_id,
      m.last_message_time,
      COALESCE(u2.unread_count, 0) AS unread_count

    FROM (
      SELECT
        room_id,
        MAX(created_at) AS last_message_time
      FROM nearby_message
      WHERE (
        (sender_id = ? AND sender_type = 'user' AND recipient_type = 'user') OR
        (recipient_id = ? AND sender_type = 'user' AND recipient_type = 'user')
      )
      AND product_id IS NULL
      GROUP BY room_id
    ) m

    JOIN nearby_message m2
      ON m.room_id = m2.room_id AND m.last_message_time = m2.created_at

    JOIN nearby_users u
      ON (
        (m2.sender_id = u.userid AND m2.sender_id != ?) OR
        (m2.recipient_id = u.userid AND m2.recipient_id != ?)
      )

    LEFT JOIN (
      SELECT room_id, COUNT(*) AS unread_count
      FROM nearby_message
      WHERE recipient_id = ? AND read_at IS NULL AND recipient_type = 'user'
      GROUP BY room_id
    ) u2 ON u2.room_id = m.room_id

    ORDER BY m.last_message_time DESC
  `;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(query, [
      currentUserId, // used twice for WHERE sender or recipient
      currentUserId,
      currentUserId, // exclude self from user JOIN
      currentUserId,
      currentUserId  // used in unread subquery
    ]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching direct user-to-user conversations:", err);
    res.status(500).json({ error: "Failed to fetch direct user-to-user conversations" });
  } finally {
    if (connection) connection.release();
  }
});



//API for only Product conversations
app.get("/api/messages/conversations/products", async (req, res) => {
  const currentUserId = req.session.user?.id;
  let connection;

  if (!currentUserId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const query = `
    SELECT 
      u.userid,
      u.firstname,
      u.lastname,
      u.username,
      u.profile_picture,
      m.product_id,
      p.name AS product_title,
      (SELECT image_url FROM nearby_product_images WHERE product_id = m.product_id LIMIT 1) AS product_image,
      MAX(m.created_at) AS last_message_time
    FROM nearby_message m
    JOIN nearby_users u
      ON (u.userid = m.sender_id AND m.recipient_id = ?)
      OR (u.userid = m.recipient_id AND m.sender_id = ?)
    JOIN nearby_products p
      ON m.product_id = p.product_id
    WHERE 
      (m.sender_id = ? OR m.recipient_id = ?)
      AND m.product_id IS NOT NULL
    GROUP BY u.userid, m.product_id
    ORDER BY last_message_time DESC
  `;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(query, [currentUserId, currentUserId, currentUserId, currentUserId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching product conversations:", err);
    res.status(500).json({ error: "Failed to fetch product conversations" });
  } finally {
    if (connection) connection.release();
  }
});




//Message edit
app.post("/messages/edit", uploadMessageMedia.array("media"), async (req, res) => {
  const { messageId, text, roomId } = req.body;
  const safeContent = xss(text || "");
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Step 1: Check ownership
    const [ownerRows] = await connection.query(
      `SELECT sender_id FROM nearby_message WHERE message_id = ?`,
      [messageId]
    );

    if (ownerRows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (ownerRows[0].sender_id !== userId) {
      return res.status(403).json({ error: "Unauthorized to edit this message" });
    }

    // Step 2: Update text
    await connection.query(
      `UPDATE nearby_message SET text = ? WHERE message_id = ?`,
      [safeContent, messageId]
    );

    // Step 3: Handle media update
    if (req.files && req.files.length > 0) {
      // Delete old media
      await connection.query(
        `DELETE FROM nearby_message_media WHERE message_id = ?`,
        [messageId]
      );

      // Insert new media
      const mediaInserts = req.files.map(file => [
        messageId,
        `/uploads/message_media/${file.filename}`,
        file.mimetype.startsWith("video/") ? "video" : "image",
      ]);

      await connection.query(
        `INSERT INTO nearby_message_media (message_id, media_url, media_type) VALUES ?`,
        [mediaInserts]
      );

      const mediaPayload = mediaInserts.map(m => ({ media_url: m[1], media_type: m[2] }));

      res.json({ success: true, media: mediaPayload });
      io.to(roomId).emit("messageEdited", {
        message_id: messageId,
        text: safeContent,
        media: mediaPayload,
      });
    } else {
      // No media update
      res.json({ success: true });
      io.to(roomId).emit("messageEdited", {
        message_id: messageId,
        text: safeContent,
        media: [],
      });
    }
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ error: "Failed to edit message" });
  } finally {
    if (connection) connection.release();
  }
});

//API to delete individual message
app.delete("/api/messages/:messageId", async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.session.user?.id;
  const roomId = req.query.roomId;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Check owner
    const [ownerRows] = await connection.query(
      `SELECT sender_id FROM nearby_message WHERE message_id = ?`,
      [messageId]
    );

    if (ownerRows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (ownerRows[0].sender_id !== userId) {
      return res.status(403).json({ error: "Unauthorized to delete this message" });
    }

    // Delete reactions
    await connection.query(
      `DELETE FROM nearby_message_reactions WHERE message_id = ?`,
      [messageId]
    );

    // Delete media
    await connection.query(
      `DELETE FROM nearby_message_media WHERE message_id = ?`,
      [messageId]
    );

    // Delete message
    await connection.query(
      `DELETE FROM nearby_message WHERE message_id = ?`,
      [messageId]
    );

    if (roomId) {
      io.to(roomId).emit("messageDeleted", { message_id: messageId });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  } finally {
    if (connection) connection.release();
  }
});


//bLOCK a user
app.post('/api/block-user', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const blockerId = req.session.user.id;
  const { blocked_id } = req.body;

  if (!blocked_id) {
    return res.status(400).json({ error: 'Blocked user ID is required' });
  }

  if (blockerId === blocked_id) {
    return res.status(400).json({ error: "You can't block yourself." });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `
      INSERT INTO nearby_blocked_users (blocker_id, blocked_id, created_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE created_at = NOW()
    `;

    await connection.query(query, [blockerId, blocked_id]);

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (err) {
    console.error('Failed to block user:', err);
    res.status(500).json({ error: 'Failed to block user' });
  } finally {
    if (connection) connection.release();
  }
});


//--QUESTION API POST TYPR LOGIC--

///

//Create question API



// Assuming 'app', 'uploadQuestionImages', 'xss', 'getMySQLDatetime', 'pool' are already defined and imported.

app.post('/api/createQuestion', uploadQuestionImages.array('mediaFiles'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const content = xss(req.body.content || '').trim();
  const files = req.files;

  let professions = req.body['professions[]'] || req.body.professions;
  if (!professions) professions = [];
  if (!Array.isArray(professions)) professions = [professions];

  if (!content) return res.status(400).json({ error: 'Question content cannot be empty' });

  let connection;
  try {
    const createdAt = getMySQLDatetime();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert question
    const [result] = await connection.query(`
            INSERT INTO nearby_posts (userid, content, created_at, type)
            VALUES (?, ?, ?, 'question')
        `, [userId, content, createdAt]);

    const postId = result.insertId;

    // 2. Insert professions
    if (professions.length > 0) {
      const professionInserts = professions.map(proid => [postId, proid]);
      await connection.query(`
                INSERT INTO nearby_question_professions (question_id, proid)
                VALUES ?
            `, [professionInserts]);
    }

    // 3. Insert media
    if (files && files.length > 0) {
      const mediaInserts = files.map(file => [
        postId,
        `/uploads/questions_images/${file.filename}`,
        file.mimetype.startsWith('video') ? 'video' : 'image',
      ]);

      await connection.query(`
                INSERT INTO nearby_post_media (postid, media_url, media_type)
                VALUES ?
            `, [mediaInserts]);
    }

    await connection.commit();

    // 4. Fetch the complete new question object for emission
    const fetchNewQuestionQuery = `
            SELECT
                p.postid AS id,
                p.content, p.created_at, p.updated_at AS editedAt,
                u.userid AS userId, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture AS profilePicture,
                p.type AS postType,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('mediaUrl', pm.media_url, 'mediaType', pm.media_type)
                    )
                    FROM nearby_post_media pm
                    WHERE pm.postid = p.postid
                ) AS media,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('proid', nqp.proid, 'name', np.name)
                    )
                    FROM nearby_question_professions nqp
                    JOIN nearby_professions np ON nqp.proid = np.proid
                    WHERE nqp.question_id = p.postid
                ) AS professions,
                ns.id AS savedPostId, CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                nl.id AS likedPostId, CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
                (SELECT COUNT(id) FROM nearby_likes WHERE post_id = p.postid AND post_type = 'question') AS likeCount
            FROM nearby_posts p
            JOIN nearby_users u ON p.userid = u.userid
            LEFT JOIN nearby_saved_posts ns ON p.postid = ns.post_id AND ns.post_type = 'question' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON p.postid = nl.post_id AND nl.post_type = 'question' AND nl.user_id = ?
            WHERE p.postid = ? AND p.type = 'question'
        `;
    const [newQuestionRows] = await connection.query(fetchNewQuestionQuery, [userId, userId, postId]);

    if (newQuestionRows.length === 0) {
      console.error('New question not found after creation.');
      return res.status(500).json({ error: 'Question created but failed to retrieve full data.' });
    }

    const newQuestion = newQuestionRows[0];

    let newMediaArray = [];
    if (newQuestion.media) {
      if (typeof newQuestion.media === 'string') {
        try {
          newMediaArray = JSON.parse(newQuestion.media);
        } catch (parseError) {
          console.warn('Failed to parse media JSON for new question, defaulting to empty array:', parseError);
          newMediaArray = [];
        }
      } else if (Array.isArray(newQuestion.media)) {
        newMediaArray = newQuestion.media;
      }
    }

    let newProfessionsArray = [];
    if (newQuestion.professions) {
      if (typeof newQuestion.professions === 'string') {
        try {
          newProfessionsArray = JSON.parse(newQuestion.professions);
        } catch (parseError) {
          console.warn('Failed to parse professions JSON for new question, defaulting to empty array:', parseError);
          newProfessionsArray = [];
        }
      } else if (Array.isArray(newQuestion.professions)) {
        newProfessionsArray = newQuestion.professions;
      }
    }

    const formattedNewQuestion = {
      id: newQuestion.id,
      content: newQuestion.content,
      createdAt: newQuestion.created_at,
      editedAt: newQuestion.editedAt,
      postType: newQuestion.postType,
      user: {
        userId: newQuestion.userId,
        username: newQuestion.username,
        fullName: newQuestion.fullName,
        profilePicture: newQuestion.profilePicture
      },
      media: newMediaArray,
      professions: newProfessionsArray,
      isSaved: !!newQuestion.isSaved,
      savedPostId: newQuestion.savedPostId,
      isLiked: !!newQuestion.isLiked,
      likedPostId: newQuestion.likedPostId,
      likeCount: newQuestion.likeCount
    };

    // --- Notification Logic Starts Here ---
    const io = req.app.get('io'); // Get the Socket.IO instance

    if (io) {
      // 5. Find users whose occupation matches the question's professions
      const professionNames = formattedNewQuestion.professions.map(p => p.name);
      if (professionNames.length > 0) {
        const findRelevantUsersQuery = `
                    SELECT DISTINCT nu.userid
                    FROM nearby_users nu
                    JOIN nearby_professions np ON nu.occupation = np.name
                    WHERE np.name IN (?)
                    AND nu.userid != ?; -- Exclude the user who posted the question
                `;
        const [relevantUsers] = await connection.query(findRelevantUsersQuery, [professionNames, userId]);

        if (relevantUsers.length > 0) {
          console.log(`Found ${relevantUsers.length} relevant users for question ID: ${formattedNewQuestion.id}`);
          for (const recipient of relevantUsers) {
            const recipientUserId = recipient.userid;

            // 6. Insert notification into nearby_notifications table
            const notificationMetadata = {
              questionId: formattedNewQuestion.id,
              questionContent: formattedNewQuestion.content.substring(0, 100) + (formattedNewQuestion.content.length > 100 ? '...' : ''),
              professions: professionNames,
              senderName: formattedNewQuestion.user.fullName,
              senderProfilePicture: formattedNewQuestion.user.profilePicture
            };

            await connection.query(`
                            INSERT INTO nearby_notifications (recipient_user_id, actor_user_id, action_type, target_type, target_id, metadata, is_read, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
              recipientUserId,
              userId,
              'question_posted', // Ensure this enum value exists in your DB schema
              'question',
              formattedNewQuestion.id,
              JSON.stringify(notificationMetadata),
              0,// Not read
              createdAt
            ]);

            // 7. Emit real-time notification via Socket.IO
            // Each user should listen to their own notification room


            const notificationRoom = `user_notifications:${recipientUserId}`;
            // Inside the loop for relevant users in app.post('/api/createQuestion', ...)
            io.to(notificationRoom).emit('question_posted', {
              type: 'question_posted',
              message: `${formattedNewQuestion.user.fullName} asked a new question relevant to your profession!`,
              question: formattedNewQuestion, // Send the full question object
              recipientId: recipientUserId,
              actorId: userId,
              createdAt: new Date().toISOString(), // Use server time
              actorUserId: userId,
              actorFullname: formattedNewQuestion.user.fullName, // CORRECTED: Use data from formattedNewQuestion
              actorProfilePicture: formattedNewQuestion.user.profilePicture, // CORRECTED: Use data from formattedNewQuestion
              action_type: 'question_posted', // CORRECTED THIS LINE
              target_type: 'question', // Changed to 'question' to match nearby_notifications target_type
              target_id: formattedNewQuestion.id, // Added target_id for consistency
              metadata: notificationMetadata // Pass the metadata directly
            });
            console.log(`Emitted newNotification to ${notificationRoom}`);
              io.to(`user_${recipientUserId}`).emit('notification_count_update', {
          recipientUserId: recipientUserId
        });
          }
        } else {
          console.log('No relevant users found for notification.');
        }
      } else {
        console.log('No professions associated with the question, skipping profession-based notifications.');
      }

  
      io.emit('question_posted', formattedNewQuestion);
      

    } else {
      console.warn("Socket.IO instance not found on req.app.get('io')");
    }

    res.status(201).json({ message: 'Question created successfully!', ...formattedNewQuestion });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error creating question or sending notifications:', err);
    res.status(500).json({ error: 'Failed to create question or send notifications' });
  } finally {
    if (connection) connection.release();
  }
});


//Update or edit a Question:
app.put('/api/editquestionpost/:id', uploadQuestionImages.array('media'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const questionId = req.params.id;
  const content = xss(req.body.content || '').trim();
  let professions = req.body['professions[]'] || req.body.professions;
  let mediaToDelete = req.body['mediaToDelete[]'] || req.body.mediaToDelete;
  const files = req.files;

  if (!content) return res.status(400).json({ error: 'Question content cannot be empty' });
  if (!Array.isArray(professions)) professions = professions ? [professions] : [];
  if (!Array.isArray(mediaToDelete)) mediaToDelete = mediaToDelete ? [mediaToDelete] : [];

  const updatedAt = getMySQLDatetime();

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update question content
    await connection.query(
      `UPDATE nearby_posts SET content = ?, updated_at = ? WHERE postid = ? AND type = 'question' AND userid = ?`,
      [content, updatedAt, questionId, user.id]
    );

    // Clear existing professions
    await connection.query(`DELETE FROM nearby_question_professions WHERE question_id = ?`, [questionId]);

    // Insert new professions if any
    if (professions.length > 0) {
      const profInserts = professions.map(proid => [questionId, proid]);
      await connection.query(
        `INSERT INTO nearby_question_professions (question_id, proid) VALUES ?`,
        [profInserts]
      );
    }

    // Delete media files and DB records if requested
    if (mediaToDelete.length > 0) {
      const [mediaRows] = await connection.query(
        `SELECT media_id, media_url FROM nearby_post_media WHERE media_url IN (?) AND postid = ?`,
        [mediaToDelete, questionId]
      );

      // Delete files from disk (async)
      await Promise.all(mediaRows.map(row => {
        const filePath = path.join(__dirname, '..', row.media_url);
        return fs.unlink(filePath).catch(() => {
          console.error('Failed to delete file:', filePath);
        });
      }));

      const mediaIds = mediaRows.map(row => row.media_id);
      if (mediaIds.length > 0) {
        await connection.query(
          `DELETE FROM nearby_post_media WHERE media_id IN (?) AND postid = ?`,
          [mediaIds, questionId]
        );
      }
    }

    // Insert new media files
    if (files && files.length > 0) {
      const mediaInserts = files.map(file => [
        questionId,
        `/uploads/questions_images/${file.filename}`,
        file.mimetype.startsWith('video') ? 'video' : 'image',
      ]);
      await connection.query(
        `INSERT INTO nearby_post_media (postid, media_url, media_type) VALUES ?`,
        [mediaInserts]
      );
    }

    // Commit transaction
    await connection.commit();

    // Fetch updated post data with professions and media
    const [posts] = await connection.query(`
      SELECT p.postid AS id, p.content, p.created_at AS createdAt, p.updated_at AS editedAt, p.type AS postType,
             u.username, u.firstname, u.lastname, u.profile_picture AS profilePicture
      FROM nearby_posts p
      JOIN nearby_users u ON p.userid = u.userid
      WHERE p.postid = ?`, [questionId]);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const post = posts[0];

    // Fetch professions separately
    const [profResults] = await connection.query(`
      SELECT pro.proid, pro.name
      FROM nearby_question_professions qp
      JOIN nearby_professions pro ON qp.proid = pro.proid
      WHERE qp.question_id = ?`, [questionId]);

    // Fetch media separately
    const [mediaResults] = await connection.query(`
      SELECT media_url AS mediaUrl, media_type AS mediaType
      FROM nearby_post_media WHERE postid = ?`, [questionId]);

    // Construct the final updated question object to send back and emit
    const finalUpdatedQuestion = {
      postId: post.id, // Ensure this matches `q.id` or `q.postId` on the frontend
      content: post.content,
      createdAt: post.createdAt,
      editedAt: post.editedAt,
      postType: post.postType,
      professions: profResults,
      user: {
        username: post.username,
        fullName: `${post.firstname} ${post.lastname}`,
        profilePicture: post.profilePicture || null,
      },
      media: mediaResults,
      isSaved: false, // These should ideally be dynamically fetched based on the current user
      savedPostId: null,
      isLiked: false, // These should ideally be dynamically fetched based on the current user
      likedPostId: null,
      likeCount: 0, // This should be fetched
    };

    // --- Socket.IO Emission ---
    const io = req.app.get('io');
    if (io) {
      console.log(`Attempting to emit 'questionUpdated' for question ID: ${questionId}`);
      io.emit('questionUpdated', { question: finalUpdatedQuestion });
      console.log(`'questionUpdated' emitted successfully for question ID: ${questionId}`);
    } else {
      console.warn("Socket.IO instance not found on req.app.get('io') for question update.");
    }
    // --- End Socket.IO Emission ---

    res.json(finalUpdatedQuestion); // Send the constructed object as response
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Failed to edit question:', err);
    res.status(500).json({ error: 'Failed to update question' });
  } finally {
    if (connection) connection.release();
  }
});


app.get('/api/professions', async (req, res) => {
  const searchTerm = req.query.search || '';
  const searchValue = `%${searchTerm}%`;

  const query = `
    SELECT proid, name 
    FROM nearby_professions 
    WHERE name LIKE ? 
    ORDER BY name
    LIMIT 20
  `;

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query(query, [searchValue]);
    connection.release();
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching professions:', err);
    res.status(500).json({ error: 'Failed to fetch professions' });
  }
});


//API to fetch all questions
app.get('/api/questions', async (req, res) => {
  const currentUserId = req.session.user?.id;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: No user session' });
  }

  const query = `
    SELECT
      p.postid,
      p.content,
      p.created_at,
      p.type AS postType,
      p.updated_at,
      u.username,
      u.firstname,
      u.lastname,
      u.userid,
      u.profile_picture,
      (
          SELECT JSON_ARRAYAGG(
              JSON_OBJECT('mediaUrl', media_url, 'mediaType', media_type)
          )
          FROM nearby_post_media
          WHERE postid = p.postid
      ) AS media,
      ns.id AS savedPostId,
      CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
      nl.id AS likedPostId,
      CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
      COUNT(DISTINCT nl_count.id) AS likeCount,
      (
          SELECT JSON_ARRAYAGG(
              JSON_OBJECT('proid', qp.proid, 'name', pr.name)
          )
          FROM nearby_question_professions qp
          JOIN nearby_professions pr ON qp.proid = pr.proid
          WHERE qp.question_id = p.postid
      ) AS professions
    FROM nearby_posts p
    JOIN nearby_users u ON p.userid = u.userid
    LEFT JOIN nearby_saved_posts ns ON p.postid = ns.post_id AND ns.post_type = 'question' AND ns.user_id = ?
    LEFT JOIN nearby_likes nl ON p.postid = nl.post_id AND nl.post_type = 'question' AND nl.user_id = ?
    LEFT JOIN nearby_likes nl_count ON p.postid = nl_count.post_id AND nl_count.post_type = 'question'
    WHERE p.type = 'question'
    GROUP BY p.postid
    ORDER BY p.created_at DESC
  `;

  const params = [currentUserId, currentUserId];

  try {
    const connection = await pool.getConnection();

    const [results] = await connection.query(query, params);

    connection.release();

    const formatted = results.map(row => ({
      postId: row.postid,
      content: row.content,
      createdAt: row.created_at,
      postType: row.postType,
      editedAt: row.updated_at,
      user: {
        username: row.username,
        fullName: `${row.firstname} ${row.lastname}`,
        profilePicture: row.profile_picture,
        userId: row.userid,
      },
      media: row.media || [],
      professions: row.professions || [],
      isSaved: !!row.isSaved,
      savedPostId: row.savedPostId,
      isLiked: !!row.isLiked,
      likedPostId: row.likedPostId,
      likeCount: row.likeCount,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});


//Post Answers as well as notification:
app.post('/api/answer', uploadQuestionAnswerImages.array('media'), async (req, res) => {
  const user = req.session.user;
  console.log(user);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { content, postid, parent_comment_id } = req.body;
  const files = req.files;

  if (!postid || (!content?.trim() && (!files || files.length === 0))) {
    return res.status(400).json({ error: 'Missing content or postid' });
  }

  const finalContent = content?.trim() || '';
  const createdAt = getMySQLDatetime();
  const parentAnswerIdValue = parent_comment_id || null;

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Insert the answer
    const [result] = await connection.query(
      `INSERT INTO nearby_answers (postid, userid, content, parent_answer_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      [postid, user.id, finalContent, parentAnswerIdValue, createdAt]
    );

    const answerid = result.insertId;
    const contentSnippet = finalContent.slice(0, 100);

    // 2. Notify post owner
    const [postRows] = await connection.query(
      'SELECT userid FROM nearby_posts WHERE postid = ?',
      [postid]
    );

    const postOwnerId = postRows[0]?.userid;

    // Fetch post owner details for richer frontend data
    let postOwnerDetails = {};
    if (postOwnerId) {
      const [ownerRows] = await connection.query(
        'SELECT firstname, lastname, profile_picture FROM nearby_users WHERE userid = ?',
        [postOwnerId]
      );
      if (ownerRows.length > 0) {
        postOwnerDetails = ownerRows[0];
      }
    }

    if (postOwnerId && postOwnerId !== user.id) {
      const [notificationResult] = await connection.query(`
        INSERT INTO nearby_notifications (
          recipient_user_id,
          created_at,
          actor_user_id,
          action_type,
          target_type,
          target_id,
          parent_type,
          parent_id,
          metadata
        ) VALUES (?, ?, ?, 'comment', 'answer', ?, 'post', ?, JSON_OBJECT(
          'comment_snippet', ?, 'post_id', ?, 'post_type', 'question'
        ))
      `, [
        postOwnerId,
        createdAt,
        user.id,
        answerid,
        postid,
        contentSnippet,
        postid
      ]);


      const notificationInsertId = notificationResult.insertId;
      const payload = {
        id: notificationInsertId,
        read: false,
        actorUserId: user.id,
        actorFirstName: user.firstname,
        actorLastName: user.lastname,
        actorFullname: user.name,
        actorProfilePicture: user.profilePic,
        action_type: 'answer',
        target_type: 'question',
        target_id: answerid,
        parent_type: 'post',
        parent_id: postid,
        created_at: createdAt,
        metadata: {
          comment_snippet: contentSnippet,
          post_id: postid,
          post_type: 'question',
        },
        postOwner: {
          id: postOwnerId,
          firstName: postOwnerDetails.firstname || null,
          lastName: postOwnerDetails.lastname || null,
          profilePicture: postOwnerDetails.profile_picture || null,
        }
      };
      io.to(`user_${postOwnerId}`).emit('notification_count_update', {
        recipientUserId: postOwnerId
      });
      io.to(`user_notifications:${postOwnerId}`).emit('question_answer_notification', payload);

      //console.log('Socket Emit [question_answer_notification] to user_%s:', postOwnerId, payload);

    }

    // 3. Notify parent answer owner if it's a reply
    if (parentAnswerIdValue) {
      const [parentRows] = await connection.query(
        'SELECT userid FROM nearby_answers WHERE answerid = ?',
        [parentAnswerIdValue]
      );

      const parentOwnerId = parentRows[0]?.userid;

      if (
        parentOwnerId &&
        parentOwnerId !== user.id &&
        parentOwnerId !== postOwnerId
      ) {
        const [replyNotificationResult] = await connection.query(`
          INSERT INTO nearby_notifications (
            recipient_user_id,
            created_at,
            actor_user_id,
            action_type,
            target_type,
            target_id,
            parent_type,
            parent_id,
            metadata
          ) VALUES (?, ?, 'reply', 'answer', ?, 'answer', ?, JSON_OBJECT(
            'comment_snippet', ?, 'post_id', ?, 'post_type', 'question'
          ))
        `, [
          parentOwnerId,
          createdAt,
          user.id,
          answerid,
          parentAnswerIdValue,
          contentSnippet,
          postid
        ]);

        const replyNotificationInsertId = replyNotificationResult.insertId;


        io.to(`user_${parentOwnerId}`).emit('notification_count_update', {
          recipientUserId: parentOwnerId
        });


        io.to(`user_notifications:${parentOwnerId}`).emit('question_answer_reply_notification', {
          id: replyNotificationInsertId,
          read: false,
          actorUserId: user.id,
          actorFirstName: user.firstname,
          actorLastName: user.lastname,
          actorFullname: user.name,
          actorProfilePicture: user.profilePic,
          action_type: 'reply',
          target_type: 'answer',
          target_id: answerid,
          parent_type: 'answer',
          parent_id: parentAnswerIdValue,
          created_at: createdAt,
          metadata: {
            comment_snippet: contentSnippet,
            post_id: postid,
            post_type: 'question',
          },
          postOwner: {
            id: postOwnerId,
            firstName: postOwnerDetails.firstname || null,
            lastName: postOwnerDetails.lastname || null,
            profilePicture: postOwnerDetails.profile_picture || null,
          }
        });
      }
    }

    // 4. Handle media upload
    const sendResponse = (media = []) => {
      res.status(201).json({
        answerId: answerid,
        content: finalContent,
        createdAt,
        media,
        parentAnswerId: parentAnswerIdValue,
      });

      io.to(`question_${postid}`).emit('new_answer', {
        postId: postid,
        answerId: answerid,
        parentAnswerId: parentAnswerIdValue,
        content: finalContent,
        createdAt,
        user: {
          id: user.id,
          fullName: `${user.firstname} ${user.lastname}`.trim(),
          username: user.username,
          profilePicture: user.profile_picture || null,
        },
      });
    };

    if (!files || files.length === 0) {
      connection.release();
      return sendResponse();
    }

    const mediaInserts = files.map(file => [
      answerid,
      `/uploads/questions_answer_images/${file.filename}`,
      file.mimetype.startsWith('video') ? 'video' : 'image',
    ]);

    await connection.query(
      `INSERT INTO nearby_answer_media (answer_id, media_url, media_type) VALUES ?`,
      [mediaInserts]
    );

    connection.release();

    sendResponse(
      mediaInserts.map(([_, url, type]) => ({ mediaUrl: url, mediaType: type }))
    );

  } catch (err) {
    console.error('Error posting answer:', err);
    return res.status(500).json({ error: 'Failed to post answer' });
  }
});


app.get('/api/answers/:postid', async (req, res) => {
  const { postid } = req.params;
  const currentUserId = req.session.user?.id;

  if (!postid) {
    return res.status(400).json({ error: 'Missing post ID' });
  }

  const query = `
    SELECT
        a.answerid,
        a.content,
        a.created_at,
        a.parent_answer_id,
        a.updated_at,
        u.userid,
        u.firstname,
        u.lastname,
        u.username,
        u.profile_picture,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT('mediaUrl', m.media_url, 'mediaType', m.media_type)
            )
            FROM nearby_answer_media m
            WHERE m.answer_id = a.answerid
        ) AS media,
        CASE
          WHEN a.parent_answer_id IS NULL THEN
              CASE
                  WHEN EXISTS(
                      SELECT 1
                      FROM nearby_posttype_comment_likes cl
                      WHERE cl.user_id = ? AND cl.comment_id = a.answerid AND cl.post_id = ?
                  )
                  THEN TRUE ELSE FALSE
              END
          ELSE
              CASE
                  WHEN EXISTS(
                      SELECT 1
                      FROM nearby_posttype_reply_likes rl
                      WHERE rl.user_id = ? AND rl.reply_id = a.answerid AND rl.post_id = ? AND rl.parent_comment_id = a.parent_answer_id
                  )
                  THEN TRUE ELSE FALSE
              END
        END AS isLikedByCurrentUser,
        CASE
          WHEN a.parent_answer_id IS NULL THEN
              (SELECT COUNT(*) FROM nearby_posttype_comment_likes cl_count
               WHERE cl_count.comment_id = a.answerid AND cl_count.post_id = ?)
          ELSE
              (SELECT COUNT(*) FROM nearby_posttype_reply_likes rl_count
               WHERE rl_count.reply_id = a.answerid AND rl_count.post_id = ? AND rl_count.parent_comment_id = a.parent_answer_id)
        END AS likesCount
    FROM nearby_answers a
    JOIN nearby_users u ON a.userid = u.userid
    WHERE a.postid = ?
    ORDER BY a.created_at ASC
  `;

  const params = [
    currentUserId, postid,
    currentUserId, postid,
    postid,
    postid,
    postid
  ];

  let connection;
  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(query, params);

    const formatted = results.map(row => ({
      answerId: row.answerid,
      content: row.content,
      createdAt: row.created_at,
      parentAnswerId: row.parent_answer_id,
      editedAt: row.updated_at,
      user: {
        userId: row.userid,
        fullName: `${row.firstname} ${row.lastname}`,
        username: row.username,
        profilePicture: row.profile_picture,
      },
      media: row.media || [],
      likesCount: row.likesCount || 0,
      isLikedByCurrentUser: !!row.isLikedByCurrentUser,
    }));

    return res.json({
      count: formatted.length,
      answers: formatted,
    });

  } catch (error) {
    console.error('Error fetching answers:', error);
    return res.status(500).json({ error: 'Failed to fetch answers' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/answer/:answerId/like', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { answerId } = req.params;
  if (!answerId) return res.status(400).json({ error: 'Missing answer ID' });

  let connection;
  try {
    connection = await pool.getConnection();

    const checkQuery = `SELECT * FROM nearby_answer_likes WHERE answerid = ? AND userid = ?`;
    const [results] = await connection.query(checkQuery, [answerId, user.id]);

    if (results.length > 0) {
      // User already liked: remove the like (toggle off)
      const deleteQuery = `DELETE FROM nearby_answer_likes WHERE answerid = ? AND userid = ?`;
      await connection.query(deleteQuery, [answerId, user.id]);
      res.json({ liked: false });
    } else {
      // Insert new like
      const insertQuery = `INSERT INTO nearby_answer_likes (answerid, userid) VALUES (?, ?)`;
      await connection.query(insertQuery, [answerId, user.id]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});



//Delete question api







// Make sure this helper function is globally accessible or imported where needed


// --- NEW API FOR DELETING QUESTIONS ---
// Ensure necessary imports at the top of your server file:
// const { pool } = require('./config/db'); // Your MySQL connection pool
// const { withConnection } = require('./utils/db'); // Or wherever your withConnection utility is
// const deleteFilesFromServer = require('./utils/fileUtils'); // Assuming this utility exists

app.delete('/api/questions/:id', async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.session.user?.id; // Assuming user ID is from session

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid question ID provided.' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in.' });
  }

  try {
    // Use withConnection to manage the database transaction and connection lifecycle
    await withConnection(async (connection) => {
      // Step 1: Verify question and authorization
      const [results] = await connection.query(
        'SELECT * FROM nearby_posts WHERE postId = ? AND userId = ? AND type = "question"',
        [postId, userId]
      );

      if (results.length === 0) {
        // If not found or unauthorized, throw an error to trigger rollback and outer catch
        throw { status: 404, message: 'Question not found or unauthorized to delete.' };
      }

      // Step 2: Fetch media urls and delete files from server
      const [mediaResults] = await connection.query(
        'SELECT media_url FROM nearby_post_media WHERE postid = ?',
        [postId]
      );

      if (mediaResults.length > 0) {
        const mediaUrls = mediaResults.map(m => m.media_url);
        try {
          // This function should be robust to handle potential errors internally
          // without stopping the database transaction.
          await deleteFilesFromServer(mediaUrls);
          console.log(`Attempted to delete files from server for question ${postId}.`);
        } catch (fileDeleteErr) {
          console.error(`Error deleting files from server for question ${postId}:`, fileDeleteErr);
          // Log the error but don't re-throw, as DB deletion should continue
        }

        // Delete media DB records
        await connection.query('DELETE FROM nearby_post_media WHERE postid = ?', [postId]);
        console.log(`Successfully deleted ${mediaResults.length} media records from DB for question ${postId}.`);
      } else {
        console.log(`No media found for question ${postId}.`);
      }

      // Step 3: Delete professions
      await connection.query('DELETE FROM nearby_question_professions WHERE question_id = ?', [postId]);
      console.log(`Successfully deleted professions for question ${postId}.`);

      // Step 4: Delete the question itself
      const [deleteResult] = await connection.query(
        'DELETE FROM nearby_posts WHERE postId = ? AND type = "question"',
        [postId]
      );

      if (deleteResult.affectedRows === 0) {
        // If question wasn't actually deleted (e.g., race condition), throw error
        throw { status: 404, message: 'Question not found for deletion after verification.' };
      }
      console.log(`Question ${postId} successfully deleted from DB.`);

      // After all database operations are successful and before sending response
      // Emit the WebSocket event
      const io = req.app.get('io');
      if (io) {
        console.log(`Attempting to emit 'questionDeleted' for question ID: ${postId}`);
        io.emit('questionDeleted', { postId });
        console.log(`'questionDeleted' emitted successfully for question ID: ${postId}`);
      } else {
        console.warn("Socket.IO instance not found on req.app.get('io') for question deletion.");
      }

      // Step 5: Send success response
      return res.status(200).json({ message: 'Question deleted successfully.', postId });
    }); // withConnection ends here, handling commit/rollback/release

  } catch (err) {
    // Handle errors thrown from within withConnection or the callback
    console.error('Error deleting question:', err);

    // Check if the error object has a 'status' property (for custom errors like 404/401)
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    // Default to 500 for unexpected errors
    return res.status(500).json({ error: 'Failed to delete question due to a server error.' });
  }
});




////////////////////////////////////////////////////////////


//-- END OF QUESTION AND ANSWER API




// -----NEW API FOR CREATING ALERT---//
//
// Add this import if you haven't already in your server.js
// const { getMySQLDatetime } = require('./utils/helpers'); // Assuming this is where getMySQLDatetime comes from
// const sanitizeHtml = require('sanitize-html'); // Assuming you import this for xss


// Function to calculate distance (Haversine formula)
// This is a simplified example, consider using a library like 'geo-distance' or 'geolib' for robustness
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Define your proximity threshold
const NEARBY_ALERT_RADIUS_KM = 5; // 5 kilometers

app.post('/api/alerts', uploadAlertImage.array('mediaFiles', 5), async (req, res) => {
  const { latitude, longitude, title, description } = req.body; // Removed alertTypeId as it's parsed later

  const authenticatedUserId = req.session.user ? req.session.user.id : null;
  const authenticatedUserUsername = req.session.user ? req.session.user.username : 'Unknown User';
  const authenticatedUserFullName = req.session.user ? req.session.user.name : 'Unknown User';
  const authenticatedUserProfilePic = req.session.user ? req.session.user.profilePic : '/default-avatar.png';


  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in.' });
  }

  const alertLat = parseFloat(latitude);
  const alertLng = parseFloat(longitude);
  const alertTypeId = parseInt(req.body.alertTypeId); // Ensure alertTypeId is parsed

  if (
    Number.isNaN(alertTypeId) ||
    Number.isNaN(alertLat) ||
    Number.isNaN(alertLng)
  ) {
    return res.status(400).json({ error: 'Invalid input: alertTypeId, latitude, or longitude are invalid.' });
  }

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const sanitizedTitle = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }).trim();
  const sanitizedDescription = sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }).trim();
  const createdAt = getMySQLDatetime();

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert alert
    const insertAlertQuery = `
            INSERT INTO nearby_alerts (userId, alertTypeId, title, description, latitude, longitude, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
    const [insertResult] = await connection.query(insertAlertQuery, [
      authenticatedUserId,
      alertTypeId,
      sanitizedTitle,
      sanitizedDescription,
      alertLat,
      alertLng,
      createdAt,
    ]);
    const newAlertId = insertResult.insertId;

    // 2. Insert media files
    const mediaFiles = req.files || [];
    if (mediaFiles.length > 0) {
      const mediaValues = mediaFiles.map(file => [
        newAlertId,
        `/uploads/alerts_images/${file.filename}`,
        file.mimetype.startsWith('video/') ? 'video' : 'image',
      ]);
      const mediaInsertQuery = 'INSERT INTO nearby_alert_media (alertid, media_url, media_type) VALUES ?';
      await connection.query(mediaInsertQuery, [mediaValues]);
    }

    await connection.commit(); // Commit the alert and media insertion

    // --- NEW: Find nearby users and create notifications ---
    // Fetch all users with their location data (excluding the poster themselves)
    const allUsersQuery = `
            SELECT userid, firstname, lastname, username, profile_picture, latitude, longitude
            FROM nearby_users
            WHERE userid != ?`;
    const [allUsers] = await pool.query(allUsersQuery, [authenticatedUserId]);

    const nearbyUsersToNotify = [];
    for (const user of allUsers) {
      if (user.latitude && user.longitude) {
        const userLat = parseFloat(user.latitude);
        const userLng = parseFloat(user.longitude);
        if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
          const distance = calculateDistance(alertLat, alertLng, userLat, userLng);
          if (distance <= NEARBY_ALERT_RADIUS_KM) {
            nearbyUsersToNotify.push(user); // Push the whole user object for notification creation
          }
        }
      }
    }

    // Prepare notifications for insertion
    const notificationsToInsert = [];
    const io = req.app.get('io'); // Get the Socket.IO instance

    // Get the alert type name for the notification message
    const [alertTypeRows] = await pool.query('SELECT name FROM nearby_alert_types WHERE alert_type_id = ?', [alertTypeId]);
    const alertTypeName = alertTypeRows.length > 0 ? alertTypeRows[0].name : 'an alert';

    const notificationMessage = `${authenticatedUserFullName} posted a new alert near you: "${sanitizedTitle}"`;
    const alertMetadata = {
      alertTitle: sanitizedTitle,
      alertDescription: sanitizedDescription,
      alertTypeId: alertTypeId,
      alertTypeName: alertTypeName,
      alertLocation: { lat: alertLat, lng: alertLng },
      senderName: authenticatedUserFullName,
      senderUsername: authenticatedUserUsername,
      senderProfilePicture: authenticatedUserProfilePic,
      post_snippet: sanitizedDescription.substring(0, 50) + (sanitizedDescription.length > 50 ? '...' : ''),
    };

    for (const recipientUser of nearbyUsersToNotify) {
      notificationsToInsert.push([
        recipientUser.userid,            // recipient_user_id
        authenticatedUserId,             // actor_user_id
        'alert_posted',                  // action_type (remember to add this to ENUM)
        'alert',                         // target_type
        newAlertId,                      // target_id
        'alert',                         // parent_type
        newAlertId,                      // parent_id
        JSON.stringify(alertMetadata),   // metadata
        0,                               // is_read (0 for unread)
        getMySQLDatetime()               // created_at
      ]);

      // Emit targeted WebSocket notification to the recipient
      if (io) {
        const recipientRoom = `user_notifications:${recipientUser.userid}`;
        const notificationPayload = {
          id: null, // This will be the notification_id from DB after insert, but for real-time socket, it's temporary
          recipient_user_id: recipientUser.userid,
          actor_user_id: authenticatedUserId,
          actorProfilePicture: authenticatedUserProfilePic, // For display
          actorFullname: authenticatedUserFullName, // For display
          action_type: 'alert_posted',
          target_type: 'alert',
          target_id: newAlertId,
          parent_type: 'alert',
          parent_id: newAlertId,
          metadata: alertMetadata, // Send parsed metadata
          is_read: 0,
          read: false, // For frontend state
          created_at: new Date().toISOString(),
          message: notificationMessage, // Custom message for this notification type
          // For the frontend to differentiate socket data from fetched data
          type: 'new_alert_notification', // Distinct type for client-side handling
          recipientId: recipientUser.userid // To filter on client if using a broad emit
        };
        io.to(recipientRoom).emit('new_alert_notification', notificationPayload);
        console.log(`Emitted 'new_alert_notification' for user ${recipientUser.userid} (Alert ID: ${newAlertId})`);
        io.to(`user_${recipientUser.userid}`).emit('notification_count_update', {
          recipientUserId: recipientUser.userid
        });
      }
    }

    if (notificationsToInsert.length > 0) {
      const insertNotificationsQuery = `
                INSERT INTO nearby_notifications (
                    recipient_user_id, actor_user_id, action_type,
                    target_type, target_id, parent_type, parent_id,
                    metadata, is_read, created_at
                ) VALUES ?
            `;
      await pool.query(insertNotificationsQuery, [notificationsToInsert]);
      console.log(`Inserted ${notificationsToInsert.length} nearby alert notifications into DB.`);
    }

    // --- Original logic for fetching and emitting the new alert globally ---
    // Fetch and return the created alert for general feed updates (if applicable)
    const fetchQuery = `
            SELECT na.alertId AS id, na.userId, na.alertTypeId, na.title, na.description AS content,
                    na.latitude, na.longitude, na.createdAt AS created_at,
                    at.name as alert_type_name,
                    u.userid as user_id_from_db, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture,
                    (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT('mediaUrl', nam.media_url, 'mediaType', nam.media_type)
                        )
                        FROM nearby_alert_media nam
                        WHERE nam.alertid = na.alertId
                    ) AS media,
                    (SELECT COUNT(id) FROM nearby_likes WHERE post_id = na.alertId AND post_type = 'alert') AS likeCount
            FROM nearby_alerts na
            JOIN nearby_users u ON na.userId = u.userid
            LEFT JOIN nearby_alert_types at ON na.alertTypeId = at.alert_type_id
            WHERE na.alertId = ?
            GROUP BY na.alertId
        `;

    const [fetchedAlerts] = await connection.query(fetchQuery, [newAlertId]);

    if (fetchedAlerts.length === 0) {
      return res.status(404).json({ error: 'Newly created alert not found' });
    }

    const newAlertRaw = fetchedAlerts[0];
    let mediaArray = [];
    if (newAlertRaw.media) {
      if (typeof newAlertRaw.media === 'string') {
        try { mediaArray = JSON.parse(newAlertRaw.media); } catch (e) { mediaArray = []; }
      } else if (Array.isArray(newAlertRaw.media)) { mediaArray = newAlertRaw.media; }
    }

    const finalNewAlert = {
      id: newAlertRaw.id,
      alertId: newAlertRaw.id,
      userId: newAlertRaw.userId,
      alertTypeId: newAlertRaw.alertTypeId,
      title: newAlertRaw.title,
      description: newAlertRaw.content,
      content: newAlertRaw.content,
      latitude: newAlertRaw.latitude,
      longitude: newAlertRaw.longitude,
      createdAt: newAlertRaw.created_at ? new Date(newAlertRaw.created_at).toISOString() : null,
      type: { id: newAlertRaw.alertTypeId, name: newAlertRaw.alert_type_name },
      location: { lat: newAlertRaw.latitude, lng: newAlertRaw.longitude },
      postType: 'alert',
      user: {
        id: newAlertRaw.user_id_from_db,
        username: newAlertRaw.username,
        fullName: newAlertRaw.fullName,
        profilePicture: newAlertRaw.profilePicture,
      },
      media: mediaArray,
      isSaved: false, // New alert is not saved by default by other users
      savedPostId: null,
      isLiked: false, // New alert is not liked by default by other users
      likedPostId: null,
      likeCount: newAlertRaw.likeCount || 0,
      comments_count: newAlertRaw.comments_count || 0,
    };

    if (io) {
      // This is for broadcasting the new alert to ALL connected clients for their main feed
      io.emit('newAlert', finalNewAlert);
      console.log(`General 'newAlert' emitted for alert ID: ${finalNewAlert.id}`);
    }

    res.status(201).json(finalNewAlert);

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error creating alert or sending notifications:', err);
    res.status(500).json({ error: 'Failed to create alert or send notifications' });
  } finally {
    if (connection) connection.release();
  }
});

//Alert types api

app.get('/api/alert-types', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const query = 'SELECT alert_type_id, name FROM nearby_alert_types';
    const [results] = await connection.query(query);

    connection.release();
    res.json(results);
  } catch (err) {
    if (connection) connection.release();
    console.error('Failed to fetch alert types:', err);
    res.status(500).json({ error: 'Failed to fetch alert types' });
  }
});



// On your Node.js/Express backend (likely in app.js or a routes file)


async function fetchAndReturnUpdatedAlert(connection, alertId) {
  console.log("Inside fetchAndReturnUpdatedAlert function.");
  const [fetchedAlerts] = await connection.query(
    `SELECT na.*, at.name as alert_type_name,
                u.userid as user_id, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullname, u.profile_picture,
                GROUP_CONCAT(nam.media_url SEPARATOR ';;;') as media_urls,  -- Use a unique separator
                GROUP_CONCAT(nam.media_type SEPARATOR ';;;') as media_types -- Use a unique separator
         FROM nearby_alerts na
         JOIN nearby_users u ON na.userId = u.userid
         LEFT JOIN nearby_alert_types at ON na.alertTypeId = at.alert_type_id
         LEFT JOIN nearby_alert_media nam ON na.alertId = nam.alertid
         WHERE na.alertId = ?
         GROUP BY na.alertId`,
    [alertId]
  );

  if (fetchedAlerts.length === 0) {
    throw { status: 404, message: 'Updated alert not found' }; // Throw to be caught by main catch block
  }

  const updatedAlert = fetchedAlerts[0];
  const mediaArray = [];
  if (updatedAlert.media_urls) {
    // Split using the unique separator
    const urls = updatedAlert.media_urls.split(';;;');
    const types = updatedAlert.media_types.split(';;;');
    for (let i = 0; i < urls.length; i++) {
      if (urls[i] && types[i]) {
        mediaArray.push({ mediaUrl: urls[i], mediaType: types[i] });
      }
    }
  }

  const finalUpdatedAlert = {
    id: updatedAlert.alertId,
    alertId: updatedAlert.alertId,
    userId: updatedAlert.userId,
    alertTypeId: updatedAlert.alertTypeId,
    title: updatedAlert.title,
    description: updatedAlert.description,
    content: updatedAlert.description, // Assuming 'content' is equivalent to 'description'
    latitude: updatedAlert.latitude,
    longitude: updatedAlert.longitude,
    created_at: updatedAlert.createdAt,
    editedAt: updatedAlert.edited_at,
    type: { id: updatedAlert.alertTypeId, name: updatedAlert.alert_type_name },
    location: { lat: updatedAlert.latitude, lng: updatedAlert.longitude },
    postType: 'alert',
    user: {
      id: updatedAlert.user_id,
      username: updatedAlert.username,
      fullName: updatedAlert.fullname,
      profilePicture: updatedAlert.profile_picture,
    },
    media: mediaArray,
    comments_count: updatedAlert.comments_count || 0, // Ensure comments_count is handled
  };

  return finalUpdatedAlert;
}


app.put('/api/updatealerts/:id', uploadAlertImage.array('mediaFiles', 5), async (req, res) => {
  const alertId = parseInt(req.params.id, 10);
  // Destructure properties from req.body after Multer has processed it
  const { userId, alertTypeId, latitude, longitude, title, description } = req.body;
  let mediaToDelete = req.body.mediaToDelete; // Get as string from req.body

  let mediaUrlsToDelete = [];
  if (mediaToDelete) {
    try {
      // Ensure parsing logic is robust for empty strings or invalid JSON
      if (typeof mediaToDelete === 'string' && mediaToDelete.trim() !== '') {
        mediaUrlsToDelete = JSON.parse(mediaToDelete);
        console.log("Media URLs to delete (backend):", mediaUrlsToDelete);
      } else if (Array.isArray(mediaToDelete)) { // If it's already an array (e.g. from testing tools)
        mediaUrlsToDelete = mediaToDelete;
      }
    } catch (e) {
      console.error("Failed to parse mediaToDelete:", e);
      // Delete any uploaded files if parsing failed to avoid orphaned files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          const filePath = path.join(file.destination, file.filename);
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error(`Failed to delete temporary file ${filePath}:`, unlinkErr);
          });
        });
      }
      return res.status(400).json({ error: 'Invalid mediaToDelete format. Expected JSON string or array.' });
    }
  }

  if (
    Number.isNaN(alertId) ||
    Number.isNaN(parseInt(userId)) ||
    Number.isNaN(parseInt(alertTypeId)) ||
    Number.isNaN(parseFloat(latitude)) ||
    Number.isNaN(parseFloat(longitude))
  ) {
    // Delete any uploaded files if validation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(file.destination, file.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error(`Failed to delete temporary file ${filePath}:`, unlinkErr);
        });
      });
    }
    return res.status(400).json({ error: 'Invalid input parameters provided.' });
  }

  if (!title || !description) {
    // Delete any uploaded files if validation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(file.destination, file.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error(`Failed to delete temporary file ${filePath}:`, unlinkErr);
        });
      });
    }
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const sanitizedTitle = sanitizeHtml(title, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();

  const sanitizedDescription = sanitizeHtml(description, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();

  let connection; // Declare connection outside try block for finally access
  try {
    connection = await pool.getConnection(); // Get a connection from the pool
    await connection.beginTransaction(); // Start a transaction

    // Step 1: Verify ownership & existence of alert
    const [results] = await connection.query(
      'SELECT * FROM nearby_alerts WHERE alertId = ? AND userId = ?',
      [alertId, userId]
    );

    if (results.length === 0) {
      // Throwing an error here will trigger rollback and custom 404 response
      throw { status: 404, message: 'Alert not found or unauthorized to update.' };
    }

    console.log("Alert found and authorized, proceeding with update...");
    const editedAt = getMySQLDatetime();
    const updateQuery = `
            UPDATE nearby_alerts
            SET alertTypeId = ?, title = ?, description = ?, latitude = ?, longitude = ?, edited_at = ?
            WHERE alertId = ?
        `;

    await connection.query(updateQuery, [alertTypeId, sanitizedTitle, sanitizedDescription, latitude, longitude, editedAt, alertId]);

    console.log("Alert successfully updated in DB. Handling media...");

    // Handle media update scenarios
    if (req.files && req.files.length > 0) {
      // Scenario 1: New media files uploaded: delete all old media, then insert new ones
      const [oldMediaResults] = await connection.query('SELECT media_url FROM nearby_alert_media WHERE alertid = ?', [alertId]);
      const oldUrls = oldMediaResults.map(m => m.media_url);

      if (oldUrls.length > 0) {
        // Fire-and-forget deletion of old files
        deleteFilesFromServer(oldUrls);
        console.log(`Initiated background deletion of ${oldUrls.length} old alert media files.`);

        // Delete old media records from DB
        await connection.query('DELETE FROM nearby_alert_media WHERE alertid = ?', [alertId]);
        console.log(`Deleted all old media records from DB for alert ${alertId}.`);
      } else {
        console.log(`No old media records found for alert ${alertId} to delete.`);
      }

      const mediaToInsert = req.files.map(file => [
        alertId,
        `/uploads/alerts_images/${file.filename}`,
        file.mimetype.startsWith('video/') ? 'video' : 'image',
      ]);

      await connection.query(
        'INSERT INTO nearby_alert_media (alertid, media_url, media_type) VALUES ?',
        [mediaToInsert]
      );
      console.log(`Inserted ${mediaToInsert.length} new media records for alert ${alertId}.`);

    } else if (mediaUrlsToDelete.length > 0) {
      // Scenario 2: No new media, but delete specific existing media
      // Fire-and-forget deletion of specific files
      deleteFilesFromServer(mediaUrlsToDelete);
      console.log(`Initiated background deletion of ${mediaUrlsToDelete.length} specific alert media files.`);

      const placeholders = mediaUrlsToDelete.map(() => '?').join(',');
      await connection.query(`DELETE FROM nearby_alert_media WHERE alertid = ? AND media_url IN (${placeholders})`, [alertId, ...mediaUrlsToDelete]);
      console.log(`Deleted ${mediaUrlsToDelete.length} specific media records from DB for alert ${alertId}.`);

    } else {
      // Scenario 3: No media changes (neither new files nor specific deletions)
      console.log("No media changes requested for alert.");
    }

    await connection.commit(); // Commit the transaction if all DB operations succeeded

    // Fetch and return the updated alert
    const finalUpdatedAlert = await fetchAndReturnUpdatedAlert(connection, alertId);

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      console.log(`Attempting to emit 'alertUpdated' for alert ID: ${alertId}`);
      io.emit('alertUpdated', { alert: finalUpdatedAlert });
      console.log(`'alertUpdated' emitted successfully for alert ID: ${alertId}`);
    } else {
      console.warn("Socket.IO instance not found on req.app.get('io') for alert update.");
    }

    // Send success response
    res.status(200).json(finalUpdatedAlert);

  } catch (error) {
    // If connection exists and transaction was started, rollback
    if (connection) {
      try {
        await connection.rollback();
        console.log(`Transaction rolled back for alert ${alertId} update.`);
      } catch (rollbackErr) {
        console.error(`Error during transaction rollback for alert ${alertId}:`, rollbackErr);
      }
    }

    // Delete any newly uploaded files if an error occurred during the transaction
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(file.destination, file.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error(`Failed to delete temporary uploaded file ${filePath} after error:`, unlinkErr);
        });
      });
    }

    console.error('Failed to update alert:', error);

    // Handle custom errors (e.g., 404 from our thrown objects)
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    // Default to 500 for unexpected errors
    res.status(500).json({ error: 'Failed to update alert due to a server error.', details: error.message });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

app.get('/api/alerts', async (req, res) => {
  const { lat, lng, radius, userId } = req.query; // Destructure userId as well

  let connection;
  try {
    connection = await pool.getConnection();

    let query = `
            SELECT na.alertId AS id, na.userId, na.alertTypeId, na.title, na.description AS content,
                   na.latitude, na.longitude, na.createdAt AS created_at,
                   at.name as alert_type_name,
                   u.userid as user_id_from_db, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture,
                   (
                       SELECT JSON_ARRAYAGG(
                           JSON_OBJECT('mediaUrl', nam.media_url, 'mediaType', nam.media_type)
                       )
                       FROM nearby_alert_media nam
                       WHERE nam.alertid = na.alertId
                   ) AS media,
                   (SELECT COUNT(id) FROM nearby_likes WHERE post_id = na.alertId AND post_type = 'alert') AS likeCount,
                   ns.id AS savedPostId, CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                   nl.id AS likedPostId, CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked
            FROM nearby_alerts na
            JOIN nearby_users u ON na.userId = u.userid
            LEFT JOIN nearby_alert_types at ON na.alertTypeId = at.alert_type_id
            LEFT JOIN nearby_saved_posts ns ON na.alertId = ns.post_id AND ns.post_type = 'alert' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON na.alertId = nl.post_id AND nl.post_type = 'alert' AND nl.user_id = ?
        `;

    const queryParams = [];
    const authenticatedUserId = req.session.user ? req.session.user.id : null;
    queryParams.push(authenticatedUserId, authenticatedUserId);

    // --- NEW: Conditional logic for filtering ---
    if (userId) {
      // If userId is provided, filter by user ID
      query += ` WHERE na.userId = ?`;
      queryParams.push(userId);
      console.log(`Backend: Fetching alerts for user ID: ${userId}`);
    } else {
      // If no userId, require lat/lng/radius for proximity search
      if (!lat || !lng || !radius) {
        return res.status(400).json({ error: 'Missing latitude, longitude, or radius for general alerts feed.' });
      }

      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const parsedRadius = parseInt(radius);

      if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadius)) {
        return res.status(400).json({ error: 'Invalid latitude, longitude, or radius.' });
      }

      // Haversine formula for distance
      query += `
                WHERE (6371 * ACOS(
                    COS(RADIANS(?)) * COS(RADIANS(na.latitude)) * COS(RADIANS(na.longitude) - RADIANS(?)) +
                    SIN(RADIANS(?)) * SIN(RADIANS(na.latitude))
                )) <= ?
            `;
      queryParams.push(parsedLat, parsedLng, parsedLat, parsedRadius);

    }

    query += ` GROUP BY na.alertId ORDER BY na.createdAt DESC`; // Order by most recent

    const [rows] = await connection.query(query, queryParams);

    const alerts = rows.map(row => {
      let mediaArray = [];
      if (row.media) {
        if (typeof row.media === 'string') {
          try {
            mediaArray = JSON.parse(row.media);
          } catch (parseError) {
            console.warn('Failed to parse media JSON for alert, defaulting to empty array:', parseError);
            mediaArray = [];
          }
        } else if (Array.isArray(row.media)) {
          mediaArray = row.media;
        }
      }

      return {
        id: row.id,
        alertId: row.id, // For consistency if your frontend uses alertId
        userId: row.userId,
        alertTypeId: row.alertTypeId,
        title: row.title,
        description: row.content,
        content: row.content,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        type: { id: row.alertTypeId, name: row.alert_type_name },
        location: { lat: row.latitude, lng: row.longitude },
        postType: 'alert',
        user: {
          id: row.user_id_from_db, // Use the user id from the fetched data
          username: row.username,
          fullName: row.fullName,
          profilePicture: row.profile_picture,
        },
        media: mediaArray,
        isSaved: !!row.isSaved,
        savedPostId: row.savedPostId,
        isLiked: !!row.isLiked,
        likedPostId: row.likedPostId,
        likeCount: row.likeCount || 0,
        comments_count: row.comments_count || 0, // Ensure this is fetched if applicable
      };
    });

    res.status(200).json(alerts);

  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  } finally {
    if (connection) connection.release();
  }
});


//API to insert Alert comment:
app.post('/api/alerts/:alertId/comments', uploadAlertImage.array('mediaFiles', 5), async (req, res) => {
  const alertId = parseInt(req.params.alertId, 10);
  const userId = req.session?.user?.id || req.user?.id;
  const user = req.session?.user || req.user;
  if (isNaN(alertId) || !userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'Missing or invalid alertId or userId' });
  }

  const parsedUserId = parseInt(userId);
  const content = sanitizeHtml(req.body.content || '', {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();

  const media = (req.files || []).map(file => ({
    media_url: `/uploads/alerts_images/${file.filename}`,
    media_type: file.mimetype.startsWith('video/') ? 'video' : 'image'
  }));

  const parentCommentId = req.body.parent_comment_id ? parseInt(req.body.parent_comment_id, 10) : null;
  const createdAt = getMySQLDatetime();
  let connection;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert the comment
    const insertCommentQuery = `
      INSERT INTO nearby_alert_comments (alert_id, user_id, content, created_at, parent_comment_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [commentResult] = await connection.query(
      insertCommentQuery,
      [alertId, parsedUserId, content || null, createdAt, parentCommentId]
    );
    const commentId = commentResult.insertId;

    // Insert media if any
    if (media.length > 0) {
      const insertMediaQuery = `
        INSERT INTO nearby_alert_comment_media (comment_id, media_url, media_type)
        VALUES ?
      `;
      const mediaValues = media.map(m => [commentId, m.media_url, m.media_type]);
      await connection.query(insertMediaQuery, [mediaValues]);
    }

    // Get alert owner
    const [alertRows] = await connection.query(
      'SELECT userId FROM nearby_alerts WHERE alertId = ?',
      [alertId]
    );
    const alertOwnerId = alertRows.length ? alertRows[0].userId : null;
    const comment_snippet = content.slice(0, 100);

    const target_type = 'alert';
    const action_type_comment = 'comment';
    const action_type_reply = 'reply';

    // 🔔 Notify alert owner if not the commenter
    if (alertOwnerId && alertOwnerId !== parsedUserId) {
      await connection.query(`
        INSERT INTO nearby_notifications (
          recipient_user_id,
          created_at,
          actor_user_id,
          action_type,
          target_type,
          target_id,
          parent_type,
          parent_id,
          metadata
        ) VALUES (?, ?, ?, 'comment', 'alert', ?, 'alert', ?, JSON_OBJECT(
          'comment_snippet', ?,
          'post_id', ?,
          'post_type', 'alert'
        ))
      `, [
        alertOwnerId,
        createdAt,
        parsedUserId,
        commentId,
        alertId,
        comment_snippet,
        alertId
      ]);


      io.to(`user_${alertOwnerId}`).emit('notification_count_update', {
        recipientUserId: alertOwnerId
      });

      io.to(`user_notifications:${alertOwnerId}`).emit('alert_comment_notification', {
        recipientUserId: alertOwnerId,
        actorUserId: parsedUserId,
        actorFullname: user.name,
        actorProfilePicture: user.profilePic,
        target_type,
        action_type: action_type_comment,
        created_at: createdAt,
        alertId,
        commentId,
        metadata: {
          comment_snippet
        },
        type: 'comment'
      });

    }

    // 🔁 Notify parent comment owner if it's a reply
    if (parentCommentId) {
      const [parentRows] = await connection.query(
        `SELECT user_id FROM nearby_alert_comments WHERE comment_id = ?`,
        [parentCommentId]
      );
      const parentUserId = parentRows.length ? parentRows[0].user_id : null;

      if (
        parentUserId &&
        parentUserId !== parsedUserId &&
        (!alertOwnerId || parentUserId !== alertOwnerId)
      ) {
        await connection.query(`
          INSERT INTO nearby_notifications (
            recipient_user_id,
            created_at,
            actor_user_id,
            action_type,
            target_type,
            target_id,
            parent_type,
            parent_id,
            metadata
          ) VALUES (?, ?, 'reply', 'comment', ?, 'comment', ?, JSON_OBJECT(
            'comment_snippet', ?,
            'post_id', ?,
            'post_type', 'alert'
          ))
        `, [
          parentUserId,
          createdAt,
          parsedUserId,
          commentId,
          parentCommentId,
          comment_snippet,
          alertId
        ]);


        io.to(`user_${parentUserId}`).emit('notification_count_update', {
          recipientUserId: parentUserId
        });


        io.to(`user_notifications:${parentUserId}`).emit('alert_reply_notification', {
          recipientUserId: parentUserId,
          actorUserId: parsedUserId,
          alertId,
          commentId,
          actorFullname: user.name,
          actorProfilePicture: user.profilePic,
          created_at: createdAt,
          target_type: 'comment',
          action_type: action_type_reply,
          parentCommentId,
          metadata: {
            comment_snippet
          },
          type: 'reply'
        });

      }
    }

    // 📣 Emit to everyone watching the alert
    io.to(`alert_${alertId}`).emit('new_alert_comment', {
      alertId,
      commentId,
      content,
      media,
      parentCommentId,
      userId: parsedUserId,
      createdAt
    });

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Comment added successfully', commentId });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error adding alert comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});




//Get alert comments:
app.get('/api/alerts/:alertId/comments', async (req, res) => {
  const alertId = parseInt(req.params.alertId, 10);
  const currentUserId = req.session.user?.id;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (isNaN(alertId)) {
    return res.status(400).json({ error: 'Invalid alert ID' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const commentsQuery = `
      SELECT 
        c.comment_id, c.content, c.created_at, c.parent_comment_id, c.edited_at,
        u.userid AS user_id, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullname, u.profile_picture,
        COALESCE(clikes.total_likes, 0) AS likesCount,
        CASE WHEN ucl.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS isLikedByCurrentUser
      FROM nearby_alert_comments c
      JOIN nearby_users u ON c.user_id = u.userid
      LEFT JOIN (
        SELECT comment_id, COUNT(*) AS total_likes
        FROM nearby_posttype_comment_likes
        GROUP BY comment_id
      ) clikes ON clikes.comment_id = c.comment_id
      LEFT JOIN (
        SELECT comment_id, user_id
        FROM nearby_posttype_comment_likes
        WHERE user_id = ?
      ) ucl ON ucl.comment_id = c.comment_id
      WHERE c.alert_id = ?
      ORDER BY c.created_at ASC
    `;

    const mediaQuery = `
      SELECT comment_id, media_url, media_type
      FROM nearby_alert_comment_media
      WHERE comment_id IN (
        SELECT comment_id FROM nearby_alert_comments WHERE alert_id = ?
      )
    `;

    const replyLikesQuery = `
      SELECT reply_id, COUNT(*) AS total_likes
      FROM nearby_posttype_reply_likes
      GROUP BY reply_id
    `;

    const userReplyLikesQuery = `
      SELECT reply_id
      FROM nearby_posttype_reply_likes
      WHERE user_id = ?
    `;

    const [commentRows] = await connection.query(commentsQuery, [currentUserId, alertId]);
    const [mediaRows] = await connection.query(mediaQuery, [alertId]);
    const [replyLikeRows] = await connection.query(replyLikesQuery);
    const [userLikeRows] = await connection.query(userReplyLikesQuery, [currentUserId]);

    connection.release();

    const replyLikeMap = {};
    replyLikeRows.forEach(({ reply_id, total_likes }) => {
      replyLikeMap[reply_id] = total_likes;
    });

    const userReplyLikeSet = new Set(userLikeRows.map(r => r.reply_id));

    const mediaMap = {};
    mediaRows.forEach(({ comment_id, media_url, media_type }) => {
      if (!mediaMap[comment_id]) mediaMap[comment_id] = [];
      mediaMap[comment_id].push({ mediaUrl: media_url, mediaType: media_type });
    });

    const comments = [];
    const repliesMap = {};

    commentRows.forEach(row => {
      const base = {
        id: row.comment_id,
        content: row.content,
        createdAt: row.created_at,
        parentCommentId: row.parent_comment_id,
        editedAt: row.edited_at,
        user: {
          userId: row.user_id,
          username: row.username,
          fullName: row.fullname,
          profilePicture: row.profile_picture,
        },
        media: mediaMap[row.comment_id] || [],
        likesCount: row.likesCount,
        isLikedByCurrentUser: !!row.isLikedByCurrentUser,
      };

      if (row.parent_comment_id) {
        base.likesCount = replyLikeMap[row.comment_id] || 0;
        base.isLikedByCurrentUser = userReplyLikeSet.has(row.comment_id);
        if (!repliesMap[row.parent_comment_id]) repliesMap[row.parent_comment_id] = [];
        repliesMap[row.parent_comment_id].push(base);
      } else {
        base.replies = [];
        comments.push(base);
      }
    });

    comments.forEach(comment => {
      comment.replies = repliesMap[comment.id] || [];
    });

    res.json(comments);

  } catch (err) {
    if (connection) connection.release();
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});


app.post('/api/tip_comments', uploadTipMedia.array('mediaFiles', 10), async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  const user = req.session.user;
  const userId = user.id;
  const { post_type, post_id, content, parent_comment_id } = req.body;

  const allowedPostTypes = ['post', 'tip', 'alert'];
  if (!post_type || !allowedPostTypes.includes(post_type)) {
    return res.status(400).json({ error: 'Invalid or missing post_type' });
  }

  if (!post_id) {
    return res.status(400).json({ error: 'post_id is required' });
  }

  const safeContent = sanitizeHtml(typeof content === 'string' ? content.trim() : '', {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: { a: ['href'] },
  });

  if (!safeContent && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const createdAt = getMySQLDatetime();
  const parentIdValue = parent_comment_id || null;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert the comment
    const insertCommentQuery = `
      INSERT INTO nearby_posttype_comments
      (post_type, post_id, user_id, content, parent_comment_id, created_at, likes_count)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `;
    const [commentResult] = await connection.query(insertCommentQuery, [
      post_type, post_id, userId, safeContent, parentIdValue, createdAt
    ]);
    const commentId = commentResult.insertId;

    // 2. Insert media if present
    if (req.files && req.files.length > 0) {
      const mediaInsertValues = req.files.map(file => [
        commentId,
        `/uploads/tip_media/${file.filename}`,
        file.mimetype.startsWith('video') ? 'video' : 'image',
      ]);

      const mediaQuery = `
        INSERT INTO nearby_posttype_comment_media (comment_id, media_url, media_type)
        VALUES ?
      `;
      await connection.query(mediaQuery, [mediaInsertValues]);
    }

    const commentSnippet = safeContent.slice(0, 100);

    // 3. Notify post owner (if not self)
    let postOwnerQuery, postOwnerParams;

    if (post_type === 'tip') {
      postOwnerQuery = 'SELECT user_id FROM nearby_tips WHERE id = ?';
      postOwnerParams = [post_id];
    } else {
      postOwnerQuery = 'SELECT userid FROM nearby_posts WHERE postid = ? AND type = ?';
      postOwnerParams = [post_id, post_type];
    }

    const [postRows] = await connection.query(postOwnerQuery, postOwnerParams);
    const recipientId = post_type === 'tip' ? postRows[0]?.user_id : postRows[0]?.userid;

    if (recipientId && recipientId !== userId) {
      try {
        await connection.query(`
          INSERT INTO nearby_notifications (
            recipient_user_id,
            actor_user_id,
            action_type,
            target_type,
            target_id,
            parent_type,
            parent_id,
            created_at,
            metadata
          ) VALUES (?, ?, 'comment', ?, ?, ?, ?, ?, JSON_OBJECT(
            'comment_snippet', ?, 'post_id', ?, 'post_type', ?
          ))
        `, [
          recipientId, 
          userId,
          post_type,
          commentId,
          post_type,
          post_id,
          createdAt,
          commentSnippet,
          post_id,
          post_type
        ]);


        io.to(`user_${recipientId}`).emit('notification_count_update', {
          recipientUserId: recipientId
        });



        io.to(`user_notifications:${recipientId}`).emit('tip_comment_notification', {
  id: commentId, // or notification ID if available
  recipient_user_id: recipientId,
  actor_user_id: userId,
  action_type: 'comment',
  target_type: post_type,
  target_id: commentId,
  parent_type: post_type,
  parent_id: post_id,
  read: false,
  is_read: false,
  created_at: createdAt,
  metadata: {
    comment_snippet: commentSnippet,
    post_id,
    post_type,
    senderName: user.name,
    senderUsername: user.username,
    senderProfilePicture: user.profilePic,
  }
});



      } catch (err) {
        console.error('❌ Notification insert failed:', err);
      }
    }

    // 4. Notify parent comment owner if it's a reply
    const isReply = !!parentIdValue;
    const actionType = isReply ? 'reply' : 'comment';
    if (parentIdValue) {
      const [parentRows] = await connection.query(
        'SELECT user_id FROM nearby_posttype_comments WHERE comment_id = ?',
        [parentIdValue]
      );

      const parentOwnerId = parentRows[0]?.user_id;
      const postOwnerId = post_type === 'tip' ? postRows[0]?.user_id : postRows[0]?.userid;

      if (
        parentOwnerId &&
        parentOwnerId !== userId &&
        parentOwnerId !== postOwnerId
      ) {
        await connection.query(`
  INSERT INTO nearby_notifications (
    recipient_user_id,
    created_at,
    actor_user_id,
    action_type,
    target_type,
    target_id,
    parent_type,
    parent_id,
   
    metadata
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(
    'comment_snippet', ?, 'post_id', ?, 'post_type', ?
  ))
`, [
          parentOwnerId,     // ✅ correct recipient for reply
          createdAt,
          userId,
          'reply',
          'comment',
          commentId,
          'comment',
          parentIdValue,
       
          commentSnippet,
          post_id,
          post_type
        ]);

        io.to(`user_${parentOwnerId}`).emit('notification_count_update', {
          recipientUserId: parentOwnerId
        });

      io.to(`user_notifications:${parentOwnerId}`).emit('tip_reply_notification', {
  id: commentId, // or notification ID if available
  recipient_user_id: parentOwnerId,
  actor_user_id: userId,
  action_type: 'reply',
  target_type: 'comment',
  target_id: commentId,
  parent_type: 'comment',
  parent_id: parentIdValue,
  read: false,
  is_read: false,
  created_at: createdAt,
  metadata: {
    comment_snippet: commentSnippet,
    post_id,
    post_type,
    senderName: user.name,
    senderUsername: user.username,
    senderProfilePicture: user.profilePic,
  }
});


      }
    }

    // 5. Emit to post room
    io.to(`post_${post_type}_${post_id}`).emit('new_tip_comment', {
      commentId,
      postId: post_id,
      postType: post_type,
      content: safeContent,
      createdAt, // ✅
      snippet: commentSnippet, // ✅ Add this line if you want snippet in this event too
      user: {
        id: userId,
        username: user.username,
        fullName: `${user.firstname} ${user.lastname}`.trim(),
        profilePicture: user.profile_picture || null,
      },
      parentCommentId: parentIdValue,
    });


    await connection.commit();
    res.status(200).json({ message: 'Comment and media saved successfully', commentId });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error inserting comment or media:', err);
    res.status(500).json({ error: 'Failed to save comment and media.' });
  } finally {
    if (connection) connection.release();
  }
});



//Update alert posts

app.put('/api/updatealerts/:id', uploadAlertImage.array('mediaFiles', 5), (req, res) => {
  const alertId = parseInt(req.params.id, 10);
  const { userId, alertTypeId, latitude, longitude } = req.body;

  if (
    Number.isNaN(alertId) || Number.isNaN(parseInt(userId)) ||
    Number.isNaN(parseInt(alertTypeId)) ||
    Number.isNaN(parseFloat(latitude)) || Number.isNaN(parseFloat(longitude))
  ) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const title = sanitizeHtml(req.body.title || '').trim();
  const description = sanitizeHtml(req.body.description || '').trim();

  pool.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('DB connection error:', connErr);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query('SELECT * FROM nearby_alerts WHERE id = ? AND userId = ?', [alertId, userId], (err, results) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Failed to query alert' });
      }
      if (results.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Alert not found or unauthorized' });
      }

      const updateQuery = `
        UPDATE nearby_alerts
        SET alertTypeId = ?, title = ?, description = ?, latitude = ?, longitude = ?
        WHERE id = ?
      `;

      connection.query(updateQuery, [alertTypeId, title, description, latitude, longitude, alertId], (updateErr) => {
        if (updateErr) {
          connection.release();
          return res.status(500).json({ error: 'Failed to update alert' });
        }

        if (!req.files || req.files.length === 0) {
          connection.release();
          return res.json({ message: 'Alert updated successfully', alertId });
        }

        const media = req.files.map(file => [
          alertId,
          `/uploads/alerts_images/${file.filename}`,
          file.mimetype.startsWith('video/') ? 'video' : 'image',
        ]);

        connection.query('DELETE FROM nearby_alert_media WHERE alertid = ?', [alertId], (delErr) => {
          if (delErr) {
            connection.release();
            return res.status(500).json({ error: 'Failed to remove old media' });
          }

          connection.query(
            'INSERT INTO nearby_alert_media (alertid, media_url, media_type) VALUES ?',
            [media],
            (mediaErr) => {
              connection.release();
              if (mediaErr) {
                return res.status(500).json({ error: 'Failed to update media' });
              }

              res.json({ message: 'Alert updated with new media', alertId });
            }
          );
        });
      });
    });
  });
});





app.get('/api/debug-distance', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).send('Missing lat or lng');

  const testLat = 52.5285; // Some alert lat
  const testLng = -1.9912; // Some alert lng
  const lat1 = parseFloat(lat);
  const lng1 = parseFloat(lng);

  const distance = 6371 * Math.acos(
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(testLat * Math.PI / 180) *
    Math.cos((testLng * Math.PI / 180) - (lng1 * Math.PI / 180)) +
    Math.sin(lat1 * Math.PI / 180) *
    Math.sin(testLat * Math.PI / 180)
  );

  res.json({ distance });
});


app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YourAppName/1.0 (your.email@example.com)', // Nominatim requires a user-agent
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Nominatim' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// --- NEW API FOR DELETING ALERTS ---

// Ensure necessary imports at the top of your server file:
// const { pool } = require('./config/db'); // Your MySQL connection pool
// const deleteFilesFromServer = require('./utils/fileUtils'); // Assuming this utility exists and handles its own promises/errors

app.delete('/api/alerts/:id', async (req, res) => {
  const alertId = parseInt(req.params.id, 10);
  const userId = req.session.user?.id;

  if (Number.isNaN(alertId)) {
    return res.status(400).json({ error: 'Invalid alert ID provided.' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in.' });
  }

  let connection; // Declare connection outside try block so it's accessible in finally
  try {
    connection = await pool.getConnection(); // Get a connection from the pool
    await connection.beginTransaction(); // Start a transaction

    // Step 1: Verify alert exists and user owns it
    const [alertResults] = await connection.query(
      'SELECT * FROM nearby_alerts WHERE alertId = ? AND userId = ?',
      [alertId, userId]
    );

    if (alertResults.length === 0) {
      // Throwing an error here will cause the transaction to rollback
      throw { status: 404, message: 'Alert not found or unauthorized to delete.' };
    }

    console.log(`Alert ${alertId} authorized for deletion by user ${userId}. Proceeding...`);

    // Step 2: Fetch media URLs
    const [mediaResults] = await connection.query(
      'SELECT media_url FROM nearby_alert_media WHERE alertid = ?',
      [alertId]
    );

    if (mediaResults.length > 0) {
      const mediaUrls = mediaResults.map(m => m.media_url);

      // Call deleteFilesFromServer without awaiting it.
      // This makes file deletion "fire-and-forget".
      // It's assumed that deleteFilesFromServer returns a Promise and handles its own errors
      // (e.g., using .catch() internally, or Promise.allSettled) and doesn't throw synchronously.
      deleteFilesFromServer(mediaUrls);

      // Delete media records from DB
      const [deleteMediaResult] = await connection.query(
        'DELETE FROM nearby_alert_media WHERE alertid = ?',
        [alertId]
      );
    } else {
      console.log(`No media found for alert ${alertId}.`);
    }

    // Step 3: Delete the alert itself
    const [deleteAlertResult] = await connection.query(
      'DELETE FROM nearby_alerts WHERE alertId = ?',
      [alertId]
    );

    if (deleteAlertResult.affectedRows === 0) {
      // This might indicate a race condition if it passed step 1,
      // but still an error that should rollback.
      throw { status: 404, message: 'Alert not found for deletion after initial check.' };
    }


    await connection.commit(); // Commit the transaction if all DB operations succeeded

    // Step 4: Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('alertDeleted', { alertId });
    } else {
      console.warn("Socket.IO instance not found on req.app.get('io') for alert deletion.");
    }

    // Step 5: Send success response
    res.status(200).json({ message: 'Alert deleted successfully.', alertId });

  } catch (error) {
    // If connection exists and transaction was started, rollback
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error(`Error during transaction rollback for alert ${alertId}:`, rollbackErr);
      }
    }

    console.error('Failed to delete alert:', error);

    // Handle custom errors (e.g., 404 from our thrown objects)
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    // Default to 500 for unexpected errors
    res.status(500).json({ error: 'Failed to delete alert due to a server error.', details: error.message });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});


//-----*****END OF ALL ALERT LOGIC----------




//----TIP POST TYPE LOGIC GOES HERE----
//API to fetch categories for nearby tips
// Ensure getMySQLDatetime() and pool are accessible in this file
app.post('/api/nearby_tips', uploadTipMedia.array('mediaFiles', 10), async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let { title, categoryId, content } = req.body;
  const parsedCategoryId = parseInt(categoryId, 10);

  if (isNaN(parsedCategoryId) || parsedCategoryId <= 0) {
    return res.status(400).json({ error: 'Invalid category selected.' });
  }

  if (!title || !content || !parsedCategoryId) {
    return res.status(400).json({ error: 'Title, category, and content are required.' });
  }

  const createdAt = getMySQLDatetime();

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Start transaction

    const tipInsertQuery = `
            INSERT INTO nearby_tips (user_id, title, content, category_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;
    const [tipResult] = await connection.query(tipInsertQuery, [userId, title, content, parsedCategoryId, createdAt]);
    const newTipId = tipResult.insertId;

    const mediaFiles = req.files || [];
    if (mediaFiles.length > 0) {
      const mediaValues = mediaFiles.map(file => [
        newTipId,
        `/uploads/tip_media/${file.filename}`,
        file.mimetype.startsWith('image') ? 'image' : 'video'
      ]);

      const mediaInsertQuery = 'INSERT INTO nearby_tip_media (tip_id, media_url, media_type) VALUES ?';
      await connection.query(mediaInsertQuery, [mediaValues]);
    }

    await connection.commit(); // Commit transaction

    // --- Fetch the complete new tip object for emission ---
    const fetchNewTipQuery = `
            SELECT
              t.id, t.title, t.content, t.created_at, t.updated_at, t.category_id, ntc.name AS categoryName,
              u.userid AS userId, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture AS profilePicture,
              'tip' AS postType,
              (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT('mediaUrl', tm.media_url, 'mediaType', tm.media_type)
                )
                FROM nearby_tip_media tm  -- Added alias 'tm' here
                WHERE tm.tip_id = t.id    -- Used alias 'tm' here
              ) AS media,
              ns.id AS savedPostId, CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
              nl.id AS likedPostId, CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
              (SELECT COUNT(id) FROM nearby_likes WHERE post_id = t.id AND post_type = 'tip') AS likeCount
            FROM nearby_tips t
            JOIN nearby_users u ON t.user_id = u.userid
            JOIN nearby_tips_categories ntc ON t.category_id = ntc.id
            LEFT JOIN nearby_saved_posts ns ON t.id = ns.post_id AND ns.post_type = 'tip' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON t.id = nl.post_id AND nl.post_type = 'tip' AND nl.user_id = ?
            WHERE t.id = ?
        `;
    const [newTipRows] = await connection.query(fetchNewTipQuery, [userId, userId, newTipId]);

    if (newTipRows.length === 0) {
      console.error('New tip not found after creation.');
      return res.status(500).json({ error: 'Tip created but failed to retrieve full data.' });
    }

    const newTip = newTipRows[0];
    let newMediaArray = [];
    if (newTip.media) {
      newMediaArray = newTip.media;
    } else {
      // Ensure it's an empty array if no media is found or it's null/undefined
      newMediaArray = [];
    }

    const formattedNewTip = {
      id: newTip.id,
      title: newTip.title,
      content: newTip.content,
      createdAt: newTip.created_at,
      editedAt: newTip.updated_at, // Will be null initially
      postType: newTip.postType,
      categoryId: newTip.category_id,
      categoryName: newTip.categoryName,
      user: {
        userId: newTip.userId,
        username: newTip.username,
        fullName: newTip.fullName,
        profilePicture: newTip.profilePicture
      },
      media: newMediaArray,
      isSaved: !!newTip.isSaved,
      savedPostId: newTip.savedPostId,
      isLiked: !!newTip.isLiked,
      likedPostId: newTip.likedPostId,
      likeCount: newTip.likeCount
    };

    // --- Emit WebSocket Event ---
    const io = req.app.get('io');
    if (io) {
      io.emit('newTip', formattedNewTip); // Emit to all connected clients
    } else {
      console.warn("Socket.IO instance not found on req.app.get('io')");
    }

    connection.release();
    res.status(201).json({ message: 'Tip created successfully!', tip: formattedNewTip });

  } catch (err) {
    if (connection) {
      await connection.rollback(); // Rollback transaction on error
      connection.release();
    }
    console.error('Error creating tip:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }
    res.status(500).json({ error: 'Failed to create tip.' });
  }
});

//EDit tip
// Ensure getMySQLDatetime() and pool are accessible in this file

app.put('/api/edittip/:tipId', uploadTipMedia.array('mediaFiles', 10), async (req, res) => {
  const tipId = req.params.tipId;
  const userId = req.session.user?.id; // Assuming userId from session for authorization

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, categoryId, content, mediaToDelete } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Tip title is required.' });
  }
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Tip content is required.' });
  }

  const parsedCategoryId = parseInt(categoryId, 10);
  if (isNaN(parsedCategoryId) || parsedCategoryId <= 0) {
    return res.status(400).json({ error: 'Please select a valid tip category.' });
  }

  const safeTitle = title.trim();
  const safeContent = content.trim();
  const updatedAt = getMySQLDatetime();

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Start transaction

    const updateTipQuery = `
            UPDATE nearby_tips
            SET title = ?, category_id = ?, content = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `;
    const [updateResult] = await connection.query(updateTipQuery, [safeTitle, parsedCategoryId, safeContent, updatedAt, tipId, userId]);

    if (updateResult.affectedRows === 0) {
      await connection.rollback(); // Rollback if no rows updated
      connection.release();
      return res.status(404).json({ error: 'Tip not found or unauthorized to update.' });
    }

    // Handle media deletion
    let mediaToDeleteArray = [];
    if (mediaToDelete) {
      if (typeof mediaToDelete === 'string') {
        try {
          mediaToDeleteArray = JSON.parse(mediaToDelete);
        } catch (e) {
          await connection.rollback();
          connection.release();
          console.error('Failed to parse mediaToDelete:', e);
          return res.status(400).json({ error: 'Invalid mediaToDelete format.' });
        }
      } else if (Array.isArray(mediaToDelete)) {
        mediaToDeleteArray = mediaToDelete;
      }
    }

    if (mediaToDeleteArray.length > 0) {
      const deleteQuery = 'DELETE FROM nearby_tip_media WHERE media_url IN (?) AND tip_id = ?';
      await connection.query(deleteQuery, [mediaToDeleteArray, tipId]);
      // Optionally delete media files from disk here
    }

    // Handle media insertion
    const newMediaFiles = req.files || [];
    if (newMediaFiles.length > 0) {
      const mediaValues = newMediaFiles.map(file => [
        tipId,
        `/uploads/tip_media/${file.filename}`,
        file.mimetype.startsWith('image') ? 'image' : 'video'
      ]);
      const mediaInsertQuery = 'INSERT INTO nearby_tip_media (tip_id, media_url, media_type) VALUES ?';
      await connection.query(mediaInsertQuery, [mediaValues]);
    }

    await connection.commit(); // Commit transaction

    // --- Fetch the complete updated tip object for emission ---
    const fetchUpdatedTipQuery = `
            SELECT
              t.id, t.title, t.content, t.created_at, t.updated_at, t.category_id, ntc.name AS categoryName,
              u.userid AS userId, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture,
              'tip' AS postType,
              (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT('mediaUrl', media_url, 'mediaType', media_type)
                )
                FROM nearby_tip_media
                WHERE tip_id = t.id
              ) AS media,
              ns.id AS savedPostId, CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
              nl.id AS likedPostId, CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
              (SELECT COUNT(id) FROM nearby_likes WHERE post_id = t.id AND post_type = 'tip') AS likeCount
            FROM nearby_tips t
            JOIN nearby_users u ON t.user_id = u.userid
            JOIN nearby_tips_categories ntc ON t.category_id = ntc.id
            LEFT JOIN nearby_saved_posts ns ON t.id = ns.post_id AND ns.post_type = 'tip' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON t.id = nl.post_id AND nl.post_type = 'tip' AND nl.user_id = ?
            WHERE t.id = ?
        `;
    const [fetchResults] = await connection.query(fetchUpdatedTipQuery, [userId, userId, tipId]);

    if (fetchResults.length === 0) {
      console.error('Updated tip not found after successful update and media operations.');
      return res.status(404).json({ error: 'Updated tip not found.' });
    }

    const updatedTipData = fetchResults[0];
    let mediaArray = [];
    if (updatedTipData.media) {
      try {
        mediaArray = JSON.parse(updatedTipData.media); // Parse JSON_ARRAYAGG result
      } catch {
        console.warn('Failed to parse media JSON for updated tip, defaulting to empty array');
        mediaArray = [];
      }
    }

    const formattedUpdatedTip = {
      id: updatedTipData.id,
      title: updatedTipData.title,
      content: updatedTipData.content,
      createdAt: updatedTipData.created_at,
      editedAt: updatedTipData.updated_at,
      postType: updatedTipData.postType,
      categoryId: updatedTipData.category_id,
      categoryName: updatedTipData.categoryName,
      user: {
        userId: updatedTipData.userId, // Ensure userId is included for consistency
        username: updatedTipData.username,
        fullName: updatedTipData.fullName,
        profilePicture: updatedTipData.profile_picture
      },
      media: mediaArray,
      isSaved: !!updatedTipData.isSaved,
      savedPostId: updatedTipData.savedPostId,
      isLiked: !!updatedTipData.isLiked,
      likedPostId: updatedTipData.likedPostId,
      likeCount: updatedTipData.likeCount
    };

    // --- Emit WebSocket Event ---
    const io = req.app.get('io');
    if (io) {
      io.emit('tipUpdated', formattedUpdatedTip); // Emit to all connected clients
    } else {
      console.warn("Socket.IO instance not found on req.app.get('io')");
    }

    connection.release();
    res.json(formattedUpdatedTip);

  } catch (err) {
    if (connection) {
      await connection.rollback(); // Rollback transaction on error
      connection.release();
    }
    console.error('Error updating tip:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }
    res.status(500).json({ error: 'Failed to update tip.' });
  }
});


//get all tips API
// Add this new endpoint to your Express app
app.get('/api/nearby_tips', async (req, res) => {
  const currentUserId = req.session.user?.id;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: No user session' });
  }

  try {
    const connection = await pool.getConnection();

    const query = `
      SELECT
          t.id,
          t.title,
          t.content,
          t.created_at,
          t.updated_at,
          t.category_id,
          ntc.name AS categoryName,
          u.username, u.userid,
          CONCAT(u.firstname, ' ', u.lastname) AS fullName,
          u.profile_picture,
          'tip' AS postType,
          (
              SELECT JSON_ARRAYAGG(
                  JSON_OBJECT('mediaUrl', media_url, 'mediaType', media_type)
              )
              FROM nearby_tip_media
              WHERE tip_id = t.id
          ) AS media,
          ns.id AS savedPostId,
          CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
          nl.id AS likedPostId,
          CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
          COUNT(DISTINCT nl_count.id) AS likeCount
      FROM nearby_tips t
      JOIN nearby_users u ON t.user_id = u.userid
      JOIN nearby_tips_categories ntc ON t.category_id = ntc.id
      LEFT JOIN nearby_saved_posts ns ON t.id = ns.post_id AND ns.post_type = 'tip' AND ns.user_id = ?
      LEFT JOIN nearby_likes nl ON t.id = nl.post_id AND nl.post_type = 'tip' AND nl.user_id = ?
      LEFT JOIN nearby_likes nl_count ON t.id = nl_count.post_id AND nl_count.post_type = 'tip'
      GROUP BY t.id, t.category_id, ntc.name, u.username, u.firstname, u.lastname, u.profile_picture, ns.id, nl.id
      ORDER BY t.created_at DESC
    `;

    const params = [currentUserId, currentUserId];
    const [results] = await connection.query(query, params);

    connection.release();

    const formatted = results.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      editedAt: row.updated_at,
      postType: row.postType,
      categoryId: row.category_id,
      categoryName: row.categoryName,
      user: {
        username: row.username,
        fullName: row.fullName,
        profilePicture: row.profile_picture,
        userId: row.userid,
      },
      media: row.media || [],
      isSaved: !!row.isSaved,
      savedPostId: row.savedPostId,
      isLiked: !!row.isLiked,
      likedPostId: row.likedPostId,
      likeCount: row.likeCount,
    }));

    res.json(formatted);

  } catch (err) {
    console.error('Error fetching tips:', err);
    res.status(500).json({ error: 'Failed to fetch tips' });
  }
});


app.get('/api/tip_comments/:post_type/:post_id', async (req, res) => {
  const { post_type, post_id } = req.params;
  const currentUserId = req.session.user?.id;

  // Validate inputs
  const allowedPostTypes = ['post', 'tip', 'alert'];
  if (!allowedPostTypes.includes(post_type)) {
    return res.status(400).json({ error: 'Invalid post_type' });
  }
  if (!post_id) {
    return res.status(400).json({ error: 'post_id is required' });
  }
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: No user session' });
  }

  try {
    const connection = await pool.getConnection();

    const commentsQuery = `
      SELECT
        c.comment_id AS comment_id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        c.updated_at AS editedAt,
        u.username,
        u.profile_picture,
        CONCAT(u.firstname, ' ', u.lastname) AS fullname,
        CASE
          WHEN c.parent_comment_id IS NULL THEN
            EXISTS(SELECT 1 FROM nearby_posttype_comment_likes cl WHERE cl.user_id = ? AND cl.comment_id = c.comment_id AND cl.post_id = ?)
          ELSE
            EXISTS(SELECT 1 FROM nearby_posttype_reply_likes rl WHERE rl.user_id = ? AND rl.reply_id = c.comment_id AND rl.post_id = ? AND rl.parent_comment_id = c.parent_comment_id)
        END AS isLikedByCurrentUser,
        CASE
          WHEN c.parent_comment_id IS NULL THEN
            (SELECT COUNT(*) FROM nearby_posttype_comment_likes cl_count WHERE cl_count.comment_id = c.comment_id AND cl_count.post_id = ?)
          ELSE
            (SELECT COUNT(*) FROM nearby_posttype_reply_likes rl_count WHERE rl_count.reply_id = c.comment_id AND rl_count.post_id = ? AND rl_count.parent_comment_id = c.parent_comment_id)
        END AS likesCount
      FROM nearby_posttype_comments c
      JOIN nearby_users u ON c.user_id = u.userid
      WHERE c.post_type = ? AND c.post_id = ?
      ORDER BY c.created_at ASC
    `;

    const commentsParams = [
      currentUserId, post_id,
      currentUserId, post_id,
      post_id,
      post_id,
      post_type, post_id
    ];

    const [comments] = await connection.query(commentsQuery, commentsParams);

    if (comments.length === 0) {
      connection.release();
      return res.json({ comments: [] });
    }

    const commentIds = comments.map(c => c.comment_id);

    const mediaQuery = `
      SELECT comment_id, media_url, media_type
      FROM nearby_posttype_comment_media
      WHERE comment_id IN (?)
    `;

    const [mediaRows] = await connection.query(mediaQuery, [commentIds]);

    connection.release();

    const mediaByCommentId = {};
    mediaRows.forEach(media => {
      if (!mediaByCommentId[media.comment_id]) {
        mediaByCommentId[media.comment_id] = [];
      }
      mediaByCommentId[media.comment_id].push({
        mediaUrl: media.media_url,
        mediaType: media.media_type,
      });
    });

    const commentsWithMedia = comments.map(comment => ({
      ...comment,
      media: mediaByCommentId[comment.comment_id] || [],
    }));

    res.json({ comments: commentsWithMedia });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});


app.get('/api/nearby_tips_categories', async (req, res) => {
  const query = `SELECT id, name FROM nearby_tips_categories ORDER BY name`;

  let connection;
  try {
    connection = await pool.getConnection(); // getConnection returns a promise for mysql2/promise

    const [results] = await connection.query(query);

    connection.release();
    res.status(200).json(results);
  } catch (err) {
    if (connection) connection.release();
    console.error('Error fetching tips categories:', err);
    res.status(500).json({ error: 'Failed to fetch tips categories' });
  }
});


//Delete Tips post type


// --- NEW API FOR DELETING TIPS ---
app.delete('/api/tips/:id', async (req, res) => {
  const tipId = parseInt(req.params.id, 10);
  const userId = req.session.user?.id; // Assuming user ID is from session

  if (Number.isNaN(tipId)) {
    return res.status(400).json({ error: 'Invalid tip ID provided.' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in.' });
  }

  try {
    // Use withConnection to manage the database transaction and connection lifecycle
    await withConnection(async (connection) => {
      // Step 1: Verify tip exists and user is owner
      const [results] = await connection.query(
        'SELECT * FROM nearby_tips WHERE id = ? AND user_id = ?',
        [tipId, userId]
      );

      if (results.length === 0) {
        // If not found or unauthorized, throw an error to trigger rollback and outer catch
        throw { status: 404, message: 'Tip not found or unauthorized to delete.' };
      }


      // Step 2: Fetch media URLs and delete files from server
      const [mediaResults] = await connection.query(
        'SELECT media_url FROM nearby_tip_media WHERE tip_id = ?',
        [tipId]
      );

      if (mediaResults.length > 0) {
        const mediaUrls = mediaResults.map(m => m.media_url);
        try {
          // This function should be robust to handle potential errors internally
          // without stopping the database transaction.
          await deleteFilesFromServer(mediaUrls);
        } catch (fileDeleteErr) {
          console.error(`Error deleting files from server for tip ${tipId}:`, fileDeleteErr);
          // Log the error but don't re-throw, as DB deletion should continue
        }

        // Delete media DB records
        await connection.query('DELETE FROM nearby_tip_media WHERE tip_id = ?', [tipId]);
      } else {
      }

      // Step 3: Delete the tip itself
      const [deleteResult] = await connection.query(
        'DELETE FROM nearby_tips WHERE id = ?',
        [tipId]
      );

      if (deleteResult.affectedRows === 0) {
        // If tip wasn't actually deleted (e.g., race condition), throw error
        throw { status: 404, message: 'Tip not found for deletion after verification.' };
      }

      // After all database operations are successful and before sending response
      // Emit the WebSocket event
      const io = req.app.get('io');
      if (io) {

        io.emit('tipDeleted', { tipId });

      } else {
        console.warn("Socket.IO instance not found on req.app.get('io') for tip deletion.");
      }

      // Step 4: Send success response
      return res.status(200).json({ message: 'Tip deleted successfully.', tipId });
    }); // withConnection ends here, handling commit/rollback/release

  } catch (err) {
    // Handle errors thrown from within withConnection or the callback
    console.error('Error deleting tip:', err);

    // Check if the error object has a 'status' property (for custom errors like 404/401)
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    // Default to 500 for unexpected errors
    return res.status(500).json({ error: 'Failed to delete tip due to a server error.' });
  }
});


//--END OF ALL TIP POST TYPE LOGIC



//--SAVE POST FOR TIP, QUESTION AND ALERT
const fetchPostDetails = async (postId, postType) => {
  let tableName, idColumn;

  switch (postType) {
    case 'tip':
      tableName = 'nearby_tips';
      idColumn = 'id';
      break;
    case 'question':
      tableName = 'nearby_posts';
      idColumn = 'postId';
      break;
    case 'alert':
      tableName = 'nearby_alerts';
      idColumn = 'alertId';
      break;
    case 'group':
      tableName = 'nearby_groups';
      idColumn = 'groupId';
      break;
    default:
      throw new Error(`Unknown post type: ${postType}`);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(`SELECT * FROM ${tableName} WHERE ${idColumn} = ?`, [postId]);
    return results[0] || null;
  } catch (err) {
    console.error(`Error fetching ${postType} details for ID ${postId}:`, err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
};


// --- 1. Save a Post (POST /api/saved_posts) ---
// CORRECTED: Destructuring post_id and post_type
app.post('/api/saved_posts', async (req, res) => {
  const { post_id, post_type } = req.body;
  const user = req.session.user;
  const userId = user?.id;

  if (!post_id || !post_type || !userId) {
    return res.status(400).json({ error: 'Missing post_id, post_type, or user ID.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // 1️⃣ check if already saved
    const [existing] = await connection.query(
      'SELECT id FROM nearby_saved_posts WHERE user_id = ? AND post_id = ? AND post_type = ?',
      [userId, post_id, post_type]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: `Post type ${post_type} with ID ${post_id} is already saved by user ${userId}.`
      });
    }

    // 2️⃣ insert save record
    const [result] = await connection.query(
      'INSERT INTO nearby_saved_posts (user_id, post_id, post_type) VALUES (?, ?, ?)',
      [userId, post_id, post_type]
    );

    // 3️⃣ determine table and snippet column
    const meta = {
      tip: { table: 'nearby_tips', idCol: 'id', ownerCol: 'user_id', snippetCol: 'title' },
      alert: { table: 'nearby_alerts', idCol: 'alertId', ownerCol: 'userId', snippetCol: 'description' },
      question: { table: 'nearby_posts', idCol: 'postId', ownerCol: 'userid', snippetCol: 'content' },
      discussion: { table: 'nearby_posts', idCol: 'postId', ownerCol: 'userid', snippetCol: 'content' },
      group: { table: 'nearby_group_posts', idCol: 'post_id', ownerCol: 'user_id', snippetCol: 'content' }
    }[post_type];

    if (!meta) throw new Error(`Unsupported post type: ${post_type}`);

    // 4️⃣ fetch post owner + snippet
    const [rows] = await connection.query(
      `SELECT ${meta.ownerCol} AS ownerId, ${meta.snippetCol} AS rawText
       FROM ${meta.table}
       WHERE ${meta.idCol} = ?`,
      [post_id]
    );

    const recipientId = rows?.[0]?.ownerId;
    const snippet = (rows?.[0]?.rawText || '').slice(0, 100);
    const createdAt = getMySQLDatetime();

    // 5️⃣ notify post owner (if not self)
    if (recipientId && recipientId !== userId) {
      const [notif] = await connection.query(
        `INSERT INTO nearby_notifications (
           recipient_user_id, actor_user_id,
           action_type, target_type, target_id,
           parent_type, parent_id, metadata, created_at
         ) VALUES (?, ?, 'save', ?, ?, ?, ?, JSON_OBJECT(
           'post_type', ?, 'post_snippet', ?
         ), ?)`,
        [
          recipientId,
          userId,
          post_type,
          post_id,
          post_type,
          post_id,
          post_type,
          snippet,
          createdAt
        ]
      );

      const notificationId = notif.insertId;
      io.to(`user_${recipientId}`).emit('notification_count_update', {
        recipientUserId: recipientId          // the backend needs nothing else
      });
      // 6️⃣ emit socket event
      io.to(`user_${recipientId}`).emit('post_save_notification', {
        id: notificationId,
        recipientUserId: recipientId,
        actorUserId: userId,
        actorFullname: user.name,
        actorProfilePicture: user.profilePic,
        action_type: 'save',
        target_type: post_type,
        parent_type: post_type,
        postId: post_id,
        created_at: createdAt,
        metadata: {
          post_type: post_type,
          post_snippet: snippet
        },
        type: 'save'
      });
    }

    res.status(201).json({ message: 'Post saved successfully.', id: result.insertId });
  } catch (err) {
    console.error('Error saving post:', err);
    res.status(500).json({ error: 'Failed to save post due to a server error.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- 2. Unsave a Post (DELETE /api/saved_posts/:id) ---
// CORRECTED: Route path and parameter name
app.delete('/api/saved_posts/:id', async (req, res) => {
  const savedPostId = req.params.id;
  const userId = req.session.user?.id;

  if (!savedPostId || !userId) {
    return res.status(400).json({ error: 'Missing savedPostId or user ID.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      'DELETE FROM nearby_saved_posts WHERE id = ? AND user_id = ?',
      [savedPostId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Saved post not found for this user.' });
    }

    res.status(200).json({ message: 'Post unsaved successfully.' });
  } catch (err) {
    console.error('Error unsaving post:', err);
    res.status(500).json({ error: 'Failed to unsave post due to a server error.' });
  } finally {
    if (connection) connection.release();
  }
});


// --- 3. Fetch All Saved Posts for the Current User (GET /api/saved_posts/me) ---
// CORRECTED: Ensure 'id' (PK of nearby_saved_posts) is selected
app.get('/api/saved_posts/me', async (req, res) => {
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID not available.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [savedEntries] = await connection.query(
      'SELECT id, post_id, post_type FROM nearby_saved_posts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    if (savedEntries.length === 0) {
      return res.status(200).json([]);
    }

    const detailedPosts = await Promise.all(
      savedEntries.map(async (entry) => {
        try {
          const details = await new Promise((resolve, reject) => {
            fetchPostDetails(entry.post_id, entry.post_type, (err, data) => {
              if (err) return resolve(null);
              resolve(data);
            });
          });

          if (!details) {
            console.warn(`Missing details for saved post ${entry.post_type} ID ${entry.post_id}`);
            return null;
          }

          return {
            ...details,
            id: details.id || details.postId || details.alertId,
            postType: entry.post_type,
            isSaved: true,
            savedPostId: entry.id
          };
        } catch (err) {
          console.error(`Error getting saved post detail:`, err);
          return null;
        }
      })
    );

    res.status(200).json(detailedPosts.filter(Boolean));
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ error: 'Failed to fetch saved posts.' });
  } finally {
    if (connection) connection.release();
  }
});

//--END OF SAVED POST LOGIC------




// --- LIKE / UNLIKE POST ENDPOINTS ---

// To like a post
app.post('/api/like', async (req, res) => {
  const { post_id: postId, post_type: postType } = req.body;

  const user = req.session.user;                // <- full user object
  const userId = user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required to like a post.' });
  }
  if (!postId || !postType) {
    return res.status(400).json({ error: 'Post ID and post type are required.' });
  }

  /* 🔄 1. map postType → table / id‑col / owner‑col (+ optional WHERE filter) */
  const typeMap = {
    tip: { table: 'nearby_tips', idCol: 'id', ownerCol: 'user_id' },
    alert: { table: 'nearby_alerts', idCol: 'alertId', ownerCol: 'userId' },
    group: { table: 'nearby_group_posts', idCol: 'post_id', ownerCol: 'user_id' },
    question: { table: 'nearby_posts', idCol: 'postid', ownerCol: 'userid', filter: 'type = "question"' },
    discussion: { table: 'nearby_posts', idCol: 'postid', ownerCol: 'userid', filter: 'type = "discussion"' }
  };

  const meta = typeMap[postType];
  if (!meta) {
    return res.status(400).json({ error: `Unsupported post type: ${postType}` });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    /* 2️⃣ like row (dedupe enforced by a UNIQUE on (user_id, post_id, post_type) ) */
    await connection.query(
      `INSERT INTO nearby_likes (user_id, post_id, post_type)
       VALUES (?, ?, ?)`,
      [userId, postId, postType]
    );

    /* 3️⃣ fetch post owner */
    // 3️⃣ fetch post owner + text for snippet
    const snippetCol = {
      tip: 'title',
      alert: 'description',
      group: 'content',
      question: 'content',
      discussion: 'content'
    }[postType];

    const where = [`${meta.idCol} = ?`];
    if (meta.filter) where.push(meta.filter);

    const [rows] = await connection.query(
      `SELECT ${meta.ownerCol} AS ownerId, ${snippetCol} AS rawText
   FROM ${meta.table}
   WHERE ${where.join(' AND ')}`,
      [postId]
    );

    const recipientId = rows?.[0]?.ownerId;
    const snippet = (rows?.[0]?.rawText || '').slice(0, 100);


    /* 4️⃣ insert notification + emit socket */
    if (recipientId && recipientId !== userId) {
      const createdAt = getMySQLDatetime();

      const [notif] = await connection.query(
        `INSERT INTO nearby_notifications (
           recipient_user_id, actor_user_id, action_type,
           target_type,  target_id,
           parent_type,  parent_id,
           metadata,     created_at
) VALUES (?, ?, 'like', ?, ?, ?, ?, JSON_OBJECT(
  'post_type', ?, 'post_snippet', ?
), ?)`,
        [
          recipientId,
          userId,
          postType,
          postId,
          postType,
          postId,
          postType,
          snippet,
          createdAt
        ]

      );
      const notificationId = notif.insertId;

      /* >>> THIS LINE sends the “badge‑count” style update <<< */
      io.to(`user_${recipientId}`).emit('notification_count_update', {
        recipientUserId: recipientId
      });


      /* 🔌 socket.io push */
      io.to(`user_${recipientId}`).emit('post_like_notification', {
        id: notificationId,
        recipientUserId: recipientId,
        actorUserId: userId,
        actorFullname: user.name,
        actorProfilePicture: user.profilePic,
        action_type: 'like',
        target_type: postType,      // 'tip', 'alert', ...
        parent_type: postType,
        postId,
        created_at: createdAt,
        metadata: {
          post_type: postType,
          post_snippet: snippet
        },
        type: 'like'
      });
    }

    await connection.commit();
    res.status(201).json({ message: 'Post liked successfully.' });

  } catch (err) {
    if (connection) await connection.rollback();

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You have already liked this post.' });
    }
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Failed to like post.' });

  } finally {
    if (connection) connection.release();
  }
});


app.delete('/api/like/:postId/:postType', async (req, res) => {
  const { postId, postType } = req.params;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required to unlike a post.' });
  }

  if (!postId || !postType) {
    return res.status(400).json({ error: 'Post ID and post type are required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `
      DELETE FROM nearby_likes
      WHERE user_id = ? AND post_id = ? AND post_type = ?
    `;

    const [result] = await connection.query(query, [userId, postId, postType]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Like not found or already removed.' });
    }

    res.status(200).json({ message: 'Post unliked successfully.' });
  } catch (err) {
    console.error('Error unliking post:', err);
    res.status(500).json({ error: 'Failed to unlike post.' });
  } finally {
    if (connection) connection.release();
  }
});




// POST /api/comments/:commentId/like - Like a top-level comment
app.post('/api/comments/:commentId/like', async (req, res) => {
  const { commentId } = req.params;
  const { postId, postType } = req.body;
  const userId = req.session.user?.id;
  const user = req.session.user;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!commentId || !postId || !postType) {
    return res.status(400).json({ error: 'Comment ID, Post ID, and Post Type are required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const likeInsertQuery = `
      INSERT INTO nearby_posttype_comment_likes (user_id, comment_id, post_id)
      VALUES (?, ?, ?)
    `;
    const [likeResult] = await connection.query(likeInsertQuery, [userId, commentId, postId]);

    let commentTable, idColumn, userIdColumn;
    switch (postType) {
      case 'alert':
        commentTable = 'nearby_alert_comments';
        idColumn = 'comment_id';
        userIdColumn = 'user_id';
        break;
      case 'discussion':
        commentTable = 'nearby_post_comments';
        idColumn = 'commentid';
        userIdColumn = 'userid';
        break;
      case 'question':
        commentTable = 'nearby_answers';
        idColumn = 'answerid';
        userIdColumn = 'userid';
        break;
      case 'group':
        commentTable = 'nearby_group_comments';
        idColumn = 'comment_id';
        userIdColumn = 'user_id';
        break;
      case 'tip':
      default:
        commentTable = 'nearby_posttype_comments';
        idColumn = 'comment_id';
        userIdColumn = 'user_id';
    }

    const [commentRows] = await connection.query(`
      SELECT ${userIdColumn} AS user_id, content 
      FROM ${commentTable}
      WHERE ${idColumn} = ?
    `, [commentId]);

    if (commentRows.length > 0) {
      const recipientId = commentRows[0].user_id;
      const commentSnippet = commentRows[0].content.slice(0, 100);
      const createdAt = getMySQLDatetime(); // <-- Add this line

      if (recipientId !== userId) {
        await connection.query(`
          INSERT INTO nearby_notifications (
            recipient_user_id,
            actor_user_id,
            action_type,
            target_type,
            target_id,
            parent_type,
            parent_id,
            metadata,
            created_at
          ) VALUES (?, ?, 'like', 'comment', ?, 'post', ?, JSON_OBJECT(
            'comment_snippet', ?,
            'post_id', ?,
            'post_type', ?
          ), ?)
        `, [
          recipientId,
          userId,
          commentId,
          postId,
          commentSnippet,
          postId,
          postType,
          createdAt // <-- Use createdAt in query
        ]);


        /* >>> THIS LINE sends the “badge‑count” style update <<< */
        io.to(`user_${recipientId}`).emit('notification_count_update', {
          recipientUserId: recipientId
        });

        io.to(`user_${recipientId}`).emit('comment_like_notification', {
          recipientUserId: recipientId,
          actorUserId: userId,
          actorFullname: user.name,
          actorProfilePicture: user.profilePic,
          action_type: 'like',
          target_type: 'comment',
          parent_type: 'post',
          postId,
          commentId,
          comment_snippet: commentSnippet,
          post_type: postType,
          created_at: createdAt, // <-- Use same createdAt here
          type: 'like',
        });
      }
    }

    res.status(201).json({ message: 'Comment liked successfully.', likeId: likeResult.insertId });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You have already liked this comment.' });
    }
    console.error('Error liking comment:', err);
    res.status(500).json({ error: 'Failed to like comment.' });
  } finally {
    if (connection) connection.release();
  }
});



// DELETE /api/comments/:commentId/like - Unlike a top-level comment
app.delete('/api/comments/:commentId/like', async (req, res) => {
  const { commentId } = req.params;
  const { postId, postType } = req.body; // Add postType in frontend call too
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!commentId || !postId || !postType) {
    return res.status(400).json({ error: 'Comment ID, Post ID, and Post Type are required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // First, delete the like
    const deleteLikeQuery = `
      DELETE FROM nearby_posttype_comment_likes
      WHERE user_id = ? AND comment_id = ? AND post_id = ?
    `;
    const [result] = await connection.query(deleteLikeQuery, [userId, commentId, postId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Comment like not found or already removed.' });
    }

    // Now remove the corresponding notification
    const deleteNotificationQuery = `
      DELETE FROM nearby_notifications
      WHERE 
        actor_user_id = ? AND
        target_type = 'comment' AND
        target_id = ? AND
        action_type = 'like' AND
        parent_type = 'post' AND
        parent_id = ? AND
        JSON_EXTRACT(metadata, '$.post_type') = ?
    `;
    await connection.query(deleteNotificationQuery, [
      userId,
      commentId,
      postId,
      postType
    ]);

    res.status(200).json({ message: 'Comment unliked and notification removed.' });

  } catch (err) {
    console.error('Error unliking comment:', err);
    res.status(500).json({ error: 'Failed to unlike comment.' });
  } finally {
    if (connection) connection.release();
  }
});



// POST /api/replies/:replyId/like - Like a reply
app.post('/api/replies/:replyId/like', async (req, res) => {
  const { replyId } = req.params;
  const { postId, parentCommentId, postType } = req.body;
  const user = req.session.user;
  const userId = user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!replyId || !postId || !parentCommentId || !postType) {
    return res.status(400).json({ error: 'Reply ID, Post ID, Parent Comment ID, and Post Type are required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const insertLikeQuery = `
      INSERT INTO nearby_posttype_reply_likes (user_id, reply_id, parent_comment_id, post_id)
      VALUES (?, ?, ?, ?)
    `;
    const [likeResult] = await connection.query(insertLikeQuery, [userId, replyId, parentCommentId, postId]);

    let commentTable, idColumn, idUser;
    switch (postType) {
      case 'alert':
        commentTable = 'nearby_alert_comments';
        idColumn = 'comment_id';
        idUser = 'user_id';
        break;
      case 'discussion':
        commentTable = 'nearby_post_comments';
        idColumn = 'commentid';
        idUser = 'userid';
        break;
      case 'tip':
        commentTable = 'nearby_posttype_comments';
        idColumn = 'comment_id';
        idUser = 'user_id';
        break;
      case 'question':
        commentTable = 'nearby_answers';
        idColumn = 'answerid';
        idUser = 'userid';
        break;
      case 'group':
        commentTable = 'nearby_group_comments';
        idColumn = 'comment_id';
        idUser = 'user_id';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported postType.' });
    }

    // Fetch the reply's author and content
    const [replyRows] = await connection.query(
      `SELECT ${idUser} AS user_id, content FROM ${commentTable} WHERE ${idColumn} = ?`,
      [replyId]
    );


    if (replyRows.length > 0) {
      const recipientId = replyRows[0].user_id;
      const commentSnippet = (replyRows[0].content || '').slice(0, 100);
      const createdAt = getMySQLDatetime();

      if (recipientId !== userId) {
        // Insert notification
        try {
          console.log('Preparing to insert reply like notification for recipient:', recipientId);

          await connection.query(`
          INSERT INTO nearby_notifications (
            recipient_user_id,
            actor_user_id,
            action_type,
            target_type,
            target_id,
            parent_type,
            parent_id,
            metadata,
            created_at
          )
          VALUES (?, ?, 'like', 'reply', ?, 'comment', ?, JSON_OBJECT(
            'comment_snippet', ?,
            'post_id', ?,
            'post_type', ?
          ), ?)
        `, [
            recipientId,
            userId,
            replyId,
            parentCommentId,
            commentSnippet,
            postId,
            postType,
            createdAt
          ]);
        } catch (err) {
          console.error('Failed to insert reply like notification:', err);
        }

        /* >>> THIS LINE sends the “badge‑count” style update <<< */
        io.to(`user_${recipientId}`).emit('notification_count_update', {
          recipientUserId: recipientId
        });

        // Emit socket notification
        io.to(`user_${recipientId}`).emit('reply_like_notification', {
          recipientUserId: recipientId,
          actorUserId: userId,
          actorFullname: user.name,
          actorProfilePicture: user.profilePic,
          action_type: 'like',
          target_type: 'reply',
          parent_type: 'comment',
          commentId: parentCommentId,
          replyId,

          metadata: {
            comment_snippet: commentSnippet,
            post_id: postId,
            post_type: postType,
          },
          created_at: createdAt,
          type: 'like',
        });
      }
    }

    res.status(201).json({ message: 'Reply liked successfully.', likeId: likeResult.insertId });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You have already liked this reply.' });
    }
    console.error('Error liking reply:', err);
    res.status(500).json({ error: 'Failed to like reply.' });
  } finally {
    if (connection) connection.release();
  }
});



// DELETE /api/replies/:replyId/like - Unlike a reply
app.delete('/api/replies/:replyId/like', async (req, res) => { // Added 'async'
  const { replyId } = req.params;
  const { postId, parentCommentId } = req.body; // Expect postId and parentCommentId
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!replyId || !postId || !parentCommentId) {
    return res.status(400).json({ error: 'Reply ID, Post ID, and Parent Comment ID are required.' });
  }

  let connection; // Declare connection outside try for finally block access
  try {
    connection = await pool.getConnection(); // Get connection from the pool

    const query = `
      DELETE FROM nearby_posttype_reply_likes
      WHERE user_id = ? AND reply_id = ? AND parent_comment_id = ? AND post_id = ?
    `;

    // Execute query using promise-based connection.query
    const [result] = await connection.query(query, [userId, replyId, parentCommentId, postId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reply like not found or already removed.' });
    }

    res.status(200).json({ message: 'Reply unliked successfully.' });

  } catch (err) {
    console.error('Error unliking reply:', err);
    res.status(500).json({ error: 'Failed to unlike reply.' });
  } finally {
    // Always release the connection in the finally block
    if (connection) connection.release();
  }
});




//
app.put('/api/tips/:postId/comments/:commentId', uploadTipMedia.array('mediaFiles', 10), async (req, res) => {
  const { postId, commentId } = req.params;
  if (!req.session?.user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  let content = req.body.content || '';
  let parentCommentId = req.body.parentCommentId || null;
  let mediaToRemove = [];

  try {
    if (req.body.mediaToRemove) {
      mediaToRemove = JSON.parse(req.body.mediaToRemove);
      if (!Array.isArray(mediaToRemove)) mediaToRemove = [mediaToRemove];
    }
  } catch (err) {
    console.error('Invalid mediaToRemove JSON', err);
    return res.status(400).json({ error: 'Invalid mediaToRemove format' });
  }

  const safeContent = sanitizeHtml(content.trim(), {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: { a: ['href'] },
  });

  if (!safeContent && (!req.files || req.files.length === 0) && mediaToRemove.length === 0) {
    return res.status(400).json({ error: 'Content or media required for update' });
  }

  const editedAt = getMySQLDatetime();

  try {
    await withConnection(async (conn) => {
      // 1. Update comment content
      await conn.query(
        `UPDATE nearby_posttype_comments
         SET content = ?, parent_comment_id = ?, updated_at = ?
         WHERE comment_id = ? AND post_id = ? AND post_type = 'tip' AND user_id = ?`,
        [safeContent, parentCommentId, editedAt, commentId, postId, req.session.user.id]
      );

      // 2. Delete media if requested
      if (mediaToRemove.length > 0) {
        // Fetch media urls to delete files locally
        const [mediaRows] = await conn.query(
          `SELECT media_url FROM nearby_posttype_comment_media WHERE comment_id = ? AND media_url IN (?)`,
          [commentId, mediaToRemove]
        );

        mediaRows.forEach(row => {
          const mediaPath = path.join(__dirname, '..', row.media_url);
          fs.unlink(mediaPath, (err) => {
            if (err) console.warn('File deletion failed:', mediaPath, err.message);
          });
        });

        // Delete from DB
        await conn.query(
          `DELETE FROM nearby_posttype_comment_media WHERE comment_id = ? AND media_url IN (?)`,
          [commentId, mediaToRemove]
        );
      }

      // 3. Insert new media files if any
      if (req.files && req.files.length > 0) {
        const mediaInsertValues = req.files.map(file => [
          commentId,
          `/uploads/tip_media/${file.filename}`,
          file.mimetype.startsWith('video') ? 'video' : 'image',
        ]);
        await conn.query(
          `INSERT INTO nearby_posttype_comment_media (comment_id, media_url, media_type) VALUES ?`,
          [mediaInsertValues]
        );
      }

      // 4. Fetch updated comment with media and user info
      const [rows] = await conn.query(
        `SELECT c.comment_id, c.content, c.created_at, c.updated_at,
                c.user_id, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullname, u.profile_picture,
                m.media_url, m.media_type
         FROM nearby_posttype_comments c
         JOIN nearby_users u ON c.user_id = u.userid
         LEFT JOIN nearby_posttype_comment_media m ON c.comment_id = m.comment_id
         WHERE c.comment_id = ?`,
        [commentId]
      );

      if (rows.length === 0) {
        throw new Error('Comment not found');
      }

      const base = rows[0];
      const media = rows.filter(r => r.media_url).map(r => ({
        mediaUrl: r.media_url,
        mediaType: r.media_type,
      }));

      res.status(200).json({
        message: 'Comment updated successfully',
        comment: {
          id: base.comment_id,
          content: base.content,
          createdAt: base.created_at,
          editedAt: base.updated_at,
          media,
          isLikedByCurrentUser: false, // Add logic if needed
          likesCount: 0,              // Add logic if needed
          user: {
            userId: base.user_id,
            fullName: base.fullname,
            username: base.username,
            profilePicture: base.profile_picture,
          }
        }
      });
    });
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});



app.put('/api/alerts/:alertId/comments/:commentId', uploadAlertImage.array('mediaFiles', 5), async (req, res) => {
  const alertId = parseInt(req.params.alertId, 10);
  const commentId = parseInt(req.params.commentId, 10);
  const { content, parent_comment_id } = req.body;

  // Parse mediaToRemove safely
  let mediaUrlsToRemove = [];
  if (req.body.mediaToRemove) {
    try {
      mediaUrlsToRemove = typeof req.body.mediaToRemove === 'string'
        ? JSON.parse(req.body.mediaToRemove)
        : req.body.mediaToRemove;
      if (!Array.isArray(mediaUrlsToRemove)) mediaUrlsToRemove = [mediaUrlsToRemove];
    } catch {
      return res.status(400).json({ error: 'Invalid mediaToRemove format' });
    }
  }

  if (Number.isNaN(alertId) || Number.isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid alertId or commentId' });
  }

  const editedAt = getMySQLDatetime();

  try {
    await withConnection(async (conn) => {
      // Update comment
      await conn.query(
        `UPDATE nearby_alert_comments 
         SET content = ?, parent_comment_id = ?, edited_at = ?
         WHERE comment_id = ? AND alert_id = ?`,
        [content, parent_comment_id || null, editedAt, commentId, alertId]
      );

      // Delete media if any
      if (mediaUrlsToRemove.length > 0) {
        // Fetch URLs to delete files from filesystem
        const [mediaRows] = await conn.query(
          `SELECT media_url FROM nearby_alert_comment_media 
           WHERE comment_id = ? AND media_url IN (?)`,
          [commentId, mediaUrlsToRemove]
        );

        for (const row of mediaRows) {
          const filePath = path.join(__dirname, '..', row.media_url);
          fs.unlink(filePath, (err) => {
            if (err) console.warn('File delete error:', err);
          });
        }

        // Delete from DB
        await conn.query(
          `DELETE FROM nearby_alert_comment_media WHERE comment_id = ? AND media_url IN (?)`,
          [commentId, mediaUrlsToRemove]
        );
      }

      // Insert new media files if any
      if (req.files && req.files.length > 0) {
        const mediaData = req.files.map(file => [
          commentId,
          `/uploads/alerts_images/${file.filename}`,
          file.mimetype.startsWith('video/') ? 'video' : 'image',
        ]);

        await conn.query(
          'INSERT INTO nearby_alert_comment_media (comment_id, media_url, media_type) VALUES ?',
          [mediaData]
        );
      }

      // Fetch updated comment and media
      const [results] = await conn.query(
        `SELECT c.comment_id, c.content, c.parent_comment_id, c.created_at, c.edited_at,
                u.userid as user_id, u.username,
                GROUP_CONCAT(m.media_url) as media_urls,
                GROUP_CONCAT(m.media_type) as media_types
         FROM nearby_alert_comments c
         JOIN nearby_users u ON c.user_id = u.userid
         LEFT JOIN nearby_alert_comment_media m ON c.comment_id = m.comment_id
         WHERE c.comment_id = ?
         GROUP BY c.comment_id`,
        [commentId]
      );

      if (!results || results.length === 0) {
        throw new Error('Comment not found');
      }

      const comment = results[0];

      let media = [];
      if (comment.media_urls) {
        const urls = comment.media_urls.split(',');
        const types = comment.media_types.split(',');
        media = urls.map((url, i) => ({ mediaUrl: url, mediaType: types[i] }));
      }

      const updatedComment = {
        commentId: comment.comment_id,
        content: comment.content,
        parentCommentId: comment.parent_comment_id,
        createdAt: comment.created_at,
        editedAt: comment.edited_at,
        user: {
          id: comment.user_id,
          username: comment.username,
        },
        media,
      };

      res.json({ message: 'Comment updated successfully', comment: updatedComment });
    });
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});



const uploadAnswer = multer({ storage: questionsAnswerImageStorage });

app.put('/api/questions/:postId/answers/:commentId', uploadAnswer.array('files'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const postId = parseInt(req.params.postId, 10);
  const commentId = parseInt(req.params.commentId, 10);
  if (Number.isNaN(postId) || Number.isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid postId or commentId' });
  }

  let { content, parentCommentId = null, mediaToRemove = [] } = req.body;
  content = (content || '').trim();

  // Normalize mediaToRemove to array
  if (typeof mediaToRemove === 'string') {
    try {
      mediaToRemove = JSON.parse(mediaToRemove);
      if (!Array.isArray(mediaToRemove)) mediaToRemove = [mediaToRemove];
    } catch {
      mediaToRemove = [mediaToRemove];
    }
  }
  if (!Array.isArray(mediaToRemove)) mediaToRemove = [];

  const files = req.files || [];

  if (!content && files.length === 0 && mediaToRemove.length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const editedAt = getMySQLDatetime();

  try {
    await withConnection(async (conn) => {
      // Update the answer content
      await conn.query(
        `UPDATE nearby_answers
         SET content = ?, parent_answer_id = ?, updated_at = ?
         WHERE answerid = ? AND postid = ? AND userid = ?`,
        [content, parentCommentId, editedAt, commentId, postId, user.id]
      );

      // Remove media marked for deletion
      if (mediaToRemove.length > 0) {
        // Get URLs to delete files
        const [mediaRows] = await conn.query(
          `SELECT media_url FROM nearby_answer_media WHERE answer_id = ? AND media_url IN (?)`,
          [commentId, mediaToRemove]
        );

        // Delete from DB
        await conn.query(
          `DELETE FROM nearby_answer_media WHERE answer_id = ? AND media_url IN (?)`,
          [commentId, mediaToRemove]
        );

        // Delete files asynchronously
        mediaRows.forEach(({ media_url }) => {
          const filePath = path.join(__dirname, '..', media_url.replace(/^\/+/, ''));
          fs.unlink(filePath, (err) => {
            if (err) console.warn(`Failed to delete file ${filePath}:`, err.message);
          });
        });
      }

      // Insert new media files if any
      if (files.length > 0) {
        const insertValues = files.map(f => [
          commentId,
          `/uploads/questions_answer_images/${f.filename}`,
          f.mimetype.startsWith('video') ? 'video' : 'image',
        ]);

        await conn.query(
          `INSERT INTO nearby_answer_media (answer_id, media_url, media_type) VALUES ?`,
          [insertValues]
        );
      }

      // Fetch updated answer with media
      const [rows] = await conn.query(
        `SELECT a.answerid AS commentId, a.content, a.parent_answer_id AS parentCommentId,
                a.created_at AS createdAt, a.updated_at AS editedAt,
                u.userid AS userId, u.username,
                m.mediaid, m.media_url AS mediaUrl, m.media_type AS mediaType
         FROM nearby_answers a
         LEFT JOIN nearby_users u ON a.userid = u.userid
         LEFT JOIN nearby_answer_media m ON m.answer_id = a.answerid
         WHERE a.answerid = ?`,
        [commentId]
      );

      if (!rows.length) {
        throw new Error('Updated answer not found');
      }

      // Aggregate media
      const base = {
        commentId: rows[0].commentId,
        content: rows[0].content,
        parentCommentId: rows[0].parentCommentId,
        createdAt: rows[0].createdAt,
        editedAt: rows[0].editedAt,
        user: {
          id: rows[0].userId,
          username: rows[0].username,
        },
        media: [],
      };

      base.media = rows.filter(r => r.mediaUrl).map(r => ({
        mediaUrl: r.mediaUrl,
        mediaType: r.mediaType,
      }));

      res.json({ message: 'Answer updated successfully', comment: base });
    });
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({ error: 'Failed to update answer', details: error.message });
  }
});


app.delete('/api/questions/:postId/answers/:answerId', async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const answerId = parseInt(req.params.answerId, 10);

  if (Number.isNaN(postId) || Number.isNaN(answerId)) {
    return res.status(400).json({ error: 'Invalid postId or answerId' });
  }

  if (!req.session?.user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    await withConnection(async (conn) => {
      // Get media URLs to delete files
      const [mediaResults] = await conn.query(
        `SELECT media_url FROM nearby_answer_media WHERE answer_id = ?`,
        [answerId]
      );

      // Delete media records
      await conn.query(
        `DELETE FROM nearby_answer_media WHERE answer_id = ?`,
        [answerId]
      );

      // Delete answer itself (only if user owns it and postId matches)
      const [result] = await conn.query(
        `DELETE FROM nearby_answers WHERE answerid = ? AND postid = ? AND userid = ?`,
        [answerId, postId, req.session.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Answer not found or not authorized' });
      }

      // Delete media files asynchronously
      mediaResults.forEach(({ media_url }) => {
        const filePath = path.join(__dirname, '..', media_url.replace(/^\/+/, ''));
        fs.unlink(filePath, (err) => {
          if (err) console.warn(`Failed to delete media file ${filePath}:`, err.message);
        });
      });

      res.json({ message: 'Answer and associated media deleted successfully' });
    });
  } catch (err) {
    console.error('Delete failed:', err);
    res.status(500).json({ error: 'Failed to delete answer', details: err.message });
  }
});



//

app.delete('/api/tips/:postId/comments/:commentId', async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const commentId = parseInt(req.params.commentId, 10);

  if (Number.isNaN(postId) || Number.isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid postId or commentId' });
  }

  if (!req.session?.user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    await withConnection(async (conn) => {
      // Get media URLs linked to comment
      const [mediaRows] = await conn.query(
        `SELECT media_url FROM nearby_posttype_comment_media WHERE comment_id = ?`,
        [commentId]
      );

      // Delete media records
      await conn.query(
        `DELETE FROM nearby_posttype_comment_media WHERE comment_id = ?`,
        [commentId]
      );

      // Delete comment (make sure user owns it and post_type is 'tip')
      const [result] = await conn.query(
        `DELETE FROM nearby_posttype_comments 
         WHERE comment_id = ? AND post_id = ? AND user_id = ? AND post_type = 'tip'`,
        [commentId, postId, req.session.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Comment not found or not authorized' });
      }

      // Delete files asynchronously
      mediaRows.forEach(({ media_url }) => {
        const filePath = path.join(__dirname, '..', media_url.replace(/^\/+/, ''));
        fs.unlink(filePath, (err) => {
          if (err) console.warn(`Failed to delete file ${filePath}:`, err.message);
        });
      });

      res.json({ message: 'Comment deleted successfully' });
    });
  } catch (error) {
    console.error('Delete comment failed:', error);
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
  }
});


//Delete Alert comments:
app.delete('/api/alerts/:alertId/comments/:commentId', async (req, res) => {
  const alertId = parseInt(req.params.alertId, 10);
  const commentId = parseInt(req.params.commentId, 10);

  if (Number.isNaN(alertId) || Number.isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid alertId or commentId' });
  }

  if (!req.session?.user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    await withConnection(async (conn) => {
      // Fetch media URLs linked to comment
      const [mediaRows] = await conn.query(
        `SELECT media_url FROM nearby_alert_comment_media WHERE comment_id = ?`,
        [commentId]
      );

      // Delete media records from DB
      const [deleteMediaResult] = await conn.query(
        `DELETE FROM nearby_alert_comment_media WHERE comment_id = ?`,
        [commentId]
      );

      // Delete comment itself (user must own the comment)
      const [deleteCommentResult] = await conn.query(
        `DELETE FROM nearby_alert_comments WHERE comment_id = ? AND alert_id = ? AND user_id = ?`,
        [commentId, alertId, req.session.user.id]
      );

      if (deleteCommentResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Comment not found or not authorized' });
      }

      // Delete media files asynchronously
      mediaRows.forEach(({ media_url }) => {
        // media_url like '/uploads/alerts_images/alert-123456.jpg'
        // Remove leading '/uploads/' to get relative path under uploadDir
        const relativePath = media_url.replace(/^\/uploads\//, '');
        const filePath = path.join(uploadDir, relativePath);
        fs.unlink(filePath, (err) => {
          if (err) console.warn(`Failed to delete media file ${filePath}:`, err.message);
        });
      });

      res.json({ message: 'Comment and associated media deleted successfully' });
    });
  } catch (error) {
    console.error('Failed to delete alert comment:', error);
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
  }
});


//DIsucussion Post type

app.post('/api/createDiscussionPost', uploadDiscussionMedia.array('mediaFiles'), async (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const content = xss(req.body.content || '').trim(); // Trim content
  const files = req.files || [];
  const createdAt = getMySQLDatetime(); // UTC

  if (!content) {
    return res.status(400).json({ error: 'Discussion content cannot be empty.' });
  }

  let connection; // Declare connection outside try block for finally
  try {
    connection = await pool.getConnection(); // Assuming 'pool' is your database connection pool
    await connection.beginTransaction(); // Start transaction

    // Insert discussion post
    const [result] = await connection.query(
      `INSERT INTO nearby_posts (userid, content, created_at, type)
             VALUES (?, ?, ?, 'discussion')`,
      [userId, content, createdAt]
    );

    const postId = result.insertId;

    // Prepare media insert values
    const mediaInserts = files.map(file => [
      postId,
      `/uploads/discussion_media/${file.filename}`,
      file.mimetype.startsWith('video') ? 'video' : 'image',
    ]);

    // Insert media records if files exist
    if (mediaInserts.length > 0) {
      await connection.query(
        `INSERT INTO nearby_post_media (postid, media_url, media_type) VALUES ?`,
        [mediaInserts]
      );
    }

    await connection.commit(); // Commit transaction

    // --- Fetch the complete new discussion post object ---
    const fetchNewDiscussionPostQuery = `
            SELECT
                p.postid AS id, p.content, p.created_at, p.updated_at AS editedAt,
                u.userid AS userId, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture,
                p.type AS postType,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('mediaUrl', pm.media_url, 'mediaType', pm.media_type)
                    )
                    FROM nearby_post_media pm
                    WHERE pm.postid = p.postid
                ) AS media,
                ns.id AS savedPostId, CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                nl.id AS likedPostId, CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
                (SELECT COUNT(id) FROM nearby_likes WHERE post_id = p.postid AND post_type = 'discussion') AS likeCount
            FROM nearby_posts p
            JOIN nearby_users u ON p.userid = u.userid
            LEFT JOIN nearby_saved_posts ns ON p.postid = ns.post_id AND ns.post_type = 'discussion' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON p.postid = nl.post_id AND nl.post_type = 'discussion' AND nl.user_id = ?
            WHERE p.postid = ? AND p.type = 'discussion'
        `;
    const [newPostRows] = await connection.query(fetchNewDiscussionPostQuery, [userId, userId, postId]);

    if (newPostRows.length === 0) {
      console.error('New discussion post not found after creation.');
      return res.status(500).json({ error: 'Discussion post created but failed to retrieve full data.' });
    }

    const newPostRaw = newPostRows[0];

    // Robustly parse media JSON
    let newMediaArray = [];
    if (newPostRaw.media) {
      if (typeof newPostRaw.media === 'string') {
        try {
          newMediaArray = JSON.parse(newPostRaw.media);
        } catch (parseError) {
          console.warn('Failed to parse media JSON for new discussion post, defaulting to empty array:', parseError);
          newMediaArray = [];
        }
      } else if (Array.isArray(newPostRaw.media)) {
        newMediaArray = newPostRaw.media;
      }
    }

    // Format the discussion post object to match frontend PostCard expectations
    const formattedNewPost = {
      id: newPostRaw.id,
      content: newPostRaw.content,
      createdAt: newPostRaw.created_at,
      editedAt: newPostRaw.editedAt,
      postType: newPostRaw.postType,
      user: {
        userId: newPostRaw.userId,
        username: newPostRaw.username,
        fullName: newPostRaw.fullName,
        profilePicture: newPostRaw.profile_picture,
      },
      media: newMediaArray,
      isSaved: !!newPostRaw.isSaved,
      savedPostId: newPostRaw.savedPostId,
      isLiked: !!newPostRaw.isLiked,
      likedPostId: newPostRaw.likedPostId,
      likeCount: newPostRaw.likeCount || 0,
      comments_count: newPostRaw.comments_count || 0, // Ensure this is fetched if applicable
    };

    // --- Retrieve and Emit WebSocket Event ---
    const io = req.app.get('io'); // Get the Socket.IO instance
    if (io) {

      io.emit('newDiscussionPost', formattedNewPost); // Emit the fully formatted object

    } else {
      console.warn("Socket.IO instance not found on req.app.get('io') for discussion creation.");
    }

    // Respond with the created post info and media
    res.status(201).json(formattedNewPost);

  } catch (error) {
    if (connection) await connection.rollback(); // Rollback transaction on error
    console.error('Failed to create discussion post:', error);
    res.status(500).json({ error: 'Failed to create discussion post', details: error.message });
  } finally {
    if (connection) connection.release(); // Release connection
  }
});

// Fetch Discussion posts with pagination
app.get('/api/discussions', async (req, res) => {
  const currentUserId = req.session.user?.id || 0;
  const limit = parseInt(req.query.limit, 10) || 20;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  try {
    await withConnection(async (conn) => {
      // Fetch posts with user data, saved and liked status, like count
      const getPostsQuery = `
        SELECT 
          p.postid AS postId,
          p.content,
          p.created_at AS createdAt,
          p.updated_at AS editedAt,
          u.firstname,
          u.lastname,
          u.username,
          u.profile_picture,
          u.userid,
          u.bio,
          u.address,
          ns.id AS savedPostId,
          CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
          nl.id AS likedPostId,
          CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
          (SELECT COUNT(*) FROM nearby_likes WHERE post_id = p.postid AND post_type = 'discussion') AS likeCount
        FROM nearby_posts p
        JOIN nearby_users u ON p.userid = u.userid
        LEFT JOIN nearby_saved_posts ns 
          ON p.postid = ns.post_id 
          AND ns.post_type = 'discussion' 
          AND ns.user_id = ?
        LEFT JOIN nearby_likes nl 
          ON p.postid = nl.post_id 
          AND nl.post_type = 'discussion' 
          AND nl.user_id = ?
        WHERE p.type = 'discussion'
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [posts] = await conn.query(getPostsQuery, [currentUserId, currentUserId, limit, offset]);

      if (posts.length === 0) {
        return res.json([]);
      }

      const postIds = posts.map(post => post.postId);

      // Fetch media for posts
      const getMediaQuery = `
        SELECT postid, media_url, media_type
        FROM nearby_post_media
        WHERE postid IN (?)
      `;

      const [mediaRows] = await conn.query(getMediaQuery, [postIds]);

      // Group media by postId
      const mediaMap = new Map();
      for (const { postid, media_url, media_type } of mediaRows) {
        if (!mediaMap.has(postid)) {
          mediaMap.set(postid, []);
        }
        mediaMap.get(postid).push({
          mediaUrl: media_url,
          mediaType: media_type,
        });
      }

      // Format posts with media and user info
      const formattedPosts = posts.map(post => ({
        postId: post.postId,
        content: post.content,
        createdAt: post.createdAt,
        editedAt: post.editedAt,
        postType: 'discussion',
        user: {
          fullName: `${post.firstname} ${post.lastname}`.trim(),
          username: post.username,
          profilePicture: post.profile_picture || null,
          userId: post.userid,
          location: post.address,
          bio: post.bio
        },
        media: mediaMap.get(post.postId) || [],
        likeCount: post.likeCount,
        isSaved: !!post.isSaved,
        savedPostId: post.savedPostId,
        isLiked: !!post.isLiked,
        likedPostId: post.likedPostId,
      }));

      res.json(formattedPosts);
    });
  } catch (err) {
    console.error('Error fetching discussion posts:', err);
    res.status(500).json({ error: 'Failed to fetch discussion posts' });
  }
});

//Update a Discussion post:

// ... (imports remain the same: path, fs, xss, getMySQLDatetime, withConnection, uploadDiscussionMedia, etc.)

app.put('/api/editdiscussionpost/:id', uploadDiscussionMedia.array('media'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const discussionId = req.params.id;
  const content = xss(req.body.content || '').trim();
  const files = req.files;
  let mediaToDelete = req.body['mediaToDelete[]'] || req.body.mediaToDelete;

  if (!content) {
    return res.status(400).json({ error: 'Discussion content cannot be empty' });
  }

  if (!Array.isArray(mediaToDelete)) mediaToDelete = mediaToDelete ? [mediaToDelete] : [];

  const updatedAt = getMySQLDatetime();

  try {
    await withConnection(async (conn) => {
      // Step 1: Update main content
      const updateQuery = `
        UPDATE nearby_posts
        SET content = ?, updated_at = ?
        WHERE postid = ? AND type = 'discussion' AND userid = ?
      `;
      const [updateResult] = await conn.query(updateQuery, [content, updatedAt, discussionId, user.id]);
      if (updateResult.affectedRows === 0) {
        // If no rows were affected, it means the post wasn't found or didn't belong to the user
        return res.status(404).json({ error: 'Discussion not found or unauthorized' });
      }

      // Step 2: Delete media if requested
      if (mediaToDelete.length > 0) {
        const selectMediaQuery = `
          SELECT media_id, media_url FROM nearby_post_media
          WHERE media_url IN (?) AND postid = ?
        `;
        const [mediaToRemove] = await conn.query(selectMediaQuery, [mediaToDelete, discussionId]);

        // Delete files from disk
        await Promise.all(mediaToRemove.map(async ({ media_url }) => {
          const filePath = path.join(__dirname, '..', media_url);
          try {
            await fs.promises.unlink(filePath); // Use fs.promises for async unlink
          } catch (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          }
        }));

        if (mediaToRemove.length > 0) {
          const mediaIds = mediaToRemove.map(m => m.media_id);
          const deleteMediaQuery = `
            DELETE FROM nearby_post_media WHERE media_id IN (?) AND postid = ?
          `;
          await conn.query(deleteMediaQuery, [mediaIds, discussionId]);
        }
      }

      // Step 3: Insert new media files if any
      if (files && files.length > 0) {
        const mediaInserts = files.map(file => [
          discussionId,
          `/uploads/discussion_media/${file.filename}`,
          file.mimetype.startsWith('video') ? 'video' : 'image',
        ]);
        const insertMediaQuery = `
          INSERT INTO nearby_post_media (postid, media_url, media_type)
          VALUES ?
        `;
        await conn.query(insertMediaQuery, [mediaInserts]);
      }

      // Step 4: Fetch the complete, updated post data including media
      // This query needs to get the media related to the post as well
      const fetchPostAndMediaQuery = `
        SELECT
          p.postid AS id,
          p.content,
          p.created_at AS createdAt,
          p.updated_at AS editedAt,
          p.type AS postType,
          u.userid,
          u.username,
          CONCAT(u.firstname, ' ', u.lastname) AS fullName,
          u.profile_picture AS profilePicture
        FROM nearby_posts p
        JOIN nearby_users u ON p.userid = u.userid
        WHERE p.postid = ? AND p.userid = ?;
      `;

      const [postRows] = await conn.query(fetchPostAndMediaQuery, [discussionId, user.id]);
      if (postRows.length === 0) {
        // This should ideally not happen if updateResult.affectedRows was > 0, but good for defensive coding
        return res.status(404).json({ error: 'Discussion not found after update' });
      }

      const postData = postRows[0];

      const [mediaResults] = await conn.query(`
        SELECT media_url AS mediaUrl, media_type AS mediaType
        FROM nearby_post_media WHERE postid = ?`, [discussionId]);

      // Construct the final object that includes all necessary fields for the frontend
      const finalUpdatedDiscussion = {
        id: postData.id,
        content: postData.content,
        createdAt: postData.createdAt, // Or the original createdAt, depending on your needs
        editedAt: postData.editedAt,
        postType: postData.postType, // Will be 'discussion'
        user: {
          userId: postData.userid,
          username: postData.username,
          fullName: postData.fullName,
          profilePicture: postData.profilePicture,
        },
        media: mediaResults, // Attach the fetched media
        // Add other properties that PostCard expects, if available/relevant
        // For example, if you track likes/saves directly on the post, fetch them here.
        // For simplicity, I'll add placeholder values consistent with your previous responses
        isSaved: false, // You might need to fetch this based on `user.id` and `postData.id`
        savedPostId: null,
        isLiked: false, // You might need to fetch this based on `user.id` and `postData.id`
        likedPostId: null,
        likeCount: 0, // You might need to fetch this
      };


      // --- Socket.IO Emission ---
      const io = req.app.get('io');
      if (io) {

        io.emit('discussionUpdated', { discussion: finalUpdatedDiscussion }); // Emit the event with the complete post object

      } else {
        console.warn("Socket.IO instance not found on req.app.get('io') for discussion update.");
      }
      // --- End Socket.IO Emission ---

      // Send the updated discussion post back as the response
      res.status(200).json(finalUpdatedDiscussion);
    });
  } catch (err) {
    console.error('Error editing discussion post:', err);
    res.status(500).json({ error: 'Failed to edit discussion post' });
  }
});




//Delete discussion post

app.delete('/api/deletediscussion/:id', async (req, res) => {
  const user = req.session.user;
  const discussionId = req.params.id;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await withConnection(async (conn) => {
      // Step 1: Verify post exists and belongs to user
      const findPostQuery = `
        SELECT * FROM nearby_posts
        WHERE postid = ? AND userid = ? AND type = 'discussion'
      `;
      const [posts] = await conn.query(findPostQuery, [discussionId, user.id]);
      if (posts.length === 0) {
        return res.status(404).json({ error: 'Discussion not found or unauthorized' });
      }

      // Step 2: Fetch media to delete
      const fetchMediaQuery = `
        SELECT media_id, media_url FROM nearby_post_media
        WHERE postid = ?
      `;
      const [mediaResults] = await conn.query(fetchMediaQuery, [discussionId]);

      // Delete media files from disk
      mediaResults.forEach(({ media_url }) => {
        const filePath = path.join(__dirname, '..', media_url);
        fs.unlink(filePath, (err) => {
          if (err) console.warn('Could not delete file:', filePath);
        });
      });

      const mediaIds = mediaResults.map(m => m.media_id);

      // Step 3: Delete media DB rows if any
      if (mediaIds.length > 0) {
        const deleteMediaQuery = `
          DELETE FROM nearby_post_media WHERE media_id IN (?) AND postid = ?
        `;
        await conn.query(deleteMediaQuery, [mediaIds, discussionId]);
      }

      // Step 4: Delete the discussion post itself
      const deletePostQuery = `
        DELETE FROM nearby_posts
        WHERE postid = ? AND userid = ? AND type = 'discussion'
      `;
      await conn.query(deletePostQuery, [discussionId, user.id]);

      res.status(200).json({ message: 'Discussion deleted successfully' });
    });
  } catch (err) {
    console.error('Error deleting discussion post:', err);
    res.status(500).json({ error: 'Failed to delete discussion post' });
  }
});



app.post('/api/discussion/comments', uploadDiscussionMedia.array('media'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const postId = req.body.postid;
  const content = xss(req.body.content || '').trim();
  const safeContent = content || "";
  const parentCommentId = req.body.parent_comment_id ? parseInt(req.body.parent_comment_id, 10) : null;
  const files = req.files;
  const createdAt = getMySQLDatetime();

  if (!postId || (!safeContent && (!files || files.length === 0))) {
    return res.status(400).json({ error: 'Comment must have text or media.' });
  }

  try {
    await withConnection(async (conn) => {
      // 1. Insert comment
      const insertCommentQuery = `
        INSERT INTO nearby_post_comments 
        (postid, userid, content, created_at, parent_comment_id, content_type) 
        VALUES (?, ?, ?, ?, ?, 'post')
      `;

      const [result] = await conn.query(insertCommentQuery, [
        postId, userId, safeContent, createdAt, parentCommentId
      ]);
      const commentId = result.insertId;

      // 2. Insert media if present
      let mediaList = [];
      if (files && files.length > 0) {
        const mediaInserts = files.map(file => [
          commentId,
          `/uploads/discussion_media/${file.filename}`,
          file.mimetype.startsWith('video') ? 'video' : 'image',
        ]);

        const insertMediaQuery = `
          INSERT INTO nearby_discussioncomment_media (comment_id, media_url, media_type)
          VALUES ?
        `;
        await conn.query(insertMediaQuery, [mediaInserts]);

        mediaList = mediaInserts.map(([_, url, type]) => ({
          mediaUrl: url,
          mediaType: type,
        }));
      }

      const snippet = safeContent.slice(0, 100);

      // 3. Notify post owner (if not the commenter)
      const [postRows] = await conn.query(
        'SELECT userid FROM nearby_posts WHERE postid = ? AND type = "discussion"',
        [postId]
      );

      let postOwnerId = null;
      if (postRows.length > 0) {
        postOwnerId = postRows[0].userid;

        if (postOwnerId && postOwnerId !== userId) {
          const [notificationResult] = await conn.query(`
            INSERT INTO nearby_notifications (
              recipient_user_id, created_at, actor_user_id, action_type,
              target_type, target_id, parent_type, parent_id, metadata
            ) VALUES (?, ?, ?, 'comment', 'post', ?, 'post', ?, JSON_OBJECT(
              'comment_snippet', ?, 'post_id', ?, 'post_type', 'discussion'
            ))
          `, [postOwnerId, createdAt, userId, commentId, postId, snippet, postId]);

          const newlyCreatedNotificationId = notificationResult.insertId;

          /* >>> THIS LINE sends the “badge‑count” style update <<< */
          io.to(`user_${postOwnerId}`).emit('notification_count_update', {
            recipientUserId: postOwnerId
          });
          io.to(`user_notifications:${postOwnerId}`).emit('discussion_comment_notification', {
            id: newlyCreatedNotificationId,
            read: false,
            actorUserId: userId,
            actorFullname: user.name,
            actorProfilePicture: user.profilePic,
            action_type: 'comment',
            target_type: 'discussion',
            target_id: postId,
            created_at: createdAt,
            metadata: {
              comment_snippet: snippet,
              post_id: postId,
              post_type: 'discussion',
            },
          });
        }
      }

      // 4. Notify parent comment's author (if a reply and not self/postOwner)
      if (parentCommentId) {
        const [parentRows] = await conn.query(
          'SELECT userid FROM nearby_post_comments WHERE commentid = ?',
          [parentCommentId]
        );

        if (parentRows.length > 0) {
          const parentUserId = parentRows[0].userid;

          if (
            parentUserId &&
            parentUserId !== userId &&
            parentUserId !== postOwnerId
          ) {
            await conn.query(`
              INSERT INTO nearby_notifications (
                recipient_user_id, created_at, actor_user_id, action_type,
                target_type, target_id, parent_type, parent_id, metadata
              ) VALUES (?, ?, ?, 'reply', 'comment', ?, 'post', ?, JSON_OBJECT(
                'comment_snippet', ?, 'post_id', ?, 'post_type', 'discussion'
              ))
            `, [parentUserId, createdAt, userId, commentId, parentCommentId, snippet, postId]);

            /* >>> THIS LINE sends the “badge‑count” style update <<< */
            io.to(`user_${parentUserId}`).emit('notification_count_update', {
              recipientUserId: parentUserId
            });

            io.to(`user_notifications:${parentUserId}`).emit('discussion_reply_notification', {
              recipientUserId: parentUserId,
              actorUserId: userId,
              actorFullname: user.name,
              actorProfilePicture: user.profilePic,
              action_type: 'reply',
              target_type: 'comment',
              parent_type: 'post',
              created_at: createdAt,
              postId,
              commentId,
              parentCommentId,
              snippet,
              type: 'reply',
            });
          }
        }
      }

      // 5. Emit to everyone watching the discussion thread
      io.to(`post_${postId}`).emit('new_discussion_comment', {
        commentId,
        postId,
        content: safeContent,
        parentCommentId,

        createdAt,
        user: {
          fullName: `${user.firstname} ${user.lastname}`.trim(),
          username: user.username,
          profilePicture: user.profile_picture || null,
        },
        media: mediaList,
      });

      // 6. Response
      res.status(201).json({
        commentId,
        postId,
        content: safeContent,
        parentCommentId,
        createdAt,
        user: {
          fullName: `${user.firstname} ${user.lastname}`.trim(),
          username: user.username,
          profilePicture: user.profile_picture || null,
        },
        media: mediaList,
      });
    });
  } catch (err) {
    console.error('Error posting discussion comment:', err);
    res.status(500).json({ error: 'Failed to submit comment.' });
  }
});




// DELETE discussion comment and associated media
// Recursive function to delete a comment, its media, and children
const deleteCommentAndChildren = async (conn, commentId) => {
  // 1. Find all child comments
  const [childRows] = await conn.query(
    `SELECT commentid FROM nearby_post_comments WHERE parent_comment_id = ?`,
    [commentId]
  );

  // 2. Recursively delete each child comment
  for (const child of childRows) {
    await deleteCommentAndChildren(conn, child.commentid);
  }

  // 3. Get media files associated with this comment
  const [mediaRows] = await conn.query(
    `SELECT media_url FROM nearby_discussioncomment_media WHERE comment_id = ?`,
    [commentId]
  );

  // 4. Delete media records from DB
  await conn.query(
    `DELETE FROM nearby_discussioncomment_media WHERE comment_id = ?`,
    [commentId]
  );

  // 5. Delete files from filesystem
  mediaRows.forEach(({ media_url }) => {
    const filePath = path.join(__dirname, '..', 'public', media_url); // Adjust path as needed
    fs.unlink(filePath, (err) => {
      if (err) {
        console.warn(`Could not delete file at ${filePath}:`, err.message);
      }
    });
  });

  // 6. Delete the comment itself
  await conn.query(
    `DELETE FROM nearby_post_comments WHERE commentid = ?`,
    [commentId]
  );
};

// DELETE endpoint to remove a comment
app.delete('/api/discussion/:postId/comments/:commentId', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { postId, commentId } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();
    await withConnection(async (conn) => {
      // 1. Confirm comment exists and belongs to the given post
      const [commentRows] = await conn.query(
        `SELECT userid FROM nearby_post_comments WHERE commentid = ? AND postid = ?`,
        [commentId, postId]
      );

      if (commentRows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const comment = commentRows[0];

      // 2. Check user ownership
      if (comment.userid !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot delete this comment' });
      }

      // 3. Perform recursive deletion
      await deleteCommentAndChildren(conn, commentId);

      res.status(200).json({
        success: true,
        message: 'Comment and all its replies (and media) deleted successfully.'
      });
    }, conn);
  } catch (err) {
    console.error('Error deleting discussion comment:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  } finally {
    if (conn) conn.release();
  }
});



app.get('/api/discussion/comments/:postid', async (req, res) => {
  const postId = req.params.postid;
  const currentUserId = req.session?.user?.id || null;

  const getCommentsQuery = `
    SELECT 
      c.commentid AS id,
      c.content,
      c.created_at,
      c.parent_comment_id,
      c.editedAt,
      u.userid AS userId,
      u.username,
      u.firstname,
      u.lastname,
      u.profile_picture,
      (
        SELECT IFNULL(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'mediaUrl', m.media_url,
              'mediaType', m.media_type
            )
          ), '[]'
        )
        FROM nearby_discussioncomment_media m
        WHERE m.comment_id = c.commentid
      ) AS media,
      (
        SELECT COUNT(*)
        FROM nearby_posttype_comment_likes l
        WHERE l.comment_id = c.commentid
      ) AS likesCount,
      (
        SELECT EXISTS(
          SELECT 1
          FROM nearby_posttype_comment_likes l
          WHERE l.comment_id = c.commentid AND l.user_id = ?
        )
      ) AS isLikedByCurrentUser
    FROM nearby_post_comments c
    JOIN nearby_users u ON u.userid = c.userid
    WHERE c.postid = ?
    ORDER BY c.created_at ASC
  `;

  try {
    await withConnection(async (conn) => {
      const [results] = await conn.query(getCommentsQuery, [currentUserId, postId]);

      const normalized = results.map(c => ({
        id: c.id,
        content: !c.content || c.content.trim() === "undefined" ? "" : c.content,
        createdAt: c.created_at,
        parentCommentId: c.parent_comment_id,
        media: c.media ? JSON.parse(c.media) : [],
        replies: [],
        editedAt: c.editedAt,
        isLikedByCurrentUser: !!c.isLikedByCurrentUser,
        likesCount: c.likesCount,
        user: {
          fullName: `${c.firstname || ''} ${c.lastname || ''}`.trim() || c.username || "Unknown",
          username: c.username || "unknown",
          profilePicture: c.profile_picture || "",
          userId: c.userId,
        }
      }));

      res.json(normalized);
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});




/////   Update  comment /////
app.put('/api/discussion/comments/:commentid', uploadDiscussionMedia.array('mediaFiles'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const commentId = req.params.commentid;
  const userId = user.id;
  const content = req.body.content ? xss(req.body.content).trim() : null;
  const parentCommentId = req.body.parentCommentId || null;

  let mediaToRemove = [];
  if (req.body.mediaToRemove) {
    try {
      mediaToRemove = JSON.parse(req.body.mediaToRemove);
      if (!Array.isArray(mediaToRemove)) mediaToRemove = [];
    } catch {
      mediaToRemove = [];
    }
  }
  const files = req.files || [];

  try {
    await withConnection(async (conn) => {
      // Check ownership
      const [ownerRows] = await conn.query('SELECT userid FROM nearby_post_comments WHERE commentid = ?', [commentId]);
      if (ownerRows.length === 0) return res.status(404).json({ error: 'Comment not found.' });
      if (ownerRows[0].userid !== userId) return res.status(403).json({ error: 'Unauthorized.' });

      // Start transaction
      await conn.beginTransaction();

      const editedAt = getMySQLDatetime();
      await conn.query(`
        UPDATE nearby_post_comments 
        SET content = ?, editedAt = ?, parent_comment_id = ? 
        WHERE commentid = ?
      `, [content || '', editedAt, parentCommentId, commentId]);

      // Delete media if any
      if (mediaToRemove.length > 0) {
        const placeholders = mediaToRemove.map(() => '?').join(',');
        await conn.query(`
          DELETE FROM nearby_discussioncomment_media
          WHERE comment_id = ? AND media_url IN (${placeholders})
        `, [commentId, ...mediaToRemove]);
      }

      // Insert new media if any
      if (files.length > 0) {
        const mediaInserts = files.map(file => [
          commentId,
          `/uploads/discussion_media/${file.filename}`,
          file.mimetype.startsWith('video') ? 'video' : 'image',
        ]);
        await conn.query(`
          INSERT INTO nearby_discussioncomment_media (comment_id, media_url, media_type)
          VALUES ?
        `, [mediaInserts]);
      }

      // Fetch updated media
      const [mediaResults] = await conn.query(`
        SELECT media_url AS mediaUrl, media_type AS mediaType
        FROM nearby_discussioncomment_media
        WHERE comment_id = ?
      `, [commentId]);

      // Commit transaction
      await conn.commit();

      res.json({
        message: 'Comment updated successfully',
        comment: {
          commentId,
          content,
          parentCommentId,
          editedAt,
          media: mediaResults,
        },
      });
    });
  } catch (err) {
    console.error('Error updating comment:', err);
    try {
      await withConnection(async (conn) => await conn.rollback());
    } catch (_) {
      // ignore rollback error
    }
    res.status(500).json({ error: 'Failed to update comment.' });
  }
});





////////////////////////////////////////////////////
app.post('/api/reportpost', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { postId, postType, reason, description } = req.body;

  if (!postId || !postType || !reason) {
    return res.status(400).json({ error: 'Missing postId, postType, or reason' });
  }

  const insertQuery = `
    INSERT INTO nearby_post_reports (post_id, post_type, user_id, reason, description, reported_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  try {
    await withConnection(async (conn) => {
      await conn.query(insertQuery, [postId, postType, user.id, reason, description || null]);
      res.status(200).json({ message: 'Post reported successfully' });
    });
  } catch (error) {
    console.error('Error inserting post report:', error);
    res.status(500).json({ error: 'Failed to report post' });
  }
});


//Get the reasons for reporting posts
app.get('/api/report-reasons', async (req, res) => {
  const query = `
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'nearby_post_reports'
      AND COLUMN_NAME = 'reason'
      AND TABLE_SCHEMA = DATABASE()
  `;

  try {
    await withConnection(async (conn) => {
      const [rows] = await conn.query(query);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'No reasons found' });
      }

      const columnType = rows[0].COLUMN_TYPE;
      const reasons = columnType.match(/'(.*?)'/g).map(s => s.replace(/'/g, ''));

      res.json({ reasons });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching report reasons' });
  }
});


//Get Group posts
app.get('/api/groups/:groupId/posts', async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const userId = req.session.user?.id;

  if (isNaN(groupId)) {
    return res.status(400).json({ message: 'Invalid Group ID provided.' });
  }

  const query = `
    SELECT
      gp.post_id AS id,
      gp.group_id,
      gp.user_id,
      gp.content,
      gp.created_at,
      gp.updated_at,

      u.username,
      CONCAT(u.firstname, ' ', u.lastname) AS fullName,
      u.profile_picture AS profilePicture,

      CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
      COUNT(DISTINCT nl_all.id) AS likeCount,

      CASE WHEN sp.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,

      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'mediaId', gm.media_id,
            'mediaUrl', gm.media_url,
            'mediaType', gm.media_type,
            'createdAt', gm.created_at
          )
        )
        FROM nearby_grouppost_media gm
        WHERE gm.post_id = gp.post_id
      ) AS media

    FROM nearby_group_posts gp
    JOIN nearby_users u ON gp.user_id = u.userid

    LEFT JOIN nearby_likes nl 
      ON gp.post_id = nl.post_id AND nl.post_type = 'group' AND nl.user_id = ?
    LEFT JOIN nearby_likes nl_all 
      ON gp.post_id = nl_all.post_id AND nl_all.post_type = 'group'
    
    LEFT JOIN nearby_saved_posts sp 
      ON gp.post_id = sp.post_id AND sp.post_type = 'group' AND sp.user_id = ?

    WHERE gp.group_id = ?

    GROUP BY gp.post_id, gp.group_id, gp.user_id, gp.content, gp.created_at, gp.updated_at,
             u.username, u.firstname, u.lastname, u.profile_picture,
             nl.id, sp.id

    ORDER BY gp.created_at DESC
  `;

  try {
    await withConnection(async (conn) => {
      const [results] = await conn.query(query, [userId, userId, groupId]);

      const formatted = results.map((row) => ({
        id: row.id,
        groupId: row.group_id,
        content: row.content,
        createdAt: row.created_at,
        editedAt: row.updated_at,
        postType: 'group',
        user: {
          userId: row.user_id,
          username: row.username,
          fullName: row.fullName,
          profilePicture: row.profilePicture,
        },
        media: row.media || [],
        isLiked: !!row.isLiked,
        likeCount: row.likeCount || 0,
        isSaved: !!row.isSaved,
      }));

      res.status(200).json({ posts: formatted });
    });
  } catch (error) {
    console.error('Database error fetching group posts:', error);
    res.status(500).json({
      message: 'Failed to fetch group posts due to a server error.',
      error: error.message,
    });
  }
});




//create a new group post


app.post('/api/groups/:groupId/posts', uploadGroupMedia.array('media'), async (req, res) => {
  const { groupId } = req.params;
  const { userId, content } = req.body;
  const files = req.files;

  if (!groupId || !userId || !content) {
    return res.status(400).json({ message: 'Group ID, User ID, and content are required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const createdAt = getMySQLDatetime();
    // 1. Insert the post
    const [result] = await conn.query(
      `INSERT INTO nearby_group_posts (group_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`,
      [groupId, userId, content, createdAt]
    );

    const postId = result.insertId;

    // 2. Insert associated media
    if (files && files.length > 0) {
      const mediaData = files.map((file) => [
        postId,
        path.join('/uploads', 'group_media', file.filename).replace(/\\/g, '/'), // use forward slashes
      ]);

      await conn.query(
        `INSERT INTO nearby_grouppost_media (post_id, media_url) VALUES ?`,
        [mediaData]
      );
    }

    await conn.commit();

    // 3. Fetch post + user info + media
    const [[postRow]] = await conn.query(
      `
      SELECT 
        p.post_id AS id,
        p.content,
        p.created_at AS createdAt,
        p.updated_at AS editedAt,
        0 AS comments_count,
        'group' AS postType,

        u.userid AS userId,
        u.username,
        CONCAT(u.firstname, ' ', u.lastname) AS fullName,
        u.profile_picture AS profilePicture

      FROM nearby_group_posts p
      JOIN nearby_users u ON p.user_id = u.userid
      WHERE p.post_id = ?
      `,
      [postId]
    );

    const [mediaRows] = await conn.query(
      `SELECT media_url FROM nearby_grouppost_media WHERE post_id = ?`,
      [postId]
    );

    const newPost = {
      id: postRow.id,
      content: postRow.content,
      createdAt: postRow.createdAt,
      editedAt: postRow.editedAt,
      comments_count: postRow.comments_count,
      postType: postRow.postType,
      media: mediaRows.map((m) => ({ mediaUrl: m.media_url })),
      user: {
        userId: postRow.userId,
        username: postRow.username,
        fullName: postRow.fullName,
        profilePicture: postRow.profilePicture,
      },
    };

    // 4. Emit WebSocket notification
    const io = req.app.get('io');
    if (io) {
      io.to(groupId.toString()).emit('groupPostCreated', newPost);
    }

    res.status(201).json({ message: 'Post created successfully', post: newPost });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Failed to create group post:', error);
    res.status(500).json({ message: 'Failed to create group post', error: error.message });
  } finally {
    if (conn) conn.release();
  }
});




//Delete a group post
app.delete('/api/groups/:groupId/posts/:postId', async (req, res) => {
  const { groupId, postId } = req.params;
  // In a real application, you would also check req.user.userId
  // to ensure the authenticated user has permission to delete this post.
  // For example:
  // const currentUserId = req.user.userId; // Assuming user ID is available from authentication middleware

  if (!groupId || !postId) {
    return res.status(400).json({ message: 'Group ID and Post ID are required' });
  }

  let conn; // Declare connection variable outside try block
  try {
    // 1. Acquire a connection from the pool
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 2. Get media URLs associated with the post before deleting from DB
    // This is crucial if you plan to delete physical files from the server.
    const [mediaRows] = await conn.query(
      `SELECT media_url FROM nearby_grouppost_media WHERE post_id = ?`,
      [postId]
    );
    const mediaUrlsToDelete = mediaRows.map(row => row.media_url);

    // 3. Delete media records from the database
    await conn.query(
      `DELETE FROM nearby_grouppost_media WHERE post_id = ?`,
      [postId]
    );

    // 4. Delete the post from the database
    const [result] = await conn.query(
      `DELETE FROM nearby_group_posts WHERE post_id = ? AND group_id = ?`,
      [postId, groupId]
      // Add user_id check here if implementing authorization
      // `DELETE FROM nearby_group_posts WHERE post_id = ? AND group_id = ? AND user_id = ?`,
      // [postId, groupId, currentUserId]
    );

    // Check if a row was actually deleted
    if (result.affectedRows === 0) {
      await conn.rollback(); // Rollback if no post was found/deleted
      // Check if the post existed but the user didn't own it (if auth check is uncommented)
      // Or if the post just didn't exist at all
      return res.status(404).json({ message: 'Post not found or you do not have permission to delete it.' });
    }

    await conn.commit(); // Commit transaction if all DB operations are successful

    // 5. (Optional but Recommended) Delete physical media files from disk
    if (mediaUrlsToDelete.length > 0) {
      for (const url of mediaUrlsToDelete) {
        const filePath = path.join(__dirname, '..', 'uploads', url);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.warn(`Failed to delete physical media file ${filePath}:`, err);
          } else {
            console.log(`Successfully deleted media file: ${filePath}`);
          }
        });
      }

    }

    // 6. Emit WebSocket event to notify clients
    const io = req.app.get('io'); // Get io instance from app
    if (io) {

      io.to(groupId.toString()).emit('groupPostDeleted', { postId: postId, groupId: groupId });

    } else {
      console.warn("Socket.IO instance not found on req.app.get('io')");
    }

    res.status(200).json({ message: 'Post deleted successfully', postId: postId });

  } catch (error) {
    console.error('Error deleting group post:', error);
    // If a connection was acquired, attempt to roll back
    if (conn) {
      try {
        await conn.rollback(); // Rollback in case of any error during the transaction
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    res.status(500).json({ message: 'Failed to delete group post', error: error.message });
  } finally {
    // 7. Release the connection back to the pool in a finally block
    if (conn) {
      conn.release();
    }
  }
});





app.put('/api/groups/:groupId/posts/:postId', uploadGroupMedia.array('media', 5), async (req, res) => {
  const { groupId, postId } = req.params;
  const { userId, content, mediaToDelete } = req.body;
  const files = req.files || [];

  if (!userId || !content) {
    return res.status(400).json({ message: 'User ID and content are required' });
  }

  try {
    await withConnection(async (conn) => {
      await conn.beginTransaction();

      const editedAt = getMySQLDatetime(); // Ensure getMySQLDatetime() is defined and working

      // Update post content and updated_at
      await conn.query(
        `UPDATE nearby_group_posts SET content = ?, updated_at = ? WHERE post_id = ? AND group_id = ?`,
        [content, editedAt, postId, groupId]
      );

      // Handle selective media deletion
      if (mediaToDelete) {
        const mediaArray = JSON.parse(mediaToDelete);
        if (Array.isArray(mediaArray) && mediaArray.length > 0) {
          await conn.query(
            `DELETE FROM nearby_grouppost_media WHERE post_id = ? AND media_url IN (?)`,
            [postId, mediaArray]
          );
          // Optionally delete media files from disk here (recommended for cleanup)
        }
      }

      // Add new media
      if (files.length > 0) {
        const mediaValues = files.map(file => [
          postId,
          `/uploads/group_media/${file.filename}`,
          file.mimetype.startsWith('image/') ? 'image' : 'video',
        ]);
        await conn.query(
          `INSERT INTO nearby_grouppost_media (post_id, media_url, media_type) VALUES ?`,
          [mediaValues]
        );
      }

      await conn.commit();

      // Fetch the full updated post with user details AND media
      const [rows] = await conn.query(
        `SELECT
           p.post_id AS id,
           p.content,
           p.created_at,  -- Include created_at for consistency if needed by frontend
           p.updated_at AS editedAt,
           u.userid AS userId,
           u.username,
           CONCAT(u.firstname, ' ', u.lastname) AS fullName,
           u.profile_picture AS profilePicture
         FROM nearby_group_posts p
         JOIN nearby_users u ON p.user_id = u.userid
         WHERE p.post_id = ?`,
        [postId]
      );

      if (!rows.length) {
        return res.status(404).json({ message: 'Updated post not found' });
      }

      const updatedPostBase = rows[0];

      // Fetch the updated media for this post
      const [updatedMedia] = await conn.query(
        `SELECT media_url as mediaUrl, media_type as mediaType
         FROM nearby_grouppost_media
         WHERE post_id = ?`,
        [postId]
      );

      // Construct the complete updated post object
      const fullUpdatedPost = {
        id: updatedPostBase.id,
        content: updatedPostBase.content,
        createdAt: updatedPostBase.created_at, // Ensure createdAt is included
        editedAt: updatedPostBase.editedAt,
        user: {
          userId: updatedPostBase.userId,
          username: updatedPostBase.username,
          fullName: updatedPostBase.fullName,
          profilePicture: updatedPostBase.profilePicture,
        },
        media: updatedMedia, // Include the media here
      };

      const io = req.app.get('io'); // Get io instance from app

      if (io) {

        io.to(groupId.toString()).emit('groupPostUpdated', fullUpdatedPost);
        // ADD THIS CONSOLE LOG

      } else {
        console.warn("Socket.IO instance not found on req.app.get('io')");
      }

      res.status(200).json({
        message: 'Post updated successfully',
        updatedPost: fullUpdatedPost, // Send the full object in the HTTP response too
      });
    });
  } catch (error) {
    console.error('Error updating group post:', error);
    try {
      await withConnection(async (conn) => {
        await conn.rollback();
      });
    } catch (_) { }
    res.status(500).json({ message: 'Failed to update group post', error: error.message });
  }
});



app.get('/api/groups/:postId/comments', async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.session.user?.id;

  if (isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid Post ID provided.' });
  }

  const query = `
    SELECT
      c.comment_id AS id,
      c.post_id,
      c.user_id,
      c.content,
      c.created_at,
      c.updated_at AS editedAt,
      c.parent_comment_id,
      c.group_id,
      u.username,
      CONCAT(u.firstname, ' ', u.lastname) AS fullName,
      u.profile_picture AS profilePicture,
      CASE WHEN l.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLikedByCurrentUser,
      COUNT(l_all.id) AS likesCount
    FROM nearby_group_comments c
    JOIN nearby_users u ON c.user_id = u.userid
    LEFT JOIN nearby_likes l 
      ON l.post_id = c.comment_id 
      AND l.post_type = 'group_comment' 
      AND l.user_id = ?
    LEFT JOIN nearby_likes l_all 
      ON l_all.post_id = c.comment_id 
      AND l_all.post_type = 'group_comment'
    WHERE c.post_id = ?
    GROUP BY c.comment_id, c.post_id, c.user_id, c.content, c.created_at, c.updated_at,
             c.parent_comment_id, c.group_id, u.username, u.firstname, u.lastname, u.profile_picture, l.id
    ORDER BY c.created_at ASC
  `;

  try {
    await withConnection(async (conn) => {
      const [results] = await conn.query(query, [userId, postId]);

      const normalizedResults = results.map(comment => ({
        id: comment.id,
        postId: comment.post_id,
        content: comment.content,
        createdAt: comment.created_at,
        editedAt: comment.editedAt,
        parentCommentId: comment.parent_comment_id,
        groupId: comment.group_id,
        isLikedByCurrentUser: !!comment.isLikedByCurrentUser,
        likesCount: comment.likesCount,
        user: {
          id: comment.user_id,
          username: comment.username,
          fullName: comment.fullName,
          profilePicture: comment.profilePicture,
        },
      }));

      res.status(200).json(normalizedResults);
    });
  } catch (error) {
    console.error('Database error fetching group comments:', error);
    res.status(500).json({
      message: 'Failed to fetch group comments due to a server error.',
      error: error.message,
    });
  }
});

// Create a new group comment
app.post(
  '/api/groups/:groupId/comments',
  uploadGroupMedia.array('media'),
  async (req, res) => {
    const groupId = Number(req.params.groupId);
    const user = req.session.user;
    const userId = user?.id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { postid, content, parent_comment_id } = req.body;
    if (!postid || !content) {
      return res.status(400).json({ message: 'postid and content are required.' });
    }

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      /* 1️⃣ create the comment */
      const createdAt = getMySQLDatetime();
      const [commentRow] = await connection.query(
        `INSERT INTO nearby_group_comments
           (post_id, user_id, content, parent_comment_id, group_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [postid, userId, content, parent_comment_id || null, groupId, createdAt]
      );
      const commentId = commentRow.insertId;

      /* 2️⃣ save media (if any) */
      if (req.files?.length) {
        const mediaRows = req.files.map(f => ([
          commentId,
          `/group_media/${f.filename}`,
          f.mimetype.startsWith('video/') ? 'video' : 'image',
          getMySQLDatetime()
        ]));
        await connection.query(
          `INSERT INTO nearby_group_comment_media
             (comment_id, media_url, media_type, created_at)
           VALUES ?`,
          [mediaRows]
        );
      }

      const snippet = content.slice(0, 100);

      /* 3️⃣ who owns the group‑post? */
      const [[{ user_id: postOwnerId } = {}]] = await connection.query(
        `SELECT user_id FROM nearby_group_posts WHERE post_id = ?`,
        [postid]
      );

      /* 4️⃣ notify the post owner (group_comment_notification) */
      if (postOwnerId && postOwnerId !== userId) {


        const [notifPost] = await connection.query(
          `INSERT INTO nearby_notifications (
             recipient_user_id, actor_user_id, created_at,
             action_type, target_type, target_id,
             parent_type, parent_id, metadata
           ) VALUES (?, ?, ?, 'comment', 'group', ?, 'group', ?, JSON_OBJECT(
             'comment_snippet', ?, 'post_id', ?, 'post_type', 'group'
           ))`,
          [postOwnerId, userId, createdAt, commentId, postid, snippet, postid]
        );
        const postNotifId = notifPost.insertId;


        io.to(`user_${postOwnerId}`).emit('notification_count_update', {
          recipientUserId: postOwnerId
        });
        io.to(`user_${postOwnerId}`).emit('group_comment_notification', {
          id: postNotifId,          // 👈 React expects this
          recipientUserId: postOwnerId,
          actorUserId: userId,
          actorFullname: user.name,
          actorProfilePicture: user.profilePic,
          action_type: 'comment',
          target_type: 'group',
          postId: postid,
          commentId,
          created_at: createdAt,
          metadata: { comment_snippet: snippet },
          type: 'comment'
        });
      }

      /* 5️⃣ notify parent‑comment author (group_reply_notification) */
      if (parent_comment_id) {
        const [[{ user_id: parentUserId } = {}]] = await connection.query(
          `SELECT user_id FROM nearby_group_comments WHERE comment_id = ?`,
          [parent_comment_id]
        );

        if (parentUserId && parentUserId !== userId && parentUserId !== postOwnerId) {
          const [notifReply] = await connection.query(
            `INSERT INTO nearby_notifications (
     recipient_user_id, actor_user_id,
     action_type, target_type, target_id,
     parent_type, parent_id, metadata, created_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(
     'comment_snippet', ?, 'post_id', ?, 'post_type', 'group'
   ), ?)`,
            [
              parentUserId,       // recipient_user_id
              userId,             // actor_user_id
              'reply',            // action_type ✅
              'comment',          // target_type
              commentId,          // target_id
              'group',            // parent_type
              parent_comment_id,  // parent_id
              snippet,            // metadata.comment_snippet
              postid,             // metadata.post_id
              createdAt           // created_at
            ]
          );


          const replyNotifId = notifReply.insertId;


          io.to(`user_${parentUserId}`).emit('notification_count_update', {
            recipientUserId: parentUserId
          });


          io.to(`user_${parentUserId}`).emit('group_reply_notification', {
            id: replyNotifId,        // 👈 include the id
            recipientUserId: parentUserId,
            actorUserId: userId,
            actorFullname: user.name,
            actorProfilePicture: user.profilePic,
            action_type: 'reply',
            target_type: 'comment',
            parent_type: 'group',
            postId: postid,
            commentId,
            parentCommentId: parent_comment_id,
            created_at: createdAt,
            metadata: { comment_snippet: snippet },
            type: 'reply'
          });
        }
      }

      /* 6️⃣ broadcast comment to the group room */
      io.emit('new-group-comment', {
        groupId,
        postId: postid,
        commentId,
        parentCommentId: parent_comment_id || null,
        userId
      });

      await connection.commit();
      res.status(201).json({ message: 'Comment posted successfully', commentId });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error('Error posting group comment:', err);
      res.status(500).json({ message: 'Failed to post comment' });
    } finally {
      if (connection) connection.release();
    }
  }
);




// Add this new endpoint to your backend (e.g., app.js or routes/user.js)

app.get('/api/user/:userId/comments-summary', async (req, res) => {
  const { userId } = req.params; // The ID of the profile whose posts' comments we are counting

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Comments for nearby_posts (including answers for 'question' posts)
    // nearby_post_comments
    const postCommentsQuery = `
            SELECT COUNT(npc.commentid) AS totalComments
            FROM nearby_post_comments npc
            JOIN nearby_posts np ON npc.postid = np.postid
            WHERE np.userId = ? AND npc.userid != ?;
        `;
    const [postCommentsResult] = await connection.query(postCommentsQuery, [userId, userId]);
    const postCommentsCount = postCommentsResult[0].totalComments;

    // nearby_answers (for questions, assume these are comments/answers to the original question post)
    const answersCommentsQuery = `
            SELECT COUNT(na.answerid) AS totalComments
            FROM nearby_answers na
            JOIN nearby_posts np ON na.postid = np.postid
            WHERE np.userId = ? AND na.userid != ?;
        `;
    const [answersCommentsResult] = await connection.query(answersCommentsQuery, [userId, userId]);
    const answersCommentsCount = answersCommentsResult[0].totalComments;

    // 2. Comments for nearby_alerts
    const alertCommentsQuery = `
            SELECT COUNT(nac.comment_id) AS totalComments
            FROM nearby_alert_comments nac
            JOIN nearby_alerts na ON nac.alert_id = na.alertId
            WHERE na.userId = ? AND nac.user_id != ?;
        `;
    const [alertCommentsResult] = await connection.query(alertCommentsQuery, [userId, userId]);
    const alertCommentsCount = alertCommentsResult[0].totalComments;

    // 3. Comments for nearby_tips (using nearby_posttype_comments)
    const tipCommentsQuery = `
            SELECT COUNT(nptc.comment_id) AS totalComments
            FROM nearby_posttype_comments nptc
            JOIN nearby_tips nt ON nptc.post_id = nt.id
            WHERE nptc.post_type = 'tip' AND nt.user_id = ? AND nptc.user_id != ?;
        `;
    const [tipCommentsResult] = await connection.query(tipCommentsQuery, [userId, userId]);
    const tipCommentsCount = tipCommentsResult[0].totalComments;

    // Sum all comment counts
    const totalUserComments = postCommentsCount + answersCommentsCount + alertCommentsCount + tipCommentsCount;

    res.status(200).json({ totalComments: totalUserComments });

  } catch (err) {
    console.error(`Error fetching comment summary for user ${userId}:`, err);
    res.status(500).json({ error: 'Failed to fetch comment summary.' });
  } finally {
    if (connection) connection.release();
  }
});




//fetch Post by ID

app.get('/api/alerts/:alertId', async (req, res) => {
  const { alertId } = req.params; // Get the alertId from URL parameters
  const authenticatedUserId = req.session.user ? req.session.user.id : null; // Get authenticated user ID from session

  if (!alertId) {
    return res.status(400).json({ error: 'Alert ID is required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `
            SELECT na.alertId AS id, na.userId, na.alertTypeId, na.title, na.description AS content,
                   na.latitude, na.longitude, na.createdAt AS created_at,
                   at.name as alert_type_name,
                   u.userid as user_id_from_db, u.username, CONCAT(u.firstname, ' ', u.lastname) AS fullName, u.profile_picture,
                   (
                       SELECT JSON_ARRAYAGG(
                           JSON_OBJECT('mediaUrl', nam.media_url, 'mediaType', nam.media_type)
                       )
                       FROM nearby_alert_media nam
                       WHERE nam.alertid = na.alertId
                   ) AS media,
                   (SELECT COUNT(id) FROM nearby_likes WHERE post_id = na.alertId AND post_type = 'alert') AS likeCount,
                   ns.id AS savedPostId, CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                   nl.id AS likedPostId, CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked
            FROM nearby_alerts na
            JOIN nearby_users u ON na.userId = u.userid
            LEFT JOIN nearby_alert_types at ON na.alertTypeId = at.alert_type_id
            LEFT JOIN nearby_saved_posts ns ON na.alertId = ns.post_id AND ns.post_type = 'alert' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON na.alertId = nl.post_id AND nl.post_type = 'alert' AND nl.user_id = ?
            WHERE na.alertId = ? -- Filter by the specific alertId
            GROUP BY na.alertId; -- Grouping still important for JSON_AGG and counts
        `;

    const [rows] = await connection.query(query, [authenticatedUserId, authenticatedUserId, alertId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    const row = rows[0]; // We expect only one row for a specific ID

    let mediaArray = [];
    if (row.media) {
      if (typeof row.media === 'string') {
        try {
          mediaArray = JSON.parse(row.media);
        } catch (parseError) {
          console.warn('Failed to parse media JSON for alert, defaulting to empty array:', parseError);
          mediaArray = [];
        }
      } else if (Array.isArray(row.media)) {
        mediaArray = row.media;
      }
    }

    const alert = {
      id: row.id,
      alertId: row.id, // For consistency if your frontend uses alertId
      userId: row.userId,
      alertTypeId: row.alertTypeId,
      title: row.title,
      description: row.content,
      content: row.content, // Keeping for consistency
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      type: { id: row.alertTypeId, name: row.alert_type_name },
      location: { lat: row.latitude, lng: row.longitude },
      postType: 'alert',
      user: {
        id: row.user_id_from_db,
        username: row.username,
        fullName: row.fullName,
        profilePicture: row.profile_picture,
      },
      media: mediaArray,
      isSaved: !!row.isSaved,
      savedPostId: row.savedPostId,
      isLiked: !!row.isLiked,
      likedPostId: row.likedPostId,
      likeCount: row.likeCount || 0,
      // Assuming comments_count would be added here if you fetch it
      // comments_count: row.comments_count || 0,
    };

    res.status(200).json(alert);

  } catch (err) {
    console.error(`Error fetching alert with ID ${alertId}:`, err);
    res.status(500).json({ error: `Failed to fetch alert with ID ${alertId}` });
  } finally {
    if (connection) connection.release();
  }
});



app.get('/api/nearby_tips/:tipId', async (req, res) => {
  const { tipId } = req.params; // Get the tipId from URL parameters
  const authenticatedUserId = req.session.user ? req.session.user.id : null; // Get authenticated user ID from session

  if (!tipId) {
    return res.status(400).json({ error: 'Tip ID is required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `
            SELECT
                t.id,
                t.title,
                t.content,
                t.created_at,
                t.updated_at,
                t.category_id,
                ntc.name AS categoryName,
                u.username, u.userid,
                CONCAT(u.firstname, ' ', u.lastname) AS fullName,
                u.profile_picture,
                'tip' AS postType,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('mediaUrl', media_url, 'mediaType', media_type)
                    )
                    FROM nearby_tip_media
                    WHERE tip_id = t.id
                ) AS media,
                ns.id AS savedPostId,
                CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                nl.id AS likedPostId,
                CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
                COUNT(DISTINCT nl_count.id) AS likeCount
            FROM nearby_tips t
            JOIN nearby_users u ON t.user_id = u.userid
            JOIN nearby_tips_categories ntc ON t.category_id = ntc.id
            LEFT JOIN nearby_saved_posts ns ON t.id = ns.post_id AND ns.post_type = 'tip' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON t.id = nl.post_id AND nl.post_type = 'tip' AND nl.user_id = ?
            LEFT JOIN nearby_likes nl_count ON t.id = nl_count.post_id AND nl_count.post_type = 'tip'
            WHERE t.id = ? -- Filter by the specific tipId
            GROUP BY t.id, t.category_id, ntc.name, u.username, u.firstname, u.lastname, u.profile_picture, ns.id, nl.id
        `;

    const params = [authenticatedUserId, authenticatedUserId, tipId];
    const [rows] = await connection.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tip not found.' });
    }

    const row = rows[0]; // Expecting a single row for a specific ID

    let mediaArray = [];
    if (row.media) {
      if (typeof row.media === 'string') {
        try {
          mediaArray = JSON.parse(row.media);
        } catch (parseError) {
          console.warn('Failed to parse media JSON for tip, defaulting to empty array:', parseError);
          mediaArray = [];
        }
      } else if (Array.isArray(row.media)) {
        mediaArray = row.media;
      }
    }

    const tip = {
      id: row.id,
      tipId: row.id, // For consistency if your frontend uses tipId
      title: row.title,
      content: row.content,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      editedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      postType: row.postType,
      categoryId: row.category_id,
      categoryName: row.categoryName,
      user: {
        username: row.username,
        fullName: row.fullName,
        profilePicture: row.profile_picture,
        userId: row.userid,
      },
      media: mediaArray,
      isSaved: !!row.isSaved,
      savedPostId: row.savedPostId,
      isLiked: !!row.isLiked,
      likedPostId: row.likedPostId,
      likeCount: row.likeCount || 0,
      // comments_count: row.comments_count || 0, // Add if fetched
    };

    res.status(200).json(tip);

  } catch (err) {
    console.error(`Error fetching tip with ID ${tipId}:`, err);
    res.status(500).json({ error: `Failed to fetch tip with ID ${tipId}` });
  } finally {
    if (connection) connection.release();
  }
});





app.get('/api/questions/:questionId', async (req, res) => {
  const { questionId } = req.params; // Get the questionId from URL parameters
  const currentUserId = req.session.user?.id; // Get authenticated user ID from session

  if (!questionId) {
    return res.status(400).json({ error: 'Question ID is required.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const query = `
            SELECT
                p.postid,
                p.content,
                p.created_at,
                p.type AS postType,
                p.updated_at,
                u.username,
                u.firstname,
                u.lastname,
                u.userid,
                u.profile_picture,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('mediaUrl', media_url, 'mediaType', media_type)
                    )
                    FROM nearby_post_media
                    WHERE postid = p.postid
                ) AS media,
                ns.id AS savedPostId,
                CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                nl.id AS likedPostId,
                CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
                COUNT(DISTINCT nl_count.id) AS likeCount,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('proid', qp.proid, 'name', pr.name)
                    )
                    FROM nearby_question_professions qp
                    JOIN nearby_professions pr ON qp.proid = pr.proid
                    WHERE qp.question_id = p.postid
                ) AS professions
            FROM nearby_posts p
            JOIN nearby_users u ON p.userid = u.userid
            LEFT JOIN nearby_saved_posts ns ON p.postid = ns.post_id AND ns.post_type = 'question' AND ns.user_id = ?
            LEFT JOIN nearby_likes nl ON p.postid = nl.post_id AND nl.post_type = 'question' AND nl.user_id = ?
            LEFT JOIN nearby_likes nl_count ON p.postid = nl_count.post_id AND nl_count.post_type = 'question'
            WHERE p.type = 'question' AND p.postid = ? -- Filter by the specific questionId
            GROUP BY p.postid, u.username, u.firstname, u.lastname, u.userid, u.profile_picture, ns.id, nl.id
            ORDER BY p.created_at DESC; -- ORDER BY is generally not needed for a single ID lookup but kept for consistency
        `;

    const params = [currentUserId, currentUserId, questionId];
    const [rows] = await connection.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const row = rows[0]; // Expecting a single row for a specific ID

    let mediaArray = [];
    if (row.media) {
      if (typeof row.media === 'string') {
        try {
          mediaArray = JSON.parse(row.media);
        } catch (parseError) {
          console.warn('Failed to parse media JSON for question, defaulting to empty array:', parseError);
          mediaArray = [];
        }
      } else if (Array.isArray(row.media)) {
        mediaArray = row.media;
      }
    }

    let professionsArray = [];
    if (row.professions) {
      if (typeof row.professions === 'string') {
        try {
          professionsArray = JSON.parse(row.professions);
        } catch (parseError) {
          console.warn('Failed to parse professions JSON for question, defaulting to empty array:', parseError);
          professionsArray = [];
        }
      } else if (Array.isArray(row.professions)) {
        professionsArray = row.professions;
      }
    }

    const question = {
      id: row.postid, // Use 'id' for consistency with other post types
      postId: row.postid, // For consistency if your frontend uses postId
      content: row.content,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      postType: row.postType,
      editedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      user: {
        username: row.username,
        fullName: `${row.firstname} ${row.lastname}`,
        profilePicture: row.profile_picture,
        userId: row.userid,
      },
      media: mediaArray,
      professions: professionsArray,
      isSaved: !!row.isSaved,
      savedPostId: row.savedPostId,
      isLiked: !!row.isLiked,
      likedPostId: row.likedPostId,
      likeCount: row.likeCount || 0,
      // comments_count: row.comments_count || 0, // Add if fetched
    };

    res.status(200).json(question);

  } catch (err) {
    console.error(`Error fetching question with ID ${questionId}:`, err);
    res.status(500).json({ error: `Failed to fetch question with ID ${questionId}` });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/discussions/:discussionId', async (req, res) => {
  const { discussionId } = req.params; // Get the discussionId from URL parameters
  const currentUserId = req.session.user?.id || 0; // Get authenticated user ID from session

  if (!discussionId) {
    return res.status(400).json({ error: 'Discussion ID is required.' });
  }

  try {
    await withConnection(async (conn) => {
      // Fetch the single post with user data, saved and liked status, like count
      const getPostQuery = `
                SELECT
                    p.postid AS postId,
                    p.content,
                    p.created_at AS createdAt,
                    p.updated_at AS editedAt,
                    u.firstname,
                    u.lastname,
                    u.username,
                    u.profile_picture,
                    u.userid,
                    ns.id AS savedPostId,
                    CASE WHEN ns.id IS NOT NULL THEN TRUE ELSE FALSE END AS isSaved,
                    nl.id AS likedPostId,
                    CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS isLiked,
                    (SELECT COUNT(*) FROM nearby_likes WHERE post_id = p.postid AND post_type = 'discussion') AS likeCount
                FROM nearby_posts p
                JOIN nearby_users u ON p.userid = u.userid
                LEFT JOIN nearby_saved_posts ns
                    ON p.postid = ns.post_id
                    AND ns.post_type = 'discussion'
                    AND ns.user_id = ?
                LEFT JOIN nearby_likes nl
                    ON p.postid = nl.post_id
                    AND nl.post_type = 'discussion'
                    AND nl.user_id = ?
                WHERE p.type = 'discussion' AND p.postid = ?
                GROUP BY p.postid, u.firstname, u.lastname, u.username, u.profile_picture, u.userid, ns.id, nl.id
            `;

      const [posts] = await conn.query(getPostQuery, [currentUserId, currentUserId, discussionId]);

      if (posts.length === 0) {
        return res.status(404).json({ error: 'Discussion post not found.' });
      }

      const post = posts[0]; // We expect only one post for a specific ID

      // Fetch media for this specific post
      const getMediaQuery = `
                SELECT media_url, media_type
                FROM nearby_post_media
                WHERE postid = ?
            `;

      const [mediaRows] = await conn.query(getMediaQuery, [post.postId]);

      const media = mediaRows.map(({ media_url, media_type }) => ({
        mediaUrl: media_url,
        mediaType: media_type,
      }));

      // Format the single discussion post with media and user info
      const formattedPost = {
        id: post.postId, // Use 'id' for consistency with PostDetailPage
        postId: post.postId,
        content: post.content,
        createdAt: post.createdAt,
        editedAt: post.editedAt,
        postType: 'discussion',
        user: {
          fullName: `${post.firstname} ${post.lastname}`.trim(),
          username: post.username,
          profilePicture: post.profile_picture || null,
          userId: post.userid,
        },
        media: media, // Assign the fetched media
        likeCount: post.likeCount,
        isSaved: !!post.isSaved,
        savedPostId: post.savedPostId,
        isLiked: !!post.isLiked,
        likedPostId: post.likedPostId,
      };

      res.status(200).json(formattedPost);
    });
  } catch (err) {
    console.error(`Error fetching discussion post with ID ${discussionId}:`, err);
    res.status(500).json({ error: `Failed to fetch discussion post with ID ${discussionId}` });
  }
});


////////////////////////////////
/////////////////////////////////
// EVENT SECTION
app.get('/api/event-categories', async (req, res) => {
  try {
    await withConnection(async (conn) => {
      const [rows] = await conn.query('SELECT id, name FROM nearby_categories ORDER BY name ASC');
      res.json(rows);
    });
  } catch (err) {
    console.error('Error fetching event categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});


app.post('/api/events', uploadEventMedia.array('mediaFiles', 5), async (req, res) => {

  const userId = req.session.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const {
      eventName,
      eventDescription,
      startDateTime,
      endDateTime,
      isRecurring,
      recurringPattern,
      locationType,
      physicalAddress,
      onlineLink,
      eventCategory,
      latitude,
      longitude,
    } = req.body;


    const isRecurringBool = isRecurring === 'true' || isRecurring === true;
    const createdAt = getMySQLDatetime();
    const [result] = await connection.query(
      `INSERT INTO nearby_events 
(user_id, title, description, start_datetime, end_datetime, is_recurring, recurring_pattern, location_type, physical_address, latitude, longitude, online_link, category_id, created_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        userId,
        eventName,
        eventDescription,
        startDateTime,
        endDateTime,
        isRecurringBool ? 1 : 0,
        isRecurringBool ? recurringPattern : null,
        locationType,
        physicalAddress || null,
        latitude || null,
        longitude || null,
        onlineLink || null,
        eventCategory || null,
        createdAt
      ]

    );

    const eventId = result.insertId;

    if (req.files && req.files.length > 0) {
      const mediaInsertPromises = req.files.map(file => {
        const mediaUrl = `/uploads/event_media/${file.filename}`;
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        return connection.query(
          `INSERT INTO nearby_event_media (event_id, media_url, media_type) VALUES (?, ?, ?)`,
          [eventId, mediaUrl, mediaType]
        );
      });
      await Promise.all(mediaInsertPromises);
    }

    req.app.get('io').emit('new-event', {
      eventId,
      userId,
      title: eventName,
      description: eventDescription,
      startDateTime,
      endDateTime,
      eventCategory,
      mediaUrls: req.files ? req.files.map(f => `/uploads/event_media/${f.filename}`) : []
    });

    res.json({ success: true, eventId });

  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    if (connection) connection.release();
  }
});


//GET all events
app.get('/api/events', async (req, res) => {
  const { lat, lng, radius, dateFilter } = req.query;
  const sessionUserId = req.session.user?.id;

  let connection;
  try {
    connection = await pool.getConnection();

    let userLat = lat ? parseFloat(lat) : null;
    let userLng = lng ? parseFloat(lng) : null;
    let searchRadius = radius ? parseInt(radius) : 50;

    if ((!userLat || !userLng) && sessionUserId) {
      const [[userLoc]] = await connection.query(
        'SELECT latitude, longitude FROM nearby_users WHERE userid = ?',
        [sessionUserId]
      );
      if (!userLoc) {
        return res.status(400).json({ error: 'User location not found' });
      }
      userLat = parseFloat(userLoc.latitude);
      userLng = parseFloat(userLoc.longitude);
    }

    if (!userLat || !userLng) {
      return res.status(400).json({ error: 'Missing latitude and longitude for event search.' });
    }

    // Build date condition (used in both queries)
    let dateCondition = '';
    switch (dateFilter) {
      case 'today':
        dateCondition = `AND DATE(start_datetime) = CURDATE()`;
        break;
      case 'this-week':
        dateCondition = `AND YEARWEEK(start_datetime, 1) = YEARWEEK(CURDATE(), 1)`;
        break;
      case 'this-weekend':
        dateCondition = `
          AND WEEKDAY(start_datetime) IN (5, 6)
          AND YEARWEEK(start_datetime, 1) = YEARWEEK(CURDATE(), 1)
        `;
        break;
      case 'next-month':
        dateCondition = `
          AND MONTH(start_datetime) = MONTH(CURDATE() + INTERVAL 1 MONTH)
          AND YEAR(start_datetime) = YEAR(CURDATE() + INTERVAL 1 MONTH)
        `;
        break;
    }

    // 1. Personal Events Query
    const [personalEvents] = await connection.query(
      `
      SELECT 
        e.*,
        u.firstname,
        u.lastname,
        u.username,
        u.profile_picture,
        u.latitude AS user_latitude,
        u.longitude AS user_longitude,
        u.address AS user_address,
        (
          SELECT rsvp_status 
          FROM nearby_event_attendees 
          WHERE event_id = e.id AND user_id = ?
        ) AS user_rsvp_status,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'media_url', m.media_url,
            'media_type', m.media_type
          )
        ) AS media,
        FALSE AS is_business_event
      FROM nearby_events e
      LEFT JOIN nearby_event_media m ON e.id = m.event_id
      LEFT JOIN nearby_users u ON e.user_id = u.userid
      WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
        ${dateCondition}
        AND (
          6371 * ACOS(
            COS(RADIANS(?)) * COS(RADIANS(e.latitude)) *
            COS(RADIANS(e.longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(e.latitude))
          )
        ) <= ?
      GROUP BY e.id
      `,
      [sessionUserId, userLat, userLng, userLat, searchRadius]
    );

    // 2. Business Events Query
    const [businessEvents] = await connection.query(
      `
      SELECT 
        be.id,
        be.title,
        be.description,
        be.start_datetime,
        be.end_datetime,
        b.name AS business_name,
        b.logo_url AS business_logo,
        b.latitude,
        b.longitude,
        b.address AS user_address,
        b.category_id,
        (
          SELECT 1 
          FROM nearby_businessevent_attendees 
          WHERE event_id = be.id AND user_id = ?
        ) AS is_attending,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'media_url', bm.media_url,
            'media_type', bm.media_type
          )
        ) AS media,
        TRUE AS is_business_event
      FROM nearby_business_events be
      JOIN nearby_businesses b ON be.business_id = b.business_id
      LEFT JOIN nearby_business_event_media bm ON be.id = bm.event_id
      WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL
        ${dateCondition}
        AND (
          6371 * ACOS(
            COS(RADIANS(?)) * COS(RADIANS(b.latitude)) *
            COS(RADIANS(b.longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(b.latitude))
          )
        ) <= ?
      GROUP BY be.id
      `,
      [sessionUserId, userLat, userLng, userLat, searchRadius]
    );

    // Normalize business events
    const normalizedBusinessEvents = businessEvents.map((event) => ({
      ...event,
      user_rsvp_status: event.is_attending ? 'interested' : null,
      media: Array.isArray(event.media) ? event.media : [],
    }));

    const normalizedPersonalEvents = personalEvents.map((event) => ({
      ...event,
      media: Array.isArray(event.media) ? event.media : [],
      user_rsvp_status: event.user_rsvp_status || null,
    }));

    const combined = [...normalizedPersonalEvents, ...normalizedBusinessEvents];

    // Sort by start_datetime descending
    combined.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));

    res.json(combined);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  } finally {
    if (connection) connection.release();
  }
});




//Event attendance creation
app.post('/api/events/:eventId/rsvp', async (req, res) => {
  const userId = req.session.user?.id;
  const eventId = req.params.eventId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Insert or update RSVP status to 'interested'
    // Use ON DUPLICATE KEY UPDATE if you have a unique index on (event_id, user_id)
    await connection.query(
      `INSERT INTO nearby_event_attendees (event_id, user_id, rsvp_status)
       VALUES (?, ?, 'interested')
       ON DUPLICATE KEY UPDATE rsvp_status = 'interested', joined_at = CURRENT_TIMESTAMP`,
      [eventId, userId]
    );

    res.json({ success: true, message: 'RSVP saved' });
  } catch (err) {
    console.error('Error saving RSVP:', err);
    res.status(500).json({ error: 'Failed to save RSVP' });
  } finally {
    if (connection) connection.release();
  }
});


//Update event 

app.put('/api/events/:id', uploadEventMedia.array('mediaFiles', 5), async (req, res) => {

  const eventId = req.params.id;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Verify ownership of the event before updating
    const [eventOwner] = await connection.query(
      `SELECT user_id FROM nearby_events WHERE id = ?`,
      [eventId]
    );

    if (eventOwner.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventOwner[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to update this event' });
    }

    const {
      eventName,
      eventDescription,
      startDateTime,
      endDateTime,
      isRecurring,
      recurringPattern,
      locationType,
      physicalAddress,
      onlineLink,
      eventCategory,
      mediaUrlsToRemove,
    } = req.body;

    const isRecurringBool = isRecurring === 'true' || isRecurring === true;
    const updatedAt = getMySQLDatetime();

    // Update event details
    await connection.query(
      `UPDATE nearby_events
        SET title = ?, description = ?, start_datetime = ?, end_datetime = ?,
            is_recurring = ?, recurring_pattern = ?, location_type = ?,
            physical_address = ?, online_link = ?, category_id = ?,
            updated_at = ?
        WHERE id = ?`,
      [
        eventName,
        eventDescription,
        startDateTime,
        endDateTime,
        isRecurringBool ? 1 : 0,
        isRecurringBool ? recurringPattern : null,
        locationType,
        (locationType === 'physical' || locationType === 'hybrid') ? physicalAddress : null,
        (locationType === 'online' || locationType === 'hybrid') ? onlineLink : null,
        eventCategory || null,
        updatedAt,
        eventId,
      ]
    );

    // --- Handle Media Removal ---
    if (mediaUrlsToRemove) {
      const urlsToRemove = JSON.parse(mediaUrlsToRemove);
      if (urlsToRemove.length > 0) {
        const [mediaToDeleteRows] = await connection.query(
          `SELECT id, media_url FROM nearby_event_media WHERE media_url IN (?) AND event_id = ?`,
          [urlsToRemove, eventId]
        );

        const idsToDelete = mediaToDeleteRows.map(media => media.id);

        if (idsToDelete.length > 0) {
          // Delete from database
          await connection.query(
            `DELETE FROM nearby_event_media WHERE id IN (?) AND event_id = ?`,
            [idsToDelete, eventId]
          );

          const uploadDir = path.join(__dirname, '..', 'uploads', 'event_media');

          // Delete files from disk using callback-based fs.unlink
          const unlinkPromises = mediaToDeleteRows.map(media => {
            return new Promise((resolve, reject) => {
              const filePath = path.join(uploadDir, path.basename(media.media_url));
              fs.unlink(filePath, (unlinkErr) => { // Using callback here
                if (unlinkErr) {
                  console.error(`Error deleting file ${filePath}:`, unlinkErr);
                  // Resolve even on error, so one failed deletion doesn't stop others
                  // but still log the error. If you need strict failure, use reject.
                  resolve();
                } else {
                  // console.log(`Deleted file: ${filePath}`);
                  resolve();
                }
              });
            });
          });
          await Promise.all(unlinkPromises); // Wait for all unlink operations to complete
        }
      }
    }

    // --- Handle New Media Uploads ---
    if (req.files && req.files.length > 0) {
      const mediaInsertPromises = req.files.map(file => {
        const mediaUrl = `/uploads/event_media/${file.filename}`;
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        return connection.query(
          `INSERT INTO nearby_event_media (event_id, media_url, media_type) VALUES (?, ?, ?)`,
          [eventId, mediaUrl, mediaType]
        );
      });
      await Promise.all(mediaInsertPromises);
    }

    // Fetch the updated event details along with all its current media
    const [updatedEventRows] = await connection.query(
      `SELECT ne.*, GROUP_CONCAT(nem.media_url) as media_urls,
              GROUP_CONCAT(nem.id) as media_ids,
              GROUP_CONCAT(nem.media_type) as media_types
        FROM nearby_events ne
        LEFT JOIN nearby_event_media nem ON ne.id = nem.event_id
        WHERE ne.id = ?
        GROUP BY ne.id`,
      [eventId]
    );

    const updatedEvent = updatedEventRows[0];

    let media = [];
    if (updatedEvent?.media_urls) {
      const urls = updatedEvent.media_urls.split(',');
      const ids = updatedEvent.media_ids.split(',');
      const types = updatedEvent.media_types.split(',');
      media = urls.map((url, index) => ({
        id: ids[index],
        media_url: url,
        media_type: types[index],
      }));
    }

    // Emit the updated event data
    req.app.get('io').emit('event-updated', {
      id: eventId,
      userId,
      title: eventName,
      description: eventDescription,
      startDateTime,
      endDateTime,
      eventCategory,
      media,
      locationType,
      physicalAddress: (locationType === 'physical' || locationType === 'hybrid') ? physicalAddress : null,
      onlineLink: (locationType === 'online' || locationType === 'hybrid') ? onlineLink : null,
    });

    res.json({ success: true, eventId, event: updatedEvent });

  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  } finally {
    if (connection) connection.release();
  }
});


//User No longer attending:
app.delete('/api/events/:eventId/rsvp', async (req, res) => {
  const userId = req.session.user?.id;
  const eventId = req.params.eventId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Delete the RSVP entry for this user and event
    const [result] = await connection.query(
      `DELETE FROM nearby_event_attendees WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    res.json({ success: true, message: 'RSVP canceled' });
  } catch (err) {
    console.error('Error canceling RSVP:', err);
    res.status(500).json({ error: 'Failed to cancel RSVP' });
  } finally {
    if (connection) connection.release();
  }
});


//Current user attending the event
app.get('/api/events/attending', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Personal events
    const [personalEvents] = await connection.query(`
      SELECT 
        e.id,
        e.user_id,
        e.title,
        e.description,
        e.start_datetime,
        e.end_datetime,
        e.is_recurring,
        e.recurring_pattern,
        e.location_type,
        e.physical_address,
        e.online_link,
        e.category_id,

        u.userid AS creator_id,
        u.username AS creator_username,
        u.firstname AS creator_firstname,
        u.lastname AS creator_lastname,
        u.profile_picture AS creator_profile_picture,
        u.occupation AS creator_profession,

        JSON_ARRAYAGG(
          JSON_OBJECT(
            'media_url', m.media_url,
            'media_type', m.media_type
          )
        ) AS media,

        FALSE AS is_business_event

      FROM nearby_events e
      JOIN nearby_event_attendees a ON e.id = a.event_id
      LEFT JOIN nearby_event_media m ON e.id = m.event_id
      JOIN nearby_users u ON e.user_id = u.userid

      WHERE a.user_id = ? AND a.rsvp_status = 'interested'

      GROUP BY e.id
      ORDER BY e.start_datetime DESC
    `, [userId]);

    // 2. Business events
    const [businessEvents] = await connection.query(`
      SELECT 
        be.id,
        b.user_id,
        be.title,
        be.description,
        be.start_datetime,
        be.end_datetime,
        NULL AS is_recurring,
        NULL AS recurring_pattern,
        'physical' AS location_type,
        b.address AS physical_address,
        NULL AS online_link,
        b.category_id,

        b.user_id AS creator_id,
        NULL AS creator_username,
        NULL AS creator_firstname,
        NULL AS creator_lastname,
        b.logo_url AS creator_profile_picture,
        NULL AS creator_profession,

        JSON_ARRAYAGG(
          JSON_OBJECT(
            'media_url', bm.media_url,
            'media_type', bm.media_type
          )
        ) AS media,

        TRUE AS is_business_event,
        b.name AS business_name,
        b.logo_url AS business_logo

      FROM nearby_businessevent_attendees a
      JOIN nearby_business_events be ON a.event_id = be.id
      JOIN nearby_businesses b ON be.business_id = b.business_id
      LEFT JOIN nearby_business_event_media bm ON be.id = bm.event_id

      WHERE a.user_id = ?

      GROUP BY be.id
      ORDER BY be.start_datetime DESC
    `, [userId]);

    // Normalize media arrays
    const normalizeMedia = (events) =>
      events.map(e => ({
        ...e,
        media: Array.isArray(e.media) ? e.media : [],
        user_rsvp_status: 'interested'
      }));

    const normalizeBusinessFlag = (events) =>
      events.map((e) => ({
        ...e,
        is_business_event: !!e.is_business_event, // Ensures it's a proper boolean
      }));

    const combined = [
      ...normalizeBusinessFlag(normalizeMedia(personalEvents)),
      ...normalizeBusinessFlag(normalizeMedia(businessEvents)),
    ];

    // Optional: sort again by start_datetime if needed
    combined.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));

    res.json(combined);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attending events' });
  } finally {
    if (connection) connection.release();
  }
});




//Fetch events by current user

app.get('/api/events/mine', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  let connection;
  try {
    connection = await pool.getConnection();

    const [events] = await connection.query(`
      SELECT 
        e.id,
        e.user_id,
        e.title,
        e.description,
        e.start_datetime,
        e.end_datetime,
        e.is_recurring,
        e.recurring_pattern,
        e.location_type,
        e.physical_address,
        e.online_link,
        e.category_id,

        -- Creator (user) info, added directly as flat fields
        u.userid AS creator_id,
        u.username AS creator_username,
        u.firstname AS creator_firstname,
        u.lastname AS creator_lastname,
        u.profile_picture AS creator_profile_picture,
        u.occupation AS creator_profession,

        -- Media
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'media_url', m.media_url,
            'media_type', m.media_type
          )
        ) AS media

      FROM nearby_events e
      LEFT JOIN nearby_event_media m ON e.id = m.event_id
      JOIN nearby_users u ON e.user_id = u.userid

      WHERE e.user_id = ?
      GROUP BY
        e.id, e.user_id, e.title, e.description, e.start_datetime, e.end_datetime,
        e.is_recurring, e.recurring_pattern, e.location_type, e.physical_address,
        e.online_link, e.category_id,
        u.userid, u.username, u.firstname, u.lastname, u.profile_picture, u.occupation

      ORDER BY e.start_datetime DESC
    `, [userId]);

    const formattedEvents = events.map(event => ({
      ...event,
      media: Array.isArray(event.media) ? event.media : [],
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user events' });
  } finally {
    if (connection) connection.release();
  }
});




//Fetch list of users attending an event
app.get('/api/events/:eventId/attendees', async (req, res) => {
  const eventId = req.params.eventId;

  let connection;
  try {
    connection = await pool.getConnection();

    const [attendees] = await connection.query(
      `
      SELECT 
        u.userid,
        u.firstname,
        u.lastname,
        u.username,
        u.profile_picture
      FROM nearby_event_attendees a
      JOIN nearby_users u ON a.user_id = u.userid
      WHERE a.event_id = ? AND a.rsvp_status = 'interested'
      ORDER BY a.joined_at DESC
      `,
      [eventId]
    );

    res.json(attendees);
  } catch (err) {
    console.error('Error fetching event attendees:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  } finally {
    if (connection) connection.release();
  }
});




app.delete('/api/events/:eventId', async (req, res) => {
  const userId = req.session.user?.id;
  const eventId = req.params.eventId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Verify event ownership
    const [events] = await connection.query(
      `SELECT * FROM nearby_events WHERE id = ? AND user_id = ?`,
      [eventId, userId]
    );

    if (events.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to delete this event' });
    }

    // Get media file URLs
    const [mediaFiles] = await connection.query(
      `SELECT media_url FROM nearby_event_media WHERE event_id = ?`,
      [eventId]
    );

    // Delete files from disk with async/await and existence check
    const mediaDir = path.join(__dirname, '../uploads/event_media');

    for (const media of mediaFiles) {
      try {
        const filename = path.basename(media.media_url); // safely get just the filename
        const filePath = path.join(mediaDir, filename); // builds correct absolute path

        console.log('Attempting to delete:', filePath); // Debug log

        await fs.promises.unlink(filePath); // Use promise-based unlink
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn(`Error deleting file: ${err.message}`);
        } else {
          console.log(`File already deleted or not found: ${media.media_url}`);
        }
      }
    }

    // Delete media records from DB
    await connection.query(`DELETE FROM nearby_event_media WHERE event_id = ?`, [eventId]);

    // Delete event record
    await connection.query(`DELETE FROM nearby_events WHERE id = ?`, [eventId]);

    // Emit deletion event with just eventId
    req.app.get('io').emit('event-deleted', eventId);

    res.json({ success: true, message: 'Event and associated media deleted' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  } finally {
    if (connection) connection.release();
  }
});


///////////////////////////
///////////////////////////
//////////////////////////

///////////////
//--------- NOTIFICATIONS  -----///////////

app.get('/api/notifications', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;

  try {
    await withConnection(async (conn) => {
      const [notifications] = await conn.query(
        `
        SELECT
          n.notification_id AS id,
          n.recipient_user_id,
          n.actor_user_id,
          actor.firstname AS actorFirstName,
          actor.lastname AS actorLastName,
          actor.profile_picture AS actorProfilePicture,
          recipient.firstname AS recipientFirstName,
          recipient.lastname AS recipientLastName,
          recipient.profile_picture AS recipientProfilePicture,
          n.action_type,
          n.target_type,
          n.target_id,
          n.parent_type,
          n.parent_id,
          n.metadata,
          n.is_read AS \`read\`,
          n.created_at
        FROM nearby_notifications n
        LEFT JOIN nearby_users actor ON n.actor_user_id = actor.userid
        LEFT JOIN nearby_users recipient ON n.recipient_user_id = recipient.userid
        WHERE n.recipient_user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50;
        `,
        [userId]
      );

      // No additional enrichment needed; just send raw notifications
      res.json({ notifications });
    });
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});




// Mark all notifications as read
app.post('/api/notifications/mark-read', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await withConnection(async (conn) => {
      await conn.query(
        `UPDATE nearby_notifications SET is_read = 1 WHERE recipient_user_id = ?`,
        [user.id]
      );
      res.json({ success: true });
    });
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});


// Mark a single notification as read
app.post('/api/notifications/:id/mark-read', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const notificationId = req.params.id;

  try {
    await withConnection(async (conn) => {
      const [result] = await conn.query(
        `UPDATE nearby_notifications SET is_read = 1 WHERE notification_id = ? AND recipient_user_id = ?`,
        [notificationId, user.id]
      );
      res.json({ success: true });
    });
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});




app.get('/api/notifications/count', async (req, res) => {
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [[{ count }]] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM nearby_notifications
       WHERE recipient_user_id = ? AND is_read = 0`,
      [userId]
    );

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('Error fetching notification count:', err);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  } finally {
    if (connection) connection.release();
  }
});




/////////////////////////////



/////////////////////////////////////

/////// BUSINESS PAGE ///////////////




app.post('/api/businesses', uploadBusinessMedia.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]), async (req, res) => {

  if (!req.session?.user) return res.status(401).json({ error: 'User not logged in' });

  const userId = req.session.user.id;

  // Extract from body (form-data fields)
  let {
    name,
    description,
    address,
    latitude,
    longitude,
    category_id,
    phone,
  } = req.body;

  // Optional files
  const logoFile = req.files?.logo?.[0];
  const bannerFile = req.files?.banner?.[0];

  const logo_url = logoFile ? `/uploads/business_media/${logoFile.filename}` : null;
  const banner_url = bannerFile ? `/uploads/business_media/${bannerFile.filename}` : null;

  name = sanitizeHtml(name?.trim(), { allowedTags: [], allowedAttributes: {} });
  description = sanitizeHtml(description?.trim() || '', { allowedTags: [], allowedAttributes: {} });
  address = sanitizeHtml(address?.trim(), { allowedTags: [], allowedAttributes: {} });

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);
  category_id = parseInt(category_id);

  if (!name || !address || isNaN(latitude) || isNaN(longitude) || !category_id) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const createdAt = new Date();
  const updatedAt = createdAt;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO nearby_businesses
      (user_id, name, description, logo_url, banner_url, address, latitude, longitude, category_id, phone, average_rating, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `;

    const [result] = await connection.query(insertQuery, [
      userId,
      name,
      description,
      logo_url,
      banner_url,
      address,
      latitude,
      longitude,
      category_id,
      phone || null,
      createdAt,
      updatedAt,
    ]);

    const businessId = result.insertId;

    await connection.commit();

    io.emit('new_business', {
      businessId,
      userId,
      name,
      description,
      logo_url,
      banner_url,
      address,
      latitude,
      longitude,
      category_id,
      average_rating: 0,
      createdAt,
      updatedAt,
    });

    res.status(200).json({ message: 'Business registered successfully', businessId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error inserting business:', error);
    res.status(500).json({ error: 'Failed to register business.' });
  } finally {
    if (connection) connection.release();
  }
});


app.put('/api/businesses/:id', uploadBusinessMedia.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]), async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'User not logged in' });

  const userId = req.session.user.id;
  const businessId = parseInt(req.params.id);
  if (isNaN(businessId)) return res.status(400).json({ error: 'Invalid business ID' });

  // Extract fields from form-data body
  let {
    name,
    description,
    address,
    latitude,
    longitude,
    category_id,
    phone,
  } = req.body;

  // Files if provided
  const logoFile = req.files?.logo?.[0];
  const bannerFile = req.files?.banner?.[0];

  // Sanitize and parse
  name = sanitizeHtml(name?.trim(), { allowedTags: [], allowedAttributes: {} });
  description = sanitizeHtml(description?.trim() || '', { allowedTags: [], allowedAttributes: {} });
  address = sanitizeHtml(address?.trim(), { allowedTags: [], allowedAttributes: {} });

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);
  category_id = parseInt(category_id);

  if (!name || !address || isNaN(latitude) || isNaN(longitude) || !category_id) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const updatedAt = new Date();

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check ownership: only allow user to update their own business
    const [existing] = await connection.query(
      'SELECT user_id FROM nearby_businesses WHERE business_id = ?',
      [businessId]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Business not found' });
    }
    if (existing[0].user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ error: 'Forbidden: not your business' });
    }

    // Build dynamic update query parts for optional files
    const fieldsToUpdate = [
      'name = ?',
      'description = ?',
      'address = ?',
      'latitude = ?',
      'longitude = ?',
      'category_id = ?',
      'phone = ?',
      'updated_at = ?',
    ];
    const params = [
      name,
      description,
      address,
      latitude,
      longitude,
      category_id,
      phone || null,
      updatedAt,
    ];

    if (logoFile) {
      fieldsToUpdate.push('logo_url = ?');
      params.push(`/uploads/business_media/${logoFile.filename}`);
    }

    if (bannerFile) {
      fieldsToUpdate.push('banner_url = ?');
      params.push(`/uploads/business_media/${bannerFile.filename}`);
    }

    params.push(businessId);

    const updateQuery = `
      UPDATE nearby_businesses
      SET ${fieldsToUpdate.join(', ')}
      WHERE business_id = ?
    `;

    await connection.query(updateQuery, params);

    await connection.commit();

    io.emit('update_business', {
      businessId,
      userId,
      name,
      description,
      logo_url: logoFile ? `/uploads/business_media/${logoFile.filename}` : undefined,
      banner_url: bannerFile ? `/uploads/business_media/${bannerFile.filename}` : undefined,
      address,
      latitude,
      longitude,
      category_id,
      phone,
      updatedAt,
    });

    res.status(200).json({ message: 'Business updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business.' });
  } finally {
    if (connection) connection.release();
  }
});





app.get('/api/business_categories', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(`SELECT id, name FROM nearby_business_categories ORDER BY name ASC`);
    res.json({ categories: results });
  } catch (err) {
    console.error('DB error fetching categories:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
});


app.get('/api/businesses', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Query businesses joined with categories
    const [businesses] = await connection.query(`
      SELECT
        b.business_id,
        b.user_id,
        b.name,
        b.description,
        b.logo_url,
        b.banner_url,
        b.address,
        b.latitude,
        b.longitude,
        b.category_id,
        c.name AS category_name,
        b.phone,
        b.created_at,
        b.updated_at
      FROM nearby_businesses b
      LEFT JOIN nearby_business_categories c ON b.category_id = c.id
      ORDER BY b.created_at DESC
    `);

    // Get all business IDs to query reviews in batch
    const businessIds = businesses.map(b => b.id);
    let reviewsMap = {};

    if (businessIds.length > 0) {
      // Fetch reviews grouped by business_id
      const [reviews] = await connection.query(`
        SELECT
          id,
          business_id,
          user_id,
          rating,
          review,
          created_at
        FROM nearby_business_reviews
        WHERE business_id IN (?)
        ORDER BY created_at DESC
      `, [businessIds]);

      // Organize reviews by business_id
      reviewsMap = reviews.reduce((acc, rev) => {
        if (!acc[rev.business_id]) acc[rev.business_id] = [];
        acc[rev.business_id].push({
          id: rev.id,
          user_id: rev.user_id,
          rating: rev.rating,
          review: rev.review,
          created_at: rev.created_at,
        });
        return acc;
      }, {});
    }

    // Compose final response with average_rating and reviews
    const result = businesses.map(biz => {
      const bizReviews = reviewsMap[biz.id] || [];
      const avgRating =
        bizReviews.length > 0
          ? (bizReviews.reduce((sum, r) => sum + r.rating, 0) / bizReviews.length).toFixed(2)
          : 0;

      return {
        id: biz.business_id,
        user_id: biz.user_id,
        name: biz.name,
        description: biz.description,
        logo_url: biz.logo_url,
        banner_url: biz.banner_url,
        address: biz.address,
        latitude: biz.latitude,
        longitude: biz.longitude,
        category: {
          id: biz.category_id,
          name: biz.category_name,
        },
        phone: biz.phone,
        average_rating: parseFloat(avgRating),
        created_at: biz.created_at,
        updated_at: biz.updated_at,
        reviews: bizReviews,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching businesses with reviews:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  } finally {
    if (connection) connection.release();
  }
});


app.get('/api/businesses/:id', async (req, res) => {
  const businessId = parseInt(req.params.id);
  if (isNaN(businessId)) {
    return res.status(400).json({ error: 'Invalid business ID' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Fetch the single business with category and creator info
    const [businesses] = await connection.query(`
      SELECT
        b.business_id AS id,
        b.user_id,
        b.name,
        b.description,
        b.logo_url,
        b.banner_url,
        b.address,
        b.latitude,
        b.longitude,
        b.category_id,
        c.name AS category_name,
        b.phone,
        b.created_at,
        b.updated_at,
        u.userid AS creator_userid,
        u.username AS creator_username,
        u.firstname AS creator_firstname,
        u.lastname AS creator_lastname,
        u.profile_picture AS creator_profile_picture
      FROM nearby_businesses b
      LEFT JOIN nearby_business_categories c ON b.category_id = c.id
      LEFT JOIN nearby_users u ON b.user_id = u.userid
      WHERE b.business_id = ?
      LIMIT 1
    `, [businessId]);

    if (businesses.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const biz = businesses[0];

    // Fetch reviews for this business
    const [reviews] = await connection.query(`
  SELECT
    r.id,
    r.business_id,
    r.user_id,
    r.rating,
    r.review,
    r.created_at,
    CONCAT(u.firstname, ' ', u.lastname) AS name,
    u.username,
    u.profile_picture AS avatar,
    u.address AS location
  FROM nearby_business_reviews r
  JOIN nearby_users u ON r.user_id = u.userid
  WHERE r.business_id = ?
  ORDER BY r.created_at DESC
`, [businessId]);


    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
        : 0;

    // Fetch business hours
    const [hours] = await connection.query(`
      SELECT
        day_of_week AS day,
        open_time,
        close_time,
        is_closed
      FROM nearby_business_hours
      WHERE business_id = ?
      ORDER BY
        FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    `, [businessId]);

    const formattedHours = hours.map(h => ({
      day: h.day,
      open_time: h.open_time ? h.open_time.slice(0, 5) : null, // format HH:MM
      close_time: h.close_time ? h.close_time.slice(0, 5) : null,
      is_closed: Boolean(h.is_closed),
    }));


    const [services] = await connection.query(
      `SELECT ns.serviceid AS id, ns.name AS title
   FROM nearby_services ns
   JOIN nearby_business_services bs ON ns.serviceid = bs.serviceid
   WHERE bs.business_id = ?`,
      [businessId]
    );

    // Then include `services` in the response

    const result = {
      id: biz.id,
      user_id: biz.user_id,
      name: biz.name,
      description: biz.description,
      logo_url: biz.logo_url,
      banner_url: biz.banner_url,
      address: biz.address,
      latitude: biz.latitude,
      longitude: biz.longitude,
      category: {
        id: biz.category_id,
        name: biz.category_name,
      },
      phone: biz.phone,
      average_rating: parseFloat(avgRating),
      created_at: biz.created_at,
      updated_at: biz.updated_at,
      reviews: reviews.map(r => ({
        id: r.id,
        user_id: r.user_id,
        rating: r.rating,
        review: r.review,
        created_at: r.created_at,
        name: r.name,
        username: r.username,
        avatar: r.avatar,
        location: r.location,
      })),
      services: services || [],


      hours: formattedHours,
      creator: {
        userid: biz.creator_userid,
        username: biz.creator_username,
        firstname: biz.creator_firstname,
        lastname: biz.creator_lastname,
        profile_picture: biz.creator_profile_picture,
      },
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching business by ID:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  } finally {
    if (connection) connection.release();
  }
});


app.put('/api/businesses/:id/hours', async (req, res) => {
  const { id } = req.params;
  const { hours } = req.body;
  if (!hours || !Array.isArray(hours)) {
    return res.status(400).json({ error: 'Invalid hours format' });
  }
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query('DELETE FROM nearby_business_hours WHERE business_id = ?', [id]);

      const insertPromises = hours.map(h =>
        conn.query(
          `INSERT INTO nearby_business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)`,
          [id, h.day, h.open_time, h.close_time, h.is_closed ? 1 : 0]
        )
      );
      await Promise.all(insertPromises);

      await conn.commit();
      conn.release();

      // Emit event via socket.io to notify clients
      io.emit('businessHoursUpdated', { businessId: id, hours });

      return res.json({ message: 'Hours updated successfully', hours });
    } catch (error) {
      await conn.rollback();
      conn.release();
      console.error('Error updating hours:', error);
      return res.status(500).json({ error: 'Failed to update hours' });
    }
  } catch (connErr) {
    console.error('DB connection error:', connErr);
    return res.status(500).json({ error: 'Database connection error' });
  }
});




/////////REVIEWS /////////////
app.post('/api/reviews', async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  const userId = req.session.user.id;
  const { business_id, rating, review } = req.body;

  if (!business_id || !rating || !review) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const createdAt = new Date();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO nearby_business_reviews (business_id, user_id, rating, review, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await connection.query(insertQuery, [
      business_id,
      userId,
      parseInt(rating),
      review.trim(),
      createdAt
    ]);

    // Optional: fetch review with joined user data for return
    const [reviewResult] = await connection.query(
      `
        SELECT r.*, CONCAT(u.firstname, ' ', u.lastname) AS name, u.username, u.profile_picture as avatar, u.address as location
        FROM nearby_business_reviews r
        JOIN nearby_users u ON r.user_id = u.userid
        WHERE r.business_id = ? AND r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 1
      `,
      [business_id, userId]
    );

    await connection.commit();

    const newReview = reviewResult[0];

    // Emit real-time event to connected clients
    io.to(`business_${business_id}`).emit('new_review', {
      business_id,
      review: newReview
    });
    res.status(201).json(newReview);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review.' });
  } finally {
    if (connection) connection.release();
  }
});


//Services
app.get('/api/services', async (req, res) => {
  try {
    await withConnection(async (conn) => {
      const [services] = await conn.query('SELECT serviceid, name FROM nearby_services ORDER BY name');
      res.json(services);
    });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// PUT /api/businesses/:id/services
app.put('/api/businesses/:id/services', async (req, res) => {
  const businessId = req.params.id;
  const { service_ids } = req.body;

  if (!Array.isArray(service_ids)) {
    return res.status(400).json({ message: 'Invalid service_ids' });
  }

  try {
    await withConnection(async (conn) => {
      // Delete existing
      await conn.query(
        'DELETE FROM nearby_business_services WHERE business_id = ?',
        [businessId]
      );

      if (service_ids.length > 0) {
        const values = service_ids.map(serviceid => [businessId, serviceid]);
        await conn.query(
          'INSERT INTO nearby_business_services (business_id, serviceid) VALUES ?',
          [values]
        );
      }

      // Fetch updated service details to return
      const [services] = await conn.query(
        `SELECT ns.serviceid AS id, ns.name AS title
         FROM nearby_services ns
         JOIN nearby_business_services bs ON ns.serviceid = bs.serviceid
         WHERE bs.business_id = ?`,
        [businessId]
      );

      res.json({ services });
    });
  } catch (err) {
    console.error('Error updating business services:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//Business events:
app.post('/api/business/:id/events', async (req, res) => {
  const businessId = parseInt(req.params.id);
  const { title, description, date } = req.body;

  if (!title || !description || !date || isNaN(businessId)) {
    return res.status(400).json({ message: 'Missing or invalid fields' });
  }

  try {
    await withConnection(pool, async (conn) => {
      // Insert new event into business_events table
      const [result] = await conn.query(
        `INSERT INTO nearby_business_events (business_id, title, description, date)
         VALUES (?, ?, ?, ?)`,
        [businessId, title, description, date]
      );

      // Fetch the newly created event
      const [newEventRows] = await conn.query(
        'SELECT * FROM nearby_business_events WHERE id = ?',
        [result.insertId]
      );
      const newEvent = newEventRows[0];

      // Emit socket event for new business event
      io.emit('business:event_created', newEvent);

      res.status(201).json(newEvent);
    });
  } catch (err) {
    console.error('Error creating business event:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/businesses/:id/events', uploadBusinessMedia.array('media', 5), async (req, res) => {
  const businessId = req.params.id;
  const { title, description, start_datetime, end_datetime } = req.body;
  const mediaFiles = req.files;
  const loggedInUserId = req.session?.user?.id;

  if (!loggedInUserId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
  }

  if (!title || !start_datetime || !end_datetime) {
    return res.status(400).json({ error: 'Title, start date & time and end date & time are required' });
  }

  try {
    const createdAt = getMySQLDatetime();

    await withConnection(async (conn) => {
      // Verify that the logged-in user owns this business
      const [businessRows] = await conn.query(
        `SELECT user_id FROM nearby_businesses WHERE business_id = ?`,
        [businessId]
      );

      if (businessRows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const businessOwnerId = businessRows[0].user_id;
      if (businessOwnerId !== loggedInUserId) {
        return res.status(403).json({ error: 'Forbidden: You do not own this business' });
      }

      // Insert the new business event
      const [eventResult] = await conn.query(
        `INSERT INTO nearby_business_events 
          (business_id, title, description, start_datetime, end_datetime, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [businessId, title, description || null, start_datetime, end_datetime, createdAt]
      );

      const eventId = eventResult.insertId;

      // Insert media metadata if files were uploaded
      if (mediaFiles && mediaFiles.length > 0) {
        const mediaValues = mediaFiles.map(file => [
          eventId,
          `/uploads/business_media/${file.filename}`,
          file.mimetype,
          createdAt
        ]);

        await conn.query(
          `INSERT INTO nearby_business_event_media 
            (event_id, media_url, media_type, created_at) 
           VALUES ?`,
          [mediaValues]
        );
      }

      // Fetch event and media to send back
      const [createdEvent] = await conn.query(
        `SELECT * FROM nearby_business_events WHERE id = ?`,
        [eventId]
      );

      const [media] = await conn.query(
        `SELECT * FROM nearby_business_event_media WHERE event_id = ?`,
        [eventId]
      );

      const result = {
        ...createdEvent[0],
        media
      };

      // Emit socket event notifying clients about new business event
      io.to(`business_${businessId}`).emit('newBusinessEvent', { businessId, event: result });

      res.status(201).json(result);
    });

  } catch (error) {
    console.error('Error creating business event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.put('/api/businesses/:id/events/:eventId', uploadBusinessMedia.array('media', 5), async (req, res) => {
  const businessId = req.params.id;
  const eventId = req.params.eventId;
  const { title, description, start_datetime, end_datetime, mediaToDelete } = req.body;
  const mediaFiles = req.files;
  const loggedInUserId = req.session?.user?.id;

  if (!loggedInUserId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
  }

  if (!title || !start_datetime || !end_datetime) {
    return res.status(400).json({ error: 'Title, start date & time and end date & time are required' });
  }

  try {
    const updatedAt = getMySQLDatetime();

    await withConnection(async (conn) => {
      const [businessRows] = await conn.query(
        `SELECT user_id FROM nearby_businesses WHERE business_id = ?`,
        [businessId]
      );

      if (businessRows.length === 0) return res.status(404).json({ error: 'Business not found' });
      if (businessRows[0].user_id !== loggedInUserId) return res.status(403).json({ error: 'Forbidden' });

      // Update main event
      await conn.query(
        `UPDATE nearby_business_events 
         SET title = ?, description = ?, start_datetime = ?, end_datetime = ?, updated_at = ?
         WHERE id = ? AND business_id = ?`,
        [title, description || null, start_datetime, end_datetime, updatedAt, eventId, businessId]
      );

      // Handle media deletion
      if (mediaToDelete) {
        const toDelete = Array.isArray(mediaToDelete) ? mediaToDelete : [mediaToDelete];
        for (const url of toDelete) {
          const filePath = path.resolve(process.cwd(), '..', url.replace(/^\//, ''));
          try {
            await fs.promises.unlink(filePath);
          } catch (err) {
            console.warn('File not found or already deleted:', filePath);
          }

          await conn.query(
            `DELETE FROM nearby_business_event_media 
             WHERE event_id = ? AND media_url = ?`,
            [eventId, url]
          );
        }
      }

      // Handle new media uploads
      if (mediaFiles?.length > 0) {
        const mediaValues = mediaFiles.map(file => [
          eventId,
          `/uploads/business_media/${file.filename}`,
          file.mimetype,
          updatedAt
        ]);
        await conn.query(
          `INSERT INTO nearby_business_event_media 
           (event_id, media_url, media_type, created_at) 
           VALUES ?`,
          [mediaValues]
        );
      }

      // Fetch updated event
      const [updatedEvent] = await conn.query(
        `SELECT * FROM nearby_business_events WHERE id = ?`,
        [eventId]
      );
      const [media] = await conn.query(
        `SELECT * FROM nearby_business_event_media WHERE event_id = ?`,
        [eventId]
      );

      const result = { ...updatedEvent[0], media };

      res.status(200).json(result);
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.get('/api/businesses/:id/events', async (req, res) => {
  const businessId = req.params.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Fetch events for this business along with business latitude and longitude
    const [events] = await connection.query(
      `SELECT e.*, b.latitude, b.longitude 
       FROM nearby_business_events e
       JOIN nearby_businesses b ON e.business_id = b.business_id
       WHERE e.business_id = ?
       ORDER BY e.start_datetime DESC`,
      [businessId]
    );

    if (events.length === 0) {
      return res.json([]);
    }

    // Fetch all media for these events
    const eventIds = events.map(e => e.id);
    const [mediaRows] = await connection.query(
      `SELECT * FROM nearby_business_event_media WHERE event_id IN (?)`,
      [eventIds]
    );

    // Group media by event_id
    const mediaByEvent = mediaRows.reduce((acc, media) => {
      if (!acc[media.event_id]) acc[media.event_id] = [];
      acc[media.event_id].push(media);
      return acc;
    }, {});

    // Attach media to each event
    const eventsWithMedia = events.map(event => ({
      ...event,
      media: mediaByEvent[event.id] || [],
      latitude: event.latitude,
      longitude: event.longitude
    }));

    res.json(eventsWithMedia);
  } catch (error) {
    console.error('Error fetching business events:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});




//EVENR DELETION FOR BUSINESSES

function unlinkAsync(filePath) {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

app.delete('/api/businesses/:businessId/events/:eventId', async (req, res) => {
  const { businessId, eventId } = req.params;
  const loggedInUserId = req.session?.user?.id; // Ensure session middleware is used

  if (!loggedInUserId) {
    return res.status(401).json({ error: 'Unauthorized: User not logged in' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    // Check if the logged-in user owns the business
    const [businessRows] = await connection.query(
      `SELECT user_id FROM nearby_businesses WHERE business_id = ?`,
      [businessId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessOwnerId = businessRows[0].user_id;
    if (businessOwnerId !== loggedInUserId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this business' });
    }

    await connection.beginTransaction();

    // Fetch media to delete files
    const [mediaRows] = await connection.query(
      `SELECT * FROM nearby_business_event_media WHERE event_id = ?`,
      [eventId]
    );

    // Delete media files from disk
    for (const media of mediaRows) {
      try {
        const filePath = path.resolve(process.cwd(), '..', media.media_url.replace(/^\//, ''));
        await unlinkAsync(filePath);
      } catch (err) {
        console.warn(`Failed to delete media file at ${media.media_url}:`, err.message);
      }
    }

    // Delete media metadata
    await connection.query(
      `DELETE FROM nearby_business_event_media WHERE event_id = ?`,
      [eventId]
    );

    // Delete the event
    const [result] = await connection.query(
      `DELETE FROM nearby_business_events WHERE id = ? AND business_id = ?`,
      [eventId, businessId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }

    await connection.commit();

    io.to(`business_${businessId}`).emit('businessEventDeleted', { eventId });
    res.json({ message: 'Event deleted successfully', eventId });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting business event:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});


app.get('/api/events/by-business', async (req, res) => {
  const sessionUserId = req.session.user?.id;
  let connection;

  try {
    connection = await pool.getConnection();

    // Fetch all events with business info
    const [events] = await connection.query(
      `SELECT 
         e.*, 
         b.name AS business_name, 
         b.latitude, 
         b.longitude, 
         b.address AS business_address, 
         b.logo_url AS business_logo
       FROM nearby_business_events e
       JOIN nearby_businesses b ON e.business_id = b.business_id
       ORDER BY e.start_datetime DESC`
    );

    if (events.length === 0) {
      return res.json([]);
    }

    const eventIds = events.map((e) => e.id);

    // Fetch media
    const [mediaRows] = await connection.query(
      `SELECT * FROM nearby_business_event_media WHERE event_id IN (?)`,
      [eventIds]
    );

    // Fetch user's attendance
    // Fetch user's attendance with RSVP status
    let attendanceMap = {};
    if (sessionUserId) {
      const [attendanceRows] = await connection.query(
        `SELECT event_id, 'interested' AS rsvp_status 
     FROM nearby_businessevent_attendees 
     WHERE user_id = ? AND event_id IN (?)`,
        [sessionUserId, eventIds]
      );
      attendanceMap = attendanceRows.reduce((acc, row) => {
        acc[row.event_id] = row.rsvp_status;
        return acc;
      }, {});
    }


    // Group media by event_id
    const mediaByEvent = mediaRows.reduce((acc, media) => {
      if (!acc[media.event_id]) acc[media.event_id] = [];
      acc[media.event_id].push(media);
      return acc;
    }, {});

    // Attach media and flags
    const eventsWithMedia = events.map((event) => ({
      ...event,
      media: mediaByEvent[event.id] || [],
      is_business_event: true,
      is_attending: attendanceMap[event.id] !== undefined,
      user_rsvp_status: attendanceMap[event.id] || null, // add this
    }));


    res.json(eventsWithMedia);
  } catch (error) {
    console.error('Error fetching business events:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});




//Fetch business ownership
app.get('/api/businesses/:id', async (req, res) => {
  const businessId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT business_id, user_id, name FROM nearby_businesses WHERE business_id = ?`,
      [businessId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Business not found' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching business owner:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Buisness event attendees
app.post('/api/businessevents/:eventId/attend', async (req, res) => {
  const userId = req.session?.user?.id;
  const { eventId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await withConnection(async (conn) => {
      // Step 1: Get the business_id of the event
      const [eventRows] = await conn.query(
        'SELECT business_id FROM nearby_business_events WHERE id = ?',
        [eventId]
      );

      if (eventRows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const businessId = eventRows[0].business_id;

      // Step 2: Check if logged-in user owns this business
      const [businessRows] = await conn.query(
        'SELECT * FROM nearby_businesses WHERE business_id = ? AND user_id = ?',
        [businessId, userId]
      );

      if (businessRows.length > 0) {
        // User owns this business, prevent attendance
        return res.status(403).json({ error: 'Business owners cannot attend their own events' });
      }

      // Step 3: Record attendance
      const createdAt = getMySQLDatetime();
      await conn.query(
        `INSERT IGNORE INTO nearby_businessevent_attendees (event_id, user_id, created_at) VALUES (?, ?, ?)`,
        [eventId, userId, createdAt]
      );

      res.json({ message: 'Attendance recorded', eventId, userId });
    });
  } catch (err) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//Remove attendance

app.delete('/api/businessevents/:eventId/attend', async (req, res) => {
  const userId = req.session?.user?.id;
  const { eventId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await withConnection(async (conn) => {
      await conn.query(
        `DELETE FROM nearby_businessevent_attendees WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
      );

      res.json({ message: 'Attendance removed', eventId, userId });
    });
  } catch (err) {
    console.error('Error removing attendance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//see business event attendees
// GET list of attendees for a given event
app.get('/api/businessevents/:eventId/attendees', async (req, res) => {

  const { eventId } = req.params; // eventId is defined here

  try {
    await withConnection(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
           u.userid,
           u.username,
           CONCAT(u.firstname, ' ', u.lastname) AS full_name,
           u.profile_picture,
           u.address
         FROM nearby_businessevent_attendees a
         JOIN nearby_users u ON a.user_id = u.userid
         WHERE a.event_id = ?`,
        [eventId]
      );


      res.json(rows);
    });
  } catch (err) {
    console.error('Error fetching attendees:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//Current user attending a business event
app.get('/api/businessevents/attending', async (req, res) => {
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await withConnection(async (conn) => {
      // 1. Get business events the user is attending
      const [events] = await conn.query(
        `
        SELECT e.*, b.name AS business_name, b.logo_url AS business_logo, b.latitude, b.longitude
        FROM nearby_businessevent_attendees a
        JOIN nearby_business_events e ON a.event_id = e.id
        JOIN nearby_businesses b ON e.business_id = b.business_id
        WHERE a.user_id = ?
        ORDER BY e.start_datetime DESC
        `,
        [userId]
      );

      if (events.length === 0) {
        return res.json([]);
      }

      // 2. Get media for all those events
      const eventIds = events.map(e => e.id);
      const [mediaRows] = await conn.query(
        `SELECT * FROM nearby_business_event_media WHERE event_id IN (?)`,
        [eventIds]
      );

      // 3. Group media by event_id
      const mediaByEvent = mediaRows.reduce((acc, media) => {
        if (!acc[media.event_id]) acc[media.event_id] = [];
        acc[media.event_id].push(media);
        return acc;
      }, {});

      // 4. Attach media + RSVP flag to each event
      const enrichedEvents = events.map(event => ({
        ...event,
        media: mediaByEvent[event.id] || [],
        user_rsvp_status: 'interested', // for UI toggle logic
      }));

      res.json(enrichedEvents);
    });
  } catch (err) {
    console.error('Error fetching attending business events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//FETCH PRODUCTS FOR THE BUSINESS
app.get('/api/businesses/:businessId/products', async (req, res) => {
  const businessId = parseInt(req.params.businessId, 10);
  if (isNaN(businessId)) {
    return res.status(400).json({ error: 'Invalid business ID' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Query to get products
    const productsQuery = `
      SELECT p.product_id, p.user_id, p.name, p.description, p.price, p.is_free, p.category_id, p.created_at,
             pc.name AS category_name
      FROM nearby_products p
      LEFT JOIN nearby_product_categories pc ON p.category_id = pc.category_id
      WHERE p.business_id = ?
      ORDER BY p.created_at DESC
    `;
    const [products] = await connection.execute(productsQuery, [businessId]);

    // Get images for all products in one query
    let images = [];
    const productIds = products.map(p => p.product_id);
    if (productIds.length > 0) {
      // Use the right number of placeholders for IN clause
      const placeholders = productIds.map(() => '?').join(',');
      const imagesQuery = `
        SELECT product_id, image_url
        FROM nearby_product_images
        WHERE product_id IN (${placeholders})
      `;
      [images] = await connection.execute(imagesQuery, productIds);
    }

    // Map images to products
    const productsWithImages = products.map(product => ({
      ...product,
      images: images
        .filter(img => img.product_id === product.product_id)
        .map(img => img.image_url),
    }));

    res.json(productsWithImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching products' });
  } finally {
    if (connection) connection.release();
  }
});




////MESSAGING LOGIC
app.post('/api/businessmessages', uploadBusinessMedia.array('media'), async (req, res) => {
  const {
    room_id, sender_id, recipient_id,
    text, created_at, sender_type, recipient_type,
    reply_to_message_id = null, product_id = null,
  } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      `INSERT INTO nearby_message
       (room_id, sender_id, recipient_id, text, created_at, sender_type, recipient_type, reply_to_message_id, product_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [room_id, sender_id, recipient_id, text, created_at, sender_type, recipient_type, reply_to_message_id, product_id]
    );

    const message_id = result.insertId;

    // Save media files info from req.files
    if (req.files && req.files.length > 0) {
      const mediaValues = req.files.map(file => [
        message_id,
        `/uploads/business_media/${file.filename}`,
        file.mimetype.startsWith('video/') ? 'video' : 'image',
      ]);

      await connection.query(
        `INSERT INTO nearby_message_media (message_id, media_url, media_type) VALUES ?`,
        [mediaValues]
      );
    }

    res.status(201).json({ message_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message and media' });
  } finally {
    if (connection) connection.release();
  }
});


//Fecth business message
// app.js or wherever your Express routes are defined

app.get('/api/businessmessages/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  let connection;
  try {
    connection = await pool.getConnection();

    const [messages] = await connection.query(
      `SELECT * FROM nearby_message WHERE room_id = ? ORDER BY created_at ASC`,
      [roomId]
    );

    if (messages.length === 0) {
      return res.json([]); // <--- CHANGE 1: Send empty array directly
    }

    // Fetch media for all messages in one query
    const messageIds = messages.map(m => m.message_id);
    const [mediaRows] = await connection.query(
      `SELECT * FROM nearby_message_media WHERE message_id IN (?)`,
      [messageIds]
    );

    // Group media by message_id
    const mediaByMessageId = mediaRows.reduce((acc, media) => {
      if (!acc[media.message_id]) acc[media.message_id] = [];
      acc[media.message_id].push({
        media_id: media.media_id,
        media_url: media.media_url,
        media_type: media.media_type,
      });
      return acc;
    }, {});

    // Attach media array to each message
    const messagesWithMedia = messages.map(msg => ({
      ...msg,
      media: mediaByMessageId[msg.message_id] || []
    }));

    res.json(messagesWithMedia); // <--- CHANGE 2: Send the array directly
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    if (connection) connection.release();
  }
});


//Fetch all Chat users for the business
// app.js (or your backend route file)

app.get('/api/businesses/:businessId/conversations', async (req, res) => {
  let connection;
  try {
    const { businessId } = req.params;

    if (!businessId || isNaN(businessId)) {
      return res.status(400).json({ message: 'Invalid business ID.' });
    }

    connection = await pool.getConnection();

    // 1. Fetch distinct room_ids and the associated user_id for messages involving this business.
    // Also get the latest message time and text for preview, and count unread messages.
    const [conversationsData] = await connection.query(
      `SELECT
                nm.room_id,
                nm.product_id,
                CASE
                    WHEN nm.sender_type = 'user' AND nm.business_id = ? THEN nm.sender_id
                    WHEN nm.recipient_type = 'user' AND nm.business_id = ? THEN nm.recipient_id
                END AS user_id_in_chat,
                MAX(nm.created_at) AS last_message_time,
                (SELECT text FROM nearby_message WHERE room_id = nm.room_id ORDER BY created_at DESC LIMIT 1) AS last_message_preview,
                COUNT(CASE WHEN nm.recipient_id = ? AND nm.recipient_type = 'business' AND nm.read_at IS NULL THEN 1 ELSE NULL END) AS unread_count
            FROM nearby_message nm
            WHERE nm.business_id = ? AND (nm.sender_type = 'user' OR nm.recipient_type = 'user')
            GROUP BY nm.room_id, nm.product_id, user_id_in_chat
            HAVING user_id_in_chat IS NOT NULL
            ORDER BY last_message_time DESC`, // Order by latest message
      [businessId, businessId, businessId, businessId]
    );

    if (conversationsData.length === 0) {
      return res.status(200).json({
        allConversations: [],
        dmConversations: [],
        productConversations: []
      });
    }

    const userIds = [...new Set(conversationsData.map(c => c.user_id_in_chat))];

    const [userDetails] = await connection.query(
      `SELECT
                userid as id,
                username,
                firstname,
                lastname,
                profile_picture
            FROM nearby_users
            WHERE userid IN (?)`,
      [userIds]
    );

    const userDetailsMap = new Map(userDetails.map(user => [user.id, {
      ...user,
      name: `${user.firstname} ${user.lastname}`.trim()
    }]));

    const conversations = conversationsData.map(conv => {
      const user = userDetailsMap.get(conv.user_id_in_chat);
      if (!user) {
        console.warn(`User details not found for ID: ${conv.user_id_in_chat}`);
        return null;
      }

      return {
        room_id: conv.room_id,
        product_id: conv.product_id,
        user: user,
        conversation_type: conv.product_id ? 'product' : 'dm',
        last_message_time: conv.last_message_time,
        last_message_preview: conv.last_message_preview,
        unread_count: conv.unread_count // Add unread count here
      };
    }).filter(Boolean);

    const dmConversations = conversations.filter(c => c.conversation_type === 'dm');
    const productConversations = conversations.filter(c => c.conversation_type === 'product');

    res.status(200).json({
      allConversations: conversations,
      dmConversations: dmConversations,
      productConversations: productConversations
    });

  } catch (error) {
    console.error('Error fetching conversations for business:', error);
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});


app.get('/api/productmessages/:roomId', async (req, res) => {
  let connection;
  try {
    const { roomId } = req.params;

    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ message: 'Invalid room ID.' });
    }

    connection = await pool.getConnection();

    // Fetch messages for the given room_id and where product_id is NOT NULL
    // This query assumes your nearby_message table has a product_id column.
    const [messages] = await connection.query(
      `SELECT
                m.message_id,
                m.room_id,
                m.sender_id,
                m.recipient_id,
                m.text,
                m.created_at,
                m.sender_type,
                m.recipient_type,
                m.business_id,
                m.product_id,
                GROUP_CONCAT(DISTINCT JSON_OBJECT('media_url', mm.media_url, 'media_type', mm.media_type) SEPARATOR '|||') AS media_json
            FROM nearby_message m
            LEFT JOIN nearby_message_media mm ON m.message_id = mm.message_id
            WHERE m.room_id = ? AND m.product_id IS NOT NULL
            GROUP BY m.message_id
            ORDER BY m.created_at ASC`,
      [roomId]
    );

    // Process media_json to parse it back into an array of objects
    const formattedMessages = messages.map(msg => {
      const media = msg.media_json ? msg.media_json.split('|||').map(jsonStr => JSON.parse(jsonStr)) : [];
      return {
        ...msg,
        media,
        // Clean up the raw media_json field as it's now parsed
        media_json: undefined
      };
    });

    res.status(200).json(formattedMessages);

  } catch (error) {
    console.error('Error fetching product messages:', error);
    res.status(500).json({ message: 'Error fetching product messages', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});


///////////////////////////////




// Listen to client connections and manage rooms

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_business_room', (businessId) => {
    const roomName = `business_${businessId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room ${roomName}`);
  });

  socket.on('leave_business_room', (businessId) => {
    const roomName = `business_${businessId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


//Business messaging socket here
// Socket.io

app.post('/api/upload/message-media', uploadMessageMedia.single('mediaFile'), (req, res) => {
  // Check if a file was successfully uploaded
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Construct the public URL path for the uploaded file
  // `req.file.path` is the full server-side path (e.g., /project/uploads/message_media/file.jpg)
  // `path.relative(uploadDir, req.file.path)` gets the path relative to `uploadDir`
  // (e.g., message_media/file.jpg)
  const relativePath = path.relative(uploadDir, req.file.path);

  // Convert Windows backslashes to forward slashes for URL consistency
  const publicUrlPath = `/uploads/${relativePath.replace(/\\/g, '/')}`;

  // Send a success response with the public URL path
  res.status(200).json({
    message: 'File uploaded successfully',
    filePath: publicUrlPath, // This is the URL path the frontend will use to display the media
    fileName: req.file.filename, // Original filename (or Multer-generated filename)
  });
});

//socket.io
// Your Backend Socket.IO code (e.g., in app.js or server.js)

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Helper function for consistent room ID generation on the backend
  // This function is correct for *general* chats and should remain as is.
  const getChatRoomId = (id1, type1, id2, type2) => {
    const participantA = { id: id1, type: type1 };
    const participantB = { id: id2, type: type2 };

    let orderedParticipants;
    // Primary sort by type (e.g., 'business' comes before 'user') then by ID
    if (type1 < type2) {
      orderedParticipants = [participantA, participantB];
    } else if (type2 < type1) {
      orderedParticipants = [participantB, participantA];
    } else {
      // If types are the same, sort by ID
      if (id1 < id2) {
        orderedParticipants = [participantA, participantB];
      } else {
        orderedParticipants = [participantB, participantA];
      }
    }
    return `chat_${orderedParticipants[0].type}_${orderedParticipants[0].id}_${orderedParticipants[1].type}_${orderedParticipants[1].id}`;
  };

  // NEW HELPER FUNCTION ON BACKEND: getProductChatRoomId
  // This should mirror the frontend's getProductChatRoomId
  const getProductChatRoomIdBackend = (userId, businessId, productId) => {
    const baseRoomId = getChatRoomId(userId, 'user', businessId, 'business');
    return `${baseRoomId}_product_${productId}`;
  };

  socket.on('join_room', (roomId) => {
    if (typeof roomId === 'string') {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    } else {
      console.warn('Invalid roomId for join_room:', roomId);
    }
  });

  socket.on('leave_room', (roomId) => {
    if (typeof roomId === 'string') {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    }
  });

  socket.on('send_message', async (messagePayload) => {
    let connection;
    try {
      console.log('Backend received messagePayload:', messagePayload);

      const {
        room_id, // This is the room_id from the frontend (e.g., chat_business_7_user_4_product_22)
        sender_id,
        recipient_id,
        text,
        created_at,
        sender_type,
        recipient_type,
        reply_to_message_id = null,
        product_id = null, // This is the product_id from the frontend payload
        business_id = null,
        media = [],
      } = messagePayload;

      const senderIdNum = Number(sender_id);
      const recipientIdNum = Number(recipient_id);

      console.log('Backend parsed numeric IDs:', { senderIdNum, recipientIdNum, business_id, product_id });

      if (isNaN(senderIdNum) || isNaN(recipientIdNum)) {
        console.error('Validation Error: sender_id or recipient_id is not a valid number. Received:', { sender_id, recipient_id });
        return;
      }

      let id1ForRoom, id2ForRoom;

      if (sender_type === 'user') {
        id1ForRoom = senderIdNum;
      } else if (sender_type === 'business') {
        id1ForRoom = business_id;
      } else {
        console.error('Unknown sender_type for room ID generation:', sender_type);
        return;
      }

      if (recipient_type === 'user') {
        id2ForRoom = recipientIdNum;
      } else if (recipient_type === 'business') {
        id2ForRoom = business_id;
      } else {
        console.error('Unknown recipient_type for room ID generation:', recipient_type);
        return;
      }

      // --- CRITICAL CHANGE HERE ---
      let finalRoomIdForDB;
      if (product_id) {
        // Determine user and business IDs for room generation
        const actualUserId = sender_type === 'user' ? senderIdNum : recipientIdNum; // If sender is user, use senderId; otherwise, recipient is user
        const actualBusinessId = sender_type === 'business' ? business_id : recipient_type === 'business' ? business_id : null; // If sender is business, use businessId; otherwise, recipient is business

        if (actualUserId && actualBusinessId) { // Ensure both are valid
          finalRoomIdForDB = getProductChatRoomIdBackend(actualUserId, actualBusinessId, product_id);
        } else {
          console.error("Could not determine user_id or business_id for product room ID generation.");
          return; // Prevent further execution with invalid IDs
        }
      } else {
        // Otherwise, generate a general chat room ID
        finalRoomIdForDB = getChatRoomId(id1ForRoom, sender_type, id2ForRoom, recipient_type);
      }

      // Log for debugging
      console.log(`Frontend sent room_id: ${room_id}`);
      console.log(`Backend generated finalRoomIdForDB: ${finalRoomIdForDB}`);


      // Use finalRoomIdForDB for insertion and emission
      messagePayload.room_id = finalRoomIdForDB;

      connection = await pool.getConnection();

      const [result] = await connection.query(
        `INSERT INTO nearby_message
                (room_id, sender_id, recipient_id, text, created_at, sender_type, recipient_type, reply_to_message_id, product_id, business_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [messagePayload.room_id, senderIdNum, recipientIdNum, text, created_at, sender_type, recipient_type, reply_to_message_id, product_id, business_id]
      );

      const message_id = result.insertId;

      if (media.length > 0) {
        const mediaValues = media.map(m => [message_id, m.media_url, m.media_type]);
        await connection.query(
          `INSERT INTO nearby_message_media (message_id, media_url, media_type) VALUES ?`,
          [mediaValues]
        );
      }

      const fullMessage = {
        ...messagePayload,
        message_id,
        media,
        reactions: [],
      };

      // Emit the message to the correct room (which is now product-specific if product_id exists)
      io.to(messagePayload.room_id).emit('receive_message', fullMessage);
      //  console.log('Message sent to room:', messagePayload.room_id, fullMessage);

      let notificationRecipientType;
      let notificationRecipientId;
      let notificationBusinessId = null; // This will be the ID of the business involved in the chat

      if (recipient_type === 'user') {
        notificationRecipientType = 'user';
        notificationRecipientId = recipientIdNum; // The user ID who is the recipient
        // If the sender was a business, then 'business_id' in payload should be that business's ID
        if (sender_type === 'business') {
          notificationBusinessId = business_id;
        } else {
          // This is user-to-user chat, or user-to-user product chat.
          // If it's a product chat, 'business_id' from payload might refer to the business owning the product.
          notificationBusinessId = business_id; // Still pass if available, or make it senderIdNum if sender_type is business
        }
      } else if (recipient_type === 'business') {
        notificationRecipientType = 'business';
        notificationRecipientId = recipientIdNum; // The business ID who is the recipient
        notificationBusinessId = recipientIdNum; // The recipient is the business
      }

      if (notificationRecipientId && notificationRecipientType) {
        const notificationRoom = `business_notifications:${notificationRecipientId}`; // Room for the recipient's notifications


        io.to(notificationRoom).emit('new_unread_business_message', {
          recipientType: notificationRecipientType,
          recipientId: notificationRecipientId,
          businessId: notificationBusinessId,
          roomId: messagePayload.room_id,
          fromUserId: senderIdNum,
          fromUserType: sender_type,
          productId: product_id ?? null,
          preview: text,
          lastMessageTime: created_at,
        });
      }

      notifyUnreadCount(recipient_id);

    } catch (err) {
      console.error('Failed to save or emit message:', err);
    } finally {
      if (connection) connection.release();
    }
  });

  socket.on('send_reaction', async (reactionPayload) => {
    let connection;
    try {
      const { message_id, user_id, emoji, room_id, created_at } = reactionPayload;

      connection = await pool.getConnection();

      const [existingReaction] = await connection.query(
        `SELECT * FROM nearby_message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
        [message_id, user_id, emoji]
      );

      if (existingReaction.length > 0) {
        console.log(`User ${user_id} already reacted with ${emoji} to message ${message_id}. Skipping.`);
      } else {
        await connection.query(
          `INSERT INTO nearby_message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)`,
          [message_id, user_id, emoji, created_at]
        );
        console.log(`Reaction added: ${emoji} by user ${user_id} to message ${message_id}`);
        io.to(room_id).emit('receive_reaction', reactionPayload);
      }
    } catch (err) {
      console.error('Failed to save or emit reaction:', err);
    } finally {
      if (connection) connection.release();
    }
  });


  socket.on('edit_message', async (editPayload) => {
    let connection;
    try {
      console.log('Backend received editPayload:', editPayload);

      const { message_id, room_id, sender_id, text } = editPayload;

      if (!message_id || !room_id || !sender_id || text === undefined || text === null) {
        console.error('Validation Error: Missing required fields for edit_message. Received:', editPayload);
        socket.emit('message_error', 'Invalid message edit request.');
        return;
      }

      connection = await pool.getConnection();

      // First, verify that the sender_id matches the original sender of the message
      const [existingMessage] = await connection.query(
        `SELECT sender_id FROM nearby_message WHERE message_id = ?`,
        [message_id]
      );

      if (existingMessage.length === 0) {
        console.warn(`Attempted to edit non-existent message: ${message_id}`);
        socket.emit('message_error', 'Message not found for editing.');
        return;
      }

      if (existingMessage[0].sender_id !== Number(sender_id)) {
        console.warn(`Unauthorized edit attempt. User ${sender_id} tried to edit message ${message_id} sent by ${existingMessage[0].sender_id}`);
        socket.emit('message_error', 'You are not authorized to edit this message.');
        return;
      }

      // Update the message text and updated_at timestamp in the database
      const [updateResult] = await connection.query(
        `UPDATE nearby_message SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE message_id = ?`,
        [text.trim(), message_id]
      );

      if (updateResult.affectedRows === 0) {
        console.warn(`No rows affected when updating message ${message_id}. Message might not exist or text was identical.`);
        // Still proceed to fetch and emit, as the frontend expects an update confirmation
      }

      // Fetch the updated message along with its media to emit back
      const [updatedRows] = await connection.query(
        `SELECT nm.*,
                        JSON_ARRAYAGG(
                            JSON_OBJECT('media_url', mm.media_url, 'media_type', mm.media_type)
                        ) AS media
                 FROM nearby_message nm
                 LEFT JOIN message_media mm ON nm.message_id = mm.message_id
                 WHERE nm.message_id = ?
                 GROUP BY nm.message_id`,
        [message_id]
      );

      if (updatedRows.length > 0) {
        const updatedMessage = updatedRows[0];
        // Parse media JSON string back to array if necessary
        if (typeof updatedMessage.media === 'string') {
          updatedMessage.media = JSON.parse(updatedMessage.media);
        }
        // Filter out null media objects if no media was attached (important for messages that might have only text after an edit)
        updatedMessage.media = updatedMessage.media.filter(item => item.media_url !== null);

        // Emit the updated message to the specific room
        io.to(room_id).emit('receive_message', updatedMessage); // Use 'receive_message' to update existing message on frontend
        console.log(`Message updated and emitted to room ${room_id}:`, updatedMessage);
      } else {
        console.error(`Failed to retrieve updated message ${message_id} after update.`);
        socket.emit('message_error', 'Failed to retrieve updated message details.');
      }

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('message_error', 'Failed to edit message.');
    } finally {
      if (connection) connection.release();
    }
  });

  socket.on('mark_message_read', async (payload) => {
    const { room_id, recipient_id } = payload;
    if (!room_id || !recipient_id) {
      console.error('Validation Error: Missing room_id or recipient_id in mark_message_read payload:', payload);
      return;
    }

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.query(
        `UPDATE nearby_message SET read_at = NOW() WHERE room_id = ? AND recipient_id = ? AND read_at IS NULL`,
        [room_id, recipient_id]
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    } finally {
      if (connection) connection.release();
    }
  });


  // Handle disconnection

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// --- Modify the GET /api/businessmessages/:roomId endpoint ---
// This part is crucial to load existing reactions when messages are fetched initially.
// In your backend file (e.g., app.js or server.js)

app.get('/api/businessmessages/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  let connection;
  try {
    connection = await pool.getConnection();

    // Fetch messages
    // Assuming your primary key for 'nearby_message' table is 'id'
    const [messages] = await connection.query(
      `SELECT * FROM nearby_message WHERE room_id = ? ORDER BY created_at ASC`,
      [roomId]
    );

    if (messages.length === 0) {
      return res.json([]); // Send empty array if no messages
    }

    // CORRECTED: Use 'id' from the message object as it's the primary key in 'nearby_message'
    const messageIds = messages.map(m => m.id);

    // Fetch media for all messages
    // Ensure message_id in nearby_message_media refers to the 'id' column of nearby_message
    const [mediaRows] = await connection.query(
      `SELECT * FROM nearby_message_media WHERE message_id IN (?)`,
      [messageIds]
    );

    // Fetch reactions for all messages
    // Ensure message_id in nearby_message_reactions refers to the 'id' column of nearby_message
    const [reactionRows] = await connection.query(
      `SELECT * FROM nearby_message_reactions WHERE message_id IN (?)`,
      [messageIds]
    );

    // Group media by message_id (which is 'id' from nearby_message table)
    const mediaByMessageId = mediaRows.reduce((acc, media) => {
      // CORRECTED: Access media.message_id (which maps to nearby_message.id)
      if (!acc[media.message_id]) acc[media.message_id] = [];
      acc[media.message_id].push({
        media_id: media.id, // Assuming media_id in nearby_message_media is 'id'
        media_url: media.media_url,
        media_type: media.media_type,
      });
      return acc;
    }, {});

    // Group reactions by message_id (which is 'id' from nearby_message table)
    const reactionsByMessageId = reactionRows.reduce((acc, reaction) => {
      // CORRECTED: Access reaction.message_id (which maps to nearby_message.id)
      if (!acc[reaction.message_id]) acc[reaction.message_id] = [];
      acc[reaction.message_id].push({
        id: reaction.id, // Reaction ID (PK of nearby_message_reactions)
        user_id: reaction.user_id,
        emoji: reaction.emoji,
        created_at: reaction.created_at,
      });
      return acc;
    }, {});

    // Attach media and reactions array to each message
    const messagesWithMediaAndReactions = messages.map(msg => ({
      ...msg,
      // CORRECTED: Use msg.id to access grouped media and reactions
      media: mediaByMessageId[msg.id] || [],
      reactions: reactionsByMessageId[msg.id] || [],
    }));

    res.json(messagesWithMediaAndReactions);
  } catch (err) {
    console.error('Error fetching messages with reactions:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/messages/business-conversations", async (req, res) => {
  const currentUserId = req.session.user?.id;
  let connection;

  if (!currentUserId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const query = `
SELECT
  b.business_id AS userid,
  b.name AS business_name,
  b.logo_url AS profile_picture,
  NULL AS username,
  NULL AS firstname,
  NULL AS lastname,
  m.room_id,
  m.last_message_time,
  COALESCE(u.unread_count, 0) AS unread_count
FROM (
  SELECT
    room_id,
    MAX(created_at) AS last_message_time
  FROM nearby_message
  WHERE (
    (sender_id = ? AND sender_type = 'user' AND recipient_type = 'business')
    OR
    (recipient_id = ? AND recipient_type = 'user' AND sender_type = 'business')
  )
  AND product_id IS NULL
  GROUP BY room_id
) m
JOIN nearby_message m2
  ON m.room_id = m2.room_id AND m.last_message_time = m2.created_at

-- ✅ Join using business_id directly
JOIN nearby_businesses b
  ON m2.business_id = b.business_id

-- 🔁 Count unread messages for user in each room
LEFT JOIN (
  SELECT room_id, COUNT(*) AS unread_count
  FROM nearby_message
  WHERE recipient_id = ? AND read_at IS NULL AND recipient_type = 'user'
  GROUP BY room_id
) u ON u.room_id = m.room_id

ORDER BY m.last_message_time DESC;


  `;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(query, [
      currentUserId, // for unread counts
      currentUserId, // user is sender
      currentUserId  // user is recipient
    ]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching business conversations:", err);
    res.status(500).json({ error: "Failed to fetch business conversations" });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/messages/product-conversations", async (req, res) => {
  const currentUserId = req.session.user?.id;
  let connection;

  if (!currentUserId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const query = `
SELECT
  b.business_id AS userid,
  b.name AS business_name,
  b.logo_url AS profile_picture,
  NULL AS username,
  NULL AS firstname,
  NULL AS lastname,
  p.product_id AS product_id,
  p.name AS product_title,
  pi.image_url AS product_image,
  m2.room_id,
  m2.created_at AS last_message_time,
  COALESCE(u.unread_count, 0) AS unread_count
FROM (
  SELECT
    room_id,
    business_id,
    product_id,
    MAX(created_at) AS last_message_time
  FROM nearby_message
  WHERE (
    (sender_id = ? AND sender_type = 'user' AND recipient_type = 'business')
    OR
    (recipient_id = ? AND recipient_type = 'user' AND sender_type = 'business')
  )
  AND product_id IS NOT NULL
  GROUP BY room_id, business_id, product_id
) m
JOIN nearby_message m2
  ON m.room_id = m2.room_id 
  AND m.business_id = m2.business_id
  AND m.product_id = m2.product_id
  AND m.last_message_time = m2.created_at

JOIN nearby_businesses b
  ON m2.business_id = b.business_id

JOIN nearby_products p
  ON m2.product_id = p.product_id

LEFT JOIN (
  SELECT product_id, MIN(image_url) AS image_url
  FROM nearby_product_images
  GROUP BY product_id
) pi ON pi.product_id = p.product_id

LEFT JOIN (
  SELECT room_id, business_id, product_id, COUNT(*) AS unread_count
  FROM nearby_message
  WHERE recipient_id = ? AND read_at IS NULL AND recipient_type = 'user'
  GROUP BY room_id, business_id, product_id
) u 
ON u.room_id = m.room_id 
AND u.business_id = m.business_id 
AND u.product_id = m.product_id


ORDER BY m2.created_at DESC;
  `;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(query, [
      currentUserId, // 1. sender
      currentUserId, // 2. recipient
      currentUserId  // 3. unread
    ]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching product conversations:", err);
    res.status(500).json({ error: "Failed to fetch product conversations" });
  } finally {
    if (connection) connection.release();
  }
});



//Fetch all message unread_count

app.get('/api/messages/unread-count', async (req, res) => {
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const query = `
      SELECT COUNT(*) AS unread_count
      FROM nearby_message
      WHERE recipient_id = ?
        AND recipient_type = 'user'
        AND read_at IS NULL
    `;

    const [results] = await connection.query(query, [userId]);
    const count = results[0]?.unread_count || 0;

    res.json({ unread_count: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  } finally {
    if (connection) connection.release();
  }
});





io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId.toString());
    // console.log(`✅ Socket joined group room: ${groupId}`);
  });

  socket.on('joinGroupDetails', (groupId) => {
    socket.join(groupId.toString());
    console.log(`✅ Socket joined group room: ${groupId}`);
  });
  // Join the post's room so that the client can receive comments in real-time
  socket.on('joinPostRoom', (postId) => {
    socket.join(postId); // Join a room for the specific post
    // console.log(`Socket joined room: ${postId}`);
  });



  socket.on('disconnect', () => {
    //  console.log('user disconnected');
  });
});

