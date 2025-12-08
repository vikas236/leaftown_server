import { Request, Response } from 'express';
import { db } from '../config/db';
import { supportTickets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const createTicket = async (req: Request, res: Response) => {
  const { subject, message } = req.body;
  const userId = (req as any).user?.id; // From auth middleware

  try {
    await db.insert(supportTickets).values({
      userId,
      subject,
      message,
      status: 'open'
    });
    res.status(201).json({ message: "Ticket created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create ticket" });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const tickets = await db.query.supportTickets.findMany({
      where: eq(supportTickets.userId, userId),
      orderBy: [desc(supportTickets.createdAt)]
    });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};