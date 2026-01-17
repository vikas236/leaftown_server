import express, { Response, NextFunction } from "express";
import cors from "cors";
import { authenticate, AuthRequest } from "./middleware/auth";
import * as listingCtrl from "./controllers/listingController";
import * as crmCtrl from "./controllers/crmController";
import * as authCtrl from "./controllers/authController";
import * as supportCtrl from "./controllers/supportController";
import * as adminCtrl from "./controllers/adminController"; // Ensure this file exists!
import uploadRoutes from "./routes/uploadRoutes";
import path from "path";

// --- DEBUG CHECK ---
// If this logs "undefined" or empty {}, check your adminController.ts file!
console.log("Admin Controller Loaded:", adminCtrl);

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE: Admin Check ---
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

// --- AUTH ROUTES ---
app.post("/api/auth/send-otp", authCtrl.sendOtp);
app.post("/api/auth/verify-otp", authCtrl.verifyOtp);
app.post("/api/auth/admin-login", authCtrl.adminLogin);
app.put("/api/auth/profile", authenticate as any, authCtrl.updateProfile);
app.get("/api/auth/profile", authenticate as any, authCtrl.getProfile);

// --- ADMIN DASHBOARD ROUTES ---
// We check if the controller methods exist before assigning them to prevent crashes
if (adminCtrl.getPendingVerifications) {
  app.get("/api/admin/verifications", authenticate as any, requireAdmin as any, adminCtrl.getPendingVerifications);
  app.put("/api/admin/verify/:userId", authenticate as any, requireAdmin as any, adminCtrl.verifyUser);
  app.get("/api/admin/tickets", authenticate as any, requireAdmin as any, adminCtrl.default);
  app.put("/api/admin/tickets/:ticketId", authenticate as any, requireAdmin as any, adminCtrl.updateTicketStatus);
} else {
  console.error("CRITICAL ERROR: Admin Controller functions are missing. Check src/controllers/adminController.ts");
}

// --- INVENTORY ROUTES ---
app.get("/api/listings", listingCtrl.getListings);
app.post("/api/listings", authenticate as any, listingCtrl.createListing);
app.put("/api/listings/:id", authenticate as any, listingCtrl.updateListing);
app.delete("/api/listings/:id", authenticate as any, listingCtrl.deleteListing);

// 1. Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. Upload Route
app.use('/api/upload', uploadRoutes);

// --- CRM & SCHEDULING ---
app.post("/api/inquiries", crmCtrl.createInquiry);
app.put("/api/inquiries/:id", authenticate as any, crmCtrl.markInquiryProcessed);

app.get("/api/showings", authenticate as any, crmCtrl.getMyShowings);
app.post("/api/showings", authenticate as any, crmCtrl.scheduleShowing);

// --- TRANSACTIONS ---
app.post("/api/transactions", authenticate as any, crmCtrl.recordTransaction);

// --- SUPPORT ROUTES ---
app.post("/api/support", authenticate as any, supportCtrl.createTicket);
app.get("/api/support", authenticate as any, supportCtrl.getMyTickets);

// Health Check
app.get("/", (_req, res) => {
  res.send("LeafTown Full-Stack API is Ready");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
