const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Document = require("../models/Document");

const docContents = new Map();
const roomUsers = new Map();
const saveTimers = new Map();

const AUTOSAVE_DELAY = 2000;

async function loadDocumentContentFromDB(documentId) {
  const doc = await Document.findById(documentId);
  if (!doc) {
    return null;
  }
  return doc.content || { ops: [] };
}

function scheduleSave(documentId) {
  if (saveTimers.has(documentId)) {
    clearTimeout(saveTimers.get(documentId));
  }
  const timer = setTimeout(async () => {
    try {
      const content = docContents.get(documentId);
      if (!content) return;
      await Document.findByIdAndUpdate(documentId, {
        content,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`Error saving document ${documentId}:`, error);
    } finally {
      saveTimers.delete(documentId);
    }
  }, AUTOSAVE_DELAY);
  saveTimers.set(documentId, timer);
}

function verifySocketToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function setupDocumentSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const decoded = verifySocketToken(token);
    if (!decoded) {
      return next(new Error("Authentication error"));
    }
    socket.user = { id: decoded.id, email: decoded.email };
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.user;
 
    /* Join Document Room */

    socket.on("join-document", async ({ documentId }) => {
      if (!documentId) {
        return socket.emit("error", {
          message: "Document ID is required to join.",
        });
      }

      try {
        const doc = await Document.findById(documentId).lean();
        if (!doc) {
          return socket.emit("error", { message: "Document not found." });
        }
        const ownerId = doc.owner.toString();
        const isCollaborator =
          Array.isArray(doc.collaborators) &&
          doc.collaborators.map((id) => id.toString()).includes(user.id);
        if (ownerId !== user.id && !isCollaborator) {
          return socket.emit("error", {
            message: "Access denied to this document.",
          });
        }
        socket.join(documentId);

        if (!roomUsers.has(documentId)) roomUsers.set(documentId, new Set());
        roomUsers.get(documentId).add(user.id);

        let content;
        if (docContents.has(documentId)) {
          content = docContents.get(documentId);
        } else {
          content = (await loadDocumentContentFromDB(documentId)) || {
            ops: [],
          };
          docContents.set(documentId, content);
        }
        socket.emit("load-document", { documentId, content });
        socket
          .to(documentId)
          .emit("user-joined", {
            userId: user.id,
            socketId: socket.id,
            email: user.email,
          });
      } catch (error) {
        console.error("Error in joinDocument:", error);
        socket.emit("error", {
          message: "An error occurred while joining the document.",
        });
      }
    });

    /* -------- Receive and broadcast deltas -------- */

    


  });
}


module.exports = { setupDocumentSockets };