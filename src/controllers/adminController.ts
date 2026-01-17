import { Response } from "express";
import { db } from "../config/db";
import { users, supportTickets } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { AuthRequest } from "../middleware/auth"; // Ensure this path is correct

// --- VERIFICATIONS ---

// GET: Fetch all users waiting for verification
// Used by the "Agent Approvals" tab in the dashboard
export const getPendingVerifications = async (_req: AuthRequest, res: Response) => {
  try {
    const pendingUsers = await db.query.users.findMany({
      where: eq(users.verificationStatus, 'pending'),
      orderBy: [desc(users.createdAt)],
      // We return all fields so the UI can show email, phone, and profileImage
    });
    res.json(pendingUsers);
  } catch (error) {
    console.error("Error fetching verifications:", error);
    res.status(500).json({ error: "Failed to fetch verifications" });
  }
};

// PUT: Approve or Reject a user
// Used when clicking "Approve" or "Reject" buttons
export const verifyUser = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body; // Expects 'verified' or 'rejected'

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    await db.update(users)
      .set({ verificationStatus: status })
      .where(eq(users.id, userId));

    // Optional: Log which admin performed the action
    console.log(`[Admin Log] User ${userId} was marked as ${status} by Admin ${req.user?.id}`);

    res.json({ message: `User marked as ${status}` });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Update failed" });
  }
};

// --- SUPPORT TICKETS ---

// GET: Fetch all tickets with User details
// Used by the "Support Inbox" tab
export default async (_req: AuthRequest, res: Response) => {
  try {
    const tickets = await db.query.supportTickets.findMany({
      with: {
        // Critical: We need the user data to show who submitted the ticket
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        }
      },
      orderBy: [desc(supportTickets.createdAt)],
    });
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

// PUT: Update ticket status
// Used when clicking "Mark Resolved"
export const updateTicketStatus = async (req: AuthRequest, res: Response) => {
  const { ticketId } = req.params;
  const { status } = req.body; // Expects 'closed' or 'open'

  try {
    await db.update(supportTickets)
      .set({ status })
      .where(eq(supportTickets.id, ticketId));

    res.json({ message: "Ticket updated" });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ error: "Update failed" });
  }
};
