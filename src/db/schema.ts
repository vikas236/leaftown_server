import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  serial,
  primaryKey,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUMS ---
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "agent",
  "buyer",
  "seller",
  "developer",
]);

export const propTypeEnum = pgEnum("property_type", [
  "apartment",
  "house",
  "commercial",
  "land",
  "office",
  "plot",
  "venture",
  "township",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "active",
  "pending",
  "sold",
  "rented",
  "cancelled",
]);

export const listingTypeEnum = pgEnum("listing_type", [
  "sale",
  "rent",
  "lease",
]);

export const viewStatusEnum = pgEnum("view_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

export const areaUnitEnum = pgEnum("area_unit", ["sqft", "sqyd", "acres"]);

export const furnishingEnum = pgEnum("furnishing_status", [
  "unfurnished",
  "semi-furnished",
  "fully-furnished",
]);

export const facingEnum = pgEnum("facing", [
  "north",
  "east",
  "west",
  "south",
  "north-east",
  "south-east",
  "north-west",
  "south-west",
]);

export const possessionEnum = pgEnum("possession_status", [
  "ready_to_move",
  "under_construction",
  "resale",
]);

// --- USERS ---
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  displayId: serial("display_id"),

  phoneNumber: varchar("phone_number", { length: 20 }),

  email: varchar("email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),

  role: userRoleEnum("role").default("buyer").notNull(),

  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),

  profileImageUrl: text("profile_image_url"),

  verificationStatus: verificationStatusEnum("verification_status")
    .default("unverified")
    .notNull(),

  identityProofUrl: text("identity_proof_url"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- AGENT PROFILES ---
export const agentProfiles = pgTable("agent_profiles", {
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .primaryKey(),

  licenseNumber: varchar("license_number", { length: 100 }),
  bio: text("bio"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  specializationAreas: text("specialization_areas").array(),
});

// --- PROPERTIES ---
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayId: serial("display_id"),

  ownerId: uuid("owner_id").references(() => users.id),

  addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line_2", { length: 255 }),

  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),

  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),

  propType: propTypeEnum("prop_type").notNull(),

  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 5, scale: 1 }),
  furnishingStatus: furnishingEnum("furnishing_status"),
  facing: facingEnum("facing"),

  floorNumber: integer("floor_number"),
  totalFloors: integer("total_floors"),
  parkingSpaces: integer("parking_spaces").default(0),

  possessionStatus:
    possessionEnum("possession_status").default("ready_to_move"),

  areaValue: integer("area_value"),
  areaUnit: areaUnitEnum("area_unit").default("sqft"),

  projectName: varchar("project_name", { length: 255 }),
  reraId: varchar("rera_id", { length: 100 }),
  approvalAuthority: varchar("approval_authority", { length: 100 }),
  totalUnits: integer("total_units"),
  projectType: varchar("project_type", { length: 50 }),

  yearBuilt: integer("year_built"),
  loanAvailable: boolean("loan_available").default(false),

  amenities: jsonb("amenities").default({}),

  createdAt: timestamp("created_at").defaultNow(),
});

// --- LISTINGS ---
export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),

  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),

  agentId: uuid("agent_id").references(() => users.id),

  listType: listingTypeEnum("list_type").notNull(),
  status: listingStatusEnum("status").default("draft"),

  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),

  listedDate: timestamp("listed_date").defaultNow(),
  closingDate: timestamp("closing_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- PROPERTY MEDIA ---
export const propertyMedia = pgTable("property_media", {
  id: uuid("id").defaultRandom().primaryKey(),

  listingId: uuid("listing_id").references(() => listings.id, {
    onDelete: "cascade",
  }),

  url: text("url").notNull(),
  mediaType: varchar("media_type", { length: 20 }).default("image"),
  displayOrder: integer("display_order").default(0),

  createdAt: timestamp("created_at").defaultNow(),
});

// --- CRM & SUPPORT ---
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayId: serial("display_id"),

  userId: uuid("user_id").references(() => users.id),

  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("open"),

  createdAt: timestamp("created_at").defaultNow(),
});

// --- SAVED LISTINGS ---
export const savedListings = pgTable(
  "saved_listings",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    listingId: uuid("listing_id")
      .references(() => listings.id, { onDelete: "cascade" })
      .notNull(),

    savedAt: timestamp("saved_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.listingId] }),
  })
);

// --- INQUIRIES ---
export const inquiries = pgTable("inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),

  listingId: uuid("listing_id").references(() => listings.id),
  userId: uuid("user_id").references(() => users.id),

  guestName: varchar("guest_name", { length: 100 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 20 }),

  message: text("message"),
  isProcessed: boolean("is_processed").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

// --- SHOWINGS ---
export const showings = pgTable("showings", {
  id: uuid("id").defaultRandom().primaryKey(),

  listingId: uuid("listing_id")
    .references(() => listings.id)
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => users.id)
    .notNull(),
  buyerId: uuid("buyer_id").references(() => users.id),

  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),

  status: viewStatusEnum("status").default("scheduled"),

  feedback: text("feedback"),
  agentNotes: text("agent_notes"),
});

// --- TRANSACTIONS ---
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),

  listingId: uuid("listing_id").references(() => listings.id),
  agentId: uuid("agent_id").references(() => users.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  sellerId: uuid("seller_id").references(() => users.id),

  finalSalePrice: decimal("final_sale_price", {
    precision: 12,
    scale: 2,
  }).notNull(),

  commissionAmount: decimal("commission_amount", {
    precision: 10,
    scale: 2,
  }),

  transactionDate: date("transaction_date").defaultNow(),

  contractPdfUrl: text("contract_pdf_url"),
});

// --- RELATIONS ---
export const usersRelations = relations(users, ({ one, many }) => ({
  agentProfile: one(agentProfiles, {
    fields: [users.id],
    references: [agentProfiles.userId],
  }),

  properties: many(properties),
  listings: many(listings, { relationName: "agentListings" }),

  inquiries: many(inquiries),
  showingsAsAgent: many(showings, { relationName: "agentShowings" }),

  savedListings: many(savedListings),
  tickets: many(supportTickets),
}));

export const agentProfilesRelations = relations(agentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [agentProfiles.userId],
    references: [users.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  property: one(properties, {
    fields: [listings.propertyId],
    references: [properties.id],
  }),

  agent: one(users, {
    fields: [listings.agentId],
    references: [users.id],
    relationName: "agentListings",
  }),

  media: many(propertyMedia),
  inquiries: many(inquiries),
  showings: many(showings),
}));

export const propertyMediaRelations = relations(propertyMedia, ({ one }) => ({
  listing: one(listings, {
    fields: [propertyMedia.listingId],
    references: [listings.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
}));

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  user: one(users, {
    fields: [savedListings.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [savedListings.listingId],
    references: [listings.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  listing: one(listings, {
    fields: [inquiries.listingId],
    references: [listings.id],
  }),
  user: one(users, {
    fields: [inquiries.userId],
    references: [users.id],
  }),
}));

export const showingsRelations = relations(showings, ({ one }) => ({
  listing: one(listings, {
    fields: [showings.listingId],
    references: [listings.id],
  }),

  agent: one(users, {
    fields: [showings.agentId],
    references: [users.id],
    relationName: "agentShowings",
  }),

  buyer: one(users, {
    fields: [showings.buyerId],
    references: [users.id],
  }),
}));
