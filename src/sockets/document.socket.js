const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Document = require("../models/Document");
const { applyDeltaToDoc } = require("./utils/delta.utils"); 

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
        return socket.emit("error", { message: "documentId required" });
      }

      try {
        // Load doc metadata to check authorization
        const doc = await Document.findById(documentId).lean();
        if (!doc)
          return socket.emit("error", { message: "Document not found" });

        // Authorization: owner or collaborator (simple)
        const ownerId = doc.owner.toString();
        const isCollaborator =
          Array.isArray(doc.collaborators) &&
          doc.collaborators.some((c) => c.toString() === user.id);
        if (ownerId !== user.id && !isCollaborator) {
          return socket.emit("error", {
            message: "Not authorized for this document",
          });
        }

        // Join room
        socket.join(documentId);

        // Track presence: add socket id to roomUsers
        if (!roomUsers.has(documentId)) roomUsers.set(documentId, new Set());
        roomUsers.get(documentId).add(socket.id);

        // Load content (prefer in-memory if present)
        let content;
        if (docContents.has(documentId)) {
          content = docContents.get(documentId);
        } else {
          content = (await loadDocumentContentFromDB(documentId)) || {
            ops: [],
          };
          docContents.set(documentId, content);
        }

        // Send initial snapshot to the joining client
        socket.emit("load-document", { documentId, content });

        // Broadcast to others that a user joined (presence)
        socket.to(documentId).emit("user-joined", {
          userId: user.id,
          socketId: socket.id,
          email: user.email,
        });
      } catch (err) {
        console.error("join-document error:", err);
        socket.emit("error", { message: "Failed to join document" });
      }
    });

    /* -------- Receive and broadcast deltas -------- */

    socket.on("send-changes", ({ documentId, delta }) => {
      if (!documentId || !delta) return;

      // Relay the delta to other clients in room
      socket.to(documentId).emit("receive-changes", { delta });

      // Update in-memory snapshot.
      // NOTE: naive merge strategy: apply delta to current content using helper if available.
      try {
        const current = docContents.get(documentId) || { ops: [] };

        // If you have a helper to apply delta (recommended), use it:
        if (typeof applyDeltaToDoc === "function") {
          const updated = applyDeltaToDoc(current, delta);
          docContents.set(documentId, updated);
        } else {
          // Fallback naive approach: append ops (may be fragile on deletes)
          if (!Array.isArray(current.ops)) current.ops = [];
          if (delta && Array.isArray(delta.ops)) {
            current.ops = current.ops.concat(delta.ops);
          }
          docContents.set(documentId, current);
        }

        // Schedule debounced save
        scheduleSave(documentId);
      } catch (err) {
        console.error("Error updating in-memory content:", err);
      }
    });

    /* -------- Cursor updates / presence -------- */
    socket.on("cursor-update", ({ documentId, cursor }) => {
      if (!documentId || !cursor) return;
      // Broadcast cursor updates to others
      socket.to(documentId).emit("update-cursor", {
        userId: user.id,
        socketId: socket.id,
        cursor,
      });
    });

    /* -------- Manual save (optional) -------- */
    socket.on("save-document", async ({ documentId }) => {
      if (!documentId) return;
      try {
        const content = docContents.get(documentId);
        if (!content)
          return socket.emit("error", { message: "No content to save" });

        await Document.findByIdAndUpdate(documentId, {
          content,
          updatedAt: new Date(),
        });

        socket.emit("document-saved", { documentId, savedAt: new Date() });
      } catch (err) {
        console.error("Manual save failed:", err);
        socket.emit("error", { message: "Save failed" });
      }
    });

    /* -------- Disconnect cleanup -------- */
    socket.on("disconnect", () => {
      // For each room this socket was in, remove from presence and notify others
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((roomId) => {
        // remove socket from roomUsers
        const set = roomUsers.get(roomId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            // last socket left: optionally persist snapshot now and free memory
            if (docContents.has(roomId)) {
              const content = docContents.get(roomId);
              // persist immediately (fire-and-forget)
              Document.findByIdAndUpdate(roomId, {
                content,
                updatedAt: new Date(),
              }).catch((err) => {
                console.error("Error saving on room empty:", err);
              });
              docContents.delete(roomId);
            }
            roomUsers.delete(roomId);
          } else {
            roomUsers.set(roomId, set);
          }
        }

        // notify remaining clients in room
        socket.to(roomId).emit("user-left", {
          userId: user.id,
          socketId: socket.id,
        });
      });
    });
  });
  console.log("Socket.io initialized");
}

module.exports = { setupDocumentSockets };
