import { Request, Response } from 'express';
import { db } from '../config/db';
import { inquiries, showings, transactions, listings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

// --- INQUIRIES ---
export const createInquiry = async (req: Request, res: Response) => {
  const { listingId, name, email, phone, message } = req.body;
  await db.insert(inquiries).values({ listingId, guestName: name, guestEmail: email, guestPhone: phone, message });
  res.status(201).json({ message: 'Sent!' });
};

export const markInquiryProcessed = async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.update(inquiries).set({ isProcessed: true }).where(eq(inquiries.id, id));
    res.json({ message: 'Marked as read' });
};

// --- SHOWINGS ---
export const scheduleShowing = async (req: Request, res: Response) => {
    const { listingId, agentId, buyerId, startTime, endTime } = req.body;
    try {
        await db.insert(showings).values({
            listingId, agentId, buyerId, startTime: new Date(startTime), endTime: new Date(endTime), status: 'scheduled'
        });
        res.status(201).json({ message: 'Showing scheduled' });
    } catch (e) { res.status(500).json({ error: 'Scheduling failed' }); }
};

export const getMyShowings = async (req: any, res: Response) => {
    const userId = req.user.id; // From Auth Middleware
    const schedule = await db.query.showings.findMany({
        where: eq(showings.agentId, userId),
        with: { listing: { with: { property: true }}, buyer: true }
    });
    res.json(schedule);
};

// --- TRANSACTIONS ---
export const recordTransaction = async (req: Request, res: Response) => {
    const { listingId, agentId, buyerId, sellerId, price, commission } = req.body;
    
    await db.transaction(async (tx) => {
        // 1. Create Transaction Record
        await tx.insert(transactions).values({
            listingId, agentId, buyerId, sellerId, finalSalePrice: price, commissionAmount: commission
        });
        // 2. Mark Listing as SOLD
        await tx.update(listings).set({ status: 'sold', closingDate: new Date() }).where(eq(listings.id, listingId));
    });
    
    res.status(201).json({ message: 'Sale recorded & Listing closed' });
};