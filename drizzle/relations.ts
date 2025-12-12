import { relations } from "drizzle-orm/relations";
import { users, listings, properties, transactions, propertyMedia, supportTickets, agentProfiles, inquiries, showings, savedListings } from "./schema";

export const listingsRelations = relations(listings, ({one, many}) => ({
	user: one(users, {
		fields: [listings.agentId],
		references: [users.id]
	}),
	property: one(properties, {
		fields: [listings.propertyId],
		references: [properties.id]
	}),
	transactions: many(transactions),
	propertyMedias: many(propertyMedia),
	inquiries: many(inquiries),
	showings: many(showings),
	savedListings: many(savedListings),
}));

export const usersRelations = relations(users, ({many}) => ({
	listings: many(listings),
	transactions_agentId: many(transactions, {
		relationName: "transactions_agentId_users_id"
	}),
	transactions_buyerId: many(transactions, {
		relationName: "transactions_buyerId_users_id"
	}),
	transactions_sellerId: many(transactions, {
		relationName: "transactions_sellerId_users_id"
	}),
	supportTickets: many(supportTickets),
	properties: many(properties),
	agentProfiles: many(agentProfiles),
	inquiries: many(inquiries),
	showings_agentId: many(showings, {
		relationName: "showings_agentId_users_id"
	}),
	showings_buyerId: many(showings, {
		relationName: "showings_buyerId_users_id"
	}),
	savedListings: many(savedListings),
}));

export const propertiesRelations = relations(properties, ({one, many}) => ({
	listings: many(listings),
	user: one(users, {
		fields: [properties.ownerId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	listing: one(listings, {
		fields: [transactions.listingId],
		references: [listings.id]
	}),
	user_agentId: one(users, {
		fields: [transactions.agentId],
		references: [users.id],
		relationName: "transactions_agentId_users_id"
	}),
	user_buyerId: one(users, {
		fields: [transactions.buyerId],
		references: [users.id],
		relationName: "transactions_buyerId_users_id"
	}),
	user_sellerId: one(users, {
		fields: [transactions.sellerId],
		references: [users.id],
		relationName: "transactions_sellerId_users_id"
	}),
}));

export const propertyMediaRelations = relations(propertyMedia, ({one}) => ({
	listing: one(listings, {
		fields: [propertyMedia.listingId],
		references: [listings.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one}) => ({
	user: one(users, {
		fields: [supportTickets.userId],
		references: [users.id]
	}),
}));

export const agentProfilesRelations = relations(agentProfiles, ({one}) => ({
	user: one(users, {
		fields: [agentProfiles.userId],
		references: [users.id]
	}),
}));

export const inquiriesRelations = relations(inquiries, ({one}) => ({
	listing: one(listings, {
		fields: [inquiries.listingId],
		references: [listings.id]
	}),
	user: one(users, {
		fields: [inquiries.userId],
		references: [users.id]
	}),
}));

export const showingsRelations = relations(showings, ({one}) => ({
	listing: one(listings, {
		fields: [showings.listingId],
		references: [listings.id]
	}),
	user_agentId: one(users, {
		fields: [showings.agentId],
		references: [users.id],
		relationName: "showings_agentId_users_id"
	}),
	user_buyerId: one(users, {
		fields: [showings.buyerId],
		references: [users.id],
		relationName: "showings_buyerId_users_id"
	}),
}));

export const savedListingsRelations = relations(savedListings, ({one}) => ({
	user: one(users, {
		fields: [savedListings.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [savedListings.listingId],
		references: [listings.id]
	}),
}));