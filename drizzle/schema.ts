import { pgTable, foreignKey, uuid, numeric, text, timestamp, date, varchar, integer, unique, boolean, serial, jsonb, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const areaUnit = pgEnum("area_unit", ['sqft', 'sqyd', 'acres'])
export const facing = pgEnum("facing", ['north', 'east', 'west', 'south', 'north-east', 'south-east', 'north-west', 'south-west'])
export const furnishingStatus = pgEnum("furnishing_status", ['unfurnished', 'semi-furnished', 'fully-furnished'])
export const listingStatus = pgEnum("listing_status", ['draft', 'active', 'pending', 'sold', 'rented', 'cancelled'])
export const listingType = pgEnum("listing_type", ['sale', 'rent', 'lease'])
export const possessionStatus = pgEnum("possession_status", ['ready_to_move', 'under_construction', 'resale'])
export const propertyType = pgEnum("property_type", ['apartment', 'house', 'commercial', 'land', 'office', 'plot', 'venture', 'township'])
export const userRole = pgEnum("user_role", ['admin', 'agent', 'buyer', 'seller', 'developer'])
export const verificationStatus = pgEnum("verification_status", ['unverified', 'pending', 'verified', 'rejected'])
export const viewStatus = pgEnum("view_status", ['scheduled', 'completed', 'cancelled', 'no_show'])


export const listings = pgTable("listings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  propertyId: uuid("property_id").notNull(),
  agentId: uuid("agent_id"),
  status: listingStatus().default('draft'),
  price: numeric({ precision: 12, scale: 2 }).notNull(),
  description: text(),
  listedDate: timestamp("listed_date", { mode: 'string' }).defaultNow(),
  listType: listingType("list_type").notNull(),
  closingDate: timestamp("closing_date", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.agentId],
    foreignColumns: [users.id],
    name: "listings_agent_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.propertyId],
    foreignColumns: [properties.id],
    name: "listings_property_id_properties_id_fk"
  }).onDelete("cascade"),
]);

export const transactions = pgTable("transactions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  listingId: uuid("listing_id"),
  agentId: uuid("agent_id"),
  buyerId: uuid("buyer_id"),
  sellerId: uuid("seller_id"),
  finalSalePrice: numeric("final_sale_price", { precision: 12, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }),
  transactionDate: date("transaction_date").defaultNow(),
  contractPdfUrl: text("contract_pdf_url"),
}, (table) => [
  foreignKey({
    columns: [table.listingId],
    foreignColumns: [listings.id],
    name: "transactions_listing_id_listings_id_fk"
  }),
  foreignKey({
    columns: [table.agentId],
    foreignColumns: [users.id],
    name: "transactions_agent_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.buyerId],
    foreignColumns: [users.id],
    name: "transactions_buyer_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.sellerId],
    foreignColumns: [users.id],
    name: "transactions_seller_id_users_id_fk"
  }),
]);

export const propertyMedia = pgTable("property_media", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  listingId: uuid("listing_id"),
  url: text().notNull(),
  mediaType: varchar("media_type", { length: 20 }).default('image'),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.listingId],
    foreignColumns: [listings.id],
    name: "property_media_listing_id_listings_id_fk"
  }).onDelete("cascade"),
]);

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  email: varchar({ length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: userRole().default('agent').notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  profileImageUrl: text("profile_image_url"),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
  displayId: serial("display_id").notNull(),
  verificationStatus: verificationStatus("verification_status").default('unverified'),
  identityProofUrl: text("identity_proof_url"),
}, (table) => [
  unique("users_phone_number_unique").on(table.phoneNumber),
]);

export const supportTickets = pgTable("support_tickets", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  displayId: serial("display_id").notNull(),
  userId: uuid("user_id"),
  subject: varchar({ length: 200 }),
  message: text().notNull(),
  status: varchar({ length: 20 }).default('open'),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "support_tickets_user_id_users_id_fk"
  }),
]);

export const properties = pgTable("properties", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  ownerId: uuid("owner_id"),
  addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  state: varchar({ length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),
  propType: propertyType("prop_type").notNull(),
  bedrooms: integer(),
  bathrooms: numeric({ precision: 5, scale: 1 }),
  amenities: jsonb().default({}),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  addressLine2: varchar("address_line_2", { length: 255 }),
  latitude: numeric({ precision: 10, scale: 8 }),
  longitude: numeric({ precision: 11, scale: 8 }),
  yearBuilt: integer("year_built"),
  displayId: serial("display_id").notNull(),
  areaValue: integer("area_value"),
  areaUnit: areaUnit("area_unit").default('sqft'),
  loanAvailable: boolean("loan_available").default(false),
  furnishingStatus: furnishingStatus("furnishing_status").default('unfurnished'),
  facing: facing(),
  floorNumber: integer("floor_number"),
  totalFloors: integer("total_floors"),
  parkingSpaces: integer("parking_spaces").default(0),
  possessionStatus: possessionStatus("possession_status").default('ready_to_move'),
  projectName: varchar("project_name", { length: 255 }),
  reraId: varchar("rera_id", { length: 100 }),
  approvalAuthority: varchar("approval_authority", { length: 100 }),
  totalUnits: integer("total_units"),
  projectType: varchar("project_type", { length: 50 }),
}, (table) => [
  foreignKey({
    columns: [table.ownerId],
    foreignColumns: [users.id],
    name: "properties_owner_id_users_id_fk"
  }),
]);

export const agentProfiles = pgTable("agent_profiles", {
  userId: uuid("user_id").primaryKey().notNull(),
  licenseNumber: varchar("license_number", { length: 100 }),
  bio: text(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }),
  specializationAreas: text("specialization_areas").array(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "agent_profiles_user_id_users_id_fk"
  }).onDelete("cascade"),
]);

export const inquiries = pgTable("inquiries", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  listingId: uuid("listing_id"),
  userId: uuid("user_id"),
  guestName: varchar("guest_name", { length: 100 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  message: text(),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.listingId],
    foreignColumns: [listings.id],
    name: "inquiries_listing_id_listings_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "inquiries_user_id_users_id_fk"
  }),
]);

export const showings = pgTable("showings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  listingId: uuid("listing_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  buyerId: uuid("buyer_id"),
  startTime: timestamp("start_time", { mode: 'string' }).notNull(),
  endTime: timestamp("end_time", { mode: 'string' }).notNull(),
  status: viewStatus().default('scheduled'),
  feedback: text(),
  agentNotes: text("agent_notes"),
}, (table) => [
  foreignKey({
    columns: [table.listingId],
    foreignColumns: [listings.id],
    name: "showings_listing_id_listings_id_fk"
  }),
  foreignKey({
    columns: [table.agentId],
    foreignColumns: [users.id],
    name: "showings_agent_id_users_id_fk"
  }),
  foreignKey({
    columns: [table.buyerId],
    foreignColumns: [users.id],
    name: "showings_buyer_id_users_id_fk"
  }),
]);

export const savedListings = pgTable("saved_listings", {
  userId: uuid("user_id").notNull(),
  listingId: uuid("listing_id").notNull(),
  savedAt: timestamp("saved_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "saved_listings_user_id_users_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.listingId],
    foreignColumns: [listings.id],
    name: "saved_listings_listing_id_listings_id_fk"
  }).onDelete("cascade"),
  primaryKey({ columns: [table.userId, table.listingId], name: "saved_listings_user_id_listing_id_pk" }),
]);

