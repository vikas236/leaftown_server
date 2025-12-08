import express from "express";
import cors from "cors";
import { authenticate } from "./middleware/auth";
import * as listingCtrl from "./controllers/listingController";
import * as crmCtrl from "./controllers/crmController";
import * as authCtrl from "./controllers/authController";
import * as supportCtrl from "./controllers/supportController";

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// --- AUTH ROUTES ---
app.post("/api/auth/send-otp", authCtrl.sendOtp); // Step 1
app.post("/api/auth/verify-otp", authCtrl.verifyOtp); // Step 2
app.put("/api/auth/profile", authenticate, authCtrl.updateProfile);

// --- INVENTORY ROUTES ---
app.get("/api/listings", listingCtrl.getListings); // Public
app.post("/api/listings", authenticate, listingCtrl.createListing); // Protected (Agents only)
app.put("/api/listings/:id", authenticate, listingCtrl.updateListing); // Protected
app.delete("/api/listings/:id", authenticate, listingCtrl.deleteListing); // Protected

// --- CRM & SCHEDULING ---
app.post("/api/inquiries", crmCtrl.createInquiry); // Public (Buyers sending msg)
app.put("/api/inquiries/:id", authenticate, crmCtrl.markInquiryProcessed);

app.get("/api/showings", authenticate, crmCtrl.getMyShowings);
app.post("/api/showings", authenticate, crmCtrl.scheduleShowing);

// --- TRANSACTIONS ---
app.post("/api/transactions", authenticate, crmCtrl.recordTransaction);

// --- SUPPORT ROUTES ---
app.post("/api/support", authenticate, supportCtrl.createTicket);
app.get("/api/support", authenticate, supportCtrl.getMyTickets);

// Health Check
app.get("/", (req, res) => {
  res.send("LeafTown Full-Stack API is Ready");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
