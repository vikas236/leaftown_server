import { Request, Response } from 'express';
import { db } from '../config/db';
import { users, agentProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

// STEP 1: Request OTP
export const sendOtp = async (req: Request, res: Response) => {
  const { phone } = req.body;
  
  if (!phone) return res.status(400).json({ error: "Phone number is required" });

  // In a real app, we would generate a random 4-digit code, save it to DB/Redis, 
  // and call Twilio/Fast2SMS here.
  
  console.log(`📱 OTP for ${phone} is 0000`); // Log for dev purposes
  
  res.json({ message: "OTP sent successfully", success: true });
};

// STEP 2: Verify OTP & Login/Register
export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp, name } = req.body; // 'name' is optional, used if new user

  // 1. Check Hardcoded OTP
  if (otp !== '0000') {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  try {
    // 2. Check if user exists
    let user = await db.query.users.findFirst({ where: eq(users.phoneNumber, phone) });

    // 3. If user doesn't exist, Register them automatically
    if (!user) {
      const [newUser] = await db.insert(users).values({
        phoneNumber: phone,
        firstName: name || 'Agent', // Default name if not provided
        role: 'agent', // Defaulting to Agent for this app
        isActive: true
      }).returning();
      
      // Create empty agent profile
      await db.insert(agentProfiles).values({ userId: newUser.id });
      
      user = newUser;
    }

    // 4. Generate Token
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });

    res.json({ 
        token, 
        user: { id: user.id, role: user.role, name: user.firstName } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { firstName, lastName, email, profileImageUrl, identityProofUrl } = req.body;
    
    try {
        const updateData: any = {};
        if(firstName) updateData.firstName = firstName;
        if(lastName) updateData.lastName = lastName;
        if(email) updateData.email = email;
        if(profileImageUrl) updateData.profileImageUrl = profileImageUrl;
        
        // If they upload an ID, mark verification as pending
        if(identityProofUrl) {
            updateData.identityProofUrl = identityProofUrl;
            updateData.verificationStatus = 'pending'; 
        }

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, userId));
            
        res.json({ message: "Profile updated successfully" });
    } catch (e) {
        res.status(500).json({ error: "Update failed" });
    }
}