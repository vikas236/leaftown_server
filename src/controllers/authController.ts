import { Request, Response } from 'express';
import { db } from '../config/db';
import { users, agentProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// --- CONFIGURATION ---
const SECRET = process.env.JWT_SECRET || 'secret_key_change_me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Parse allowed admin numbers from .env (comma-separated)
// Example .env: ADMIN_PHONE_NUMBERS=9876543210,9988776655
const ALLOWED_ADMINS = (process.env.ADMIN_PHONE_NUMBERS || "")
  .split(',')
  .map(num => num.trim());

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

// STEP 3: Admin Login (Password + Whitelist Check)
export const adminLogin = async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  try {
    // 1. Security Check: Is the phone number whitelisted?
    if (!ALLOWED_ADMINS.includes(phone)) {
      // Return generic error or specific one depending on security preference
      return res.status(403).json({ error: "Access Denied: This number is not authorized." });
    }

    // 2. Security Check: Password
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid Access Key" });
    }

    // 3. Find the user in DB
    const existingUser = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phone),
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User record not found. Please register as a regular user first." });
    }

    // 4. Auto-Promote to Admin (if not already)
    // This ensures that even if they registered as 'agent', logging in here grants admin rights.
    if (existingUser.role !== 'admin') {
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, existingUser.id));

      existingUser.role = 'admin'; // Update local object for token
    }

    // 5. Generate Admin Token
    const token = jwt.sign(
      { id: existingUser.id, role: 'admin' },
      SECRET,
      { expiresIn: "12h" } // Admin sessions expire faster for security
    );

    res.json({
      message: "Admin access granted",
      token,
      user: { id: existingUser.id, role: 'admin', name: existingUser.firstName }
    });

  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ error: "Server error during admin login" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// STEP 4: Update Profile
export const updateProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { firstName, lastName, email, profileImageUrl, identityProofUrl } = req.body;

  try {
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (profileImageUrl) updateData.profileImageUrl = profileImageUrl;

    // If they upload an ID, mark verification as pending
    // Note: The frontend sends a comma-separated string for identityProofUrl now
    if (identityProofUrl) {
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
