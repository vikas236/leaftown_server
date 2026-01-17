import { Request, Response } from "express";
import { db } from "../config/db";
import { listings, properties, propertyMedia } from "../db/schema";
import { eq, desc } from "drizzle-orm";

// GET: Fetch all active listings
export const getListings = async (_req: Request, res: Response) => {
  try {
    const data = await db.query.listings.findMany({
      where: eq(listings.status, "active"),
      with: {
        property: true,
        media: { limit: 1, orderBy: desc(propertyMedia.displayOrder) },
      },
      orderBy: [desc(listings.listedDate)],
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error fetching listings" });
  }
};

// POST: Create Listing
export const createListing = async (req: Request, res: Response) => {
  const {
    address, city, state, zip,
    type, price, bedrooms, bathrooms,
    agentId, // Receive from frontend
    mediaUrls,
    loanAvailable, areaValue, areaUnit, furnishing, facing,
    floorNumber, totalFloors, parking, possession,
    projectName, reraId, approvalAuthority, totalUnits, projectType,
  } = req.body;

  try {
    await db.transaction(async (tx) => {
      // 1. Create Property
      const [newProp] = await tx
        .insert(properties)
        .values({
          ownerId: agentId,

          addressLine1: address,
          city,
          state,
          zipCode: zip,
          propType: type,
          bedrooms: bedrooms ? Number(bedrooms) : 0,
          bathrooms: bathrooms ? bathrooms : 0,
          areaValue: areaValue ? Number(areaValue) : 0,
          floorNumber: floorNumber ? Number(floorNumber) : null,
          totalFloors: totalFloors ? Number(totalFloors) : null,
          parkingSpaces: parking ? Number(parking) : 0,
          totalUnits: totalUnits ? Number(totalUnits) : 0,
          loanAvailable: loanAvailable || false,
          areaUnit: areaUnit || "sqft",
          furnishingStatus: furnishing || "unfurnished",
          facing: facing || null,
          possessionStatus: possession || "ready_to_move",
          projectName: projectName || null,
          reraId: reraId || null,
          approvalAuthority: approvalAuthority || null,
          projectType: projectType || null,
        })
        .returning({ id: properties.id });

      // 2. Create Listing
      const [newListing] = await tx
        .insert(listings)
        .values({
          propertyId: newProp.id,
          listType: "sale",
          price: price.toString(),
          status: "active",
          agentId: agentId,
        })
        .returning({ id: listings.id });

      // 3. Add Media
      if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
        const mediaValues = mediaUrls.map((url: string, index: number) => ({
          listingId: newListing.id,
          url: url,
          mediaType: "image" as const,
          displayOrder: index
        }));

        await tx.insert(propertyMedia).values(mediaValues);
      }
    });

    res.status(201).json({ message: "Property listed successfully" });
  } catch (error) {
    console.error("Create Listing Error:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
};

// DELETE: Remove Listing + Property + Media (Clean Cleanup)
export const deleteListing = async (req: Request, res: Response) => {
  const { id } = req.params; // This is the Listing ID

  try {
    await db.transaction(async (tx) => {
      // 1. Find the Property ID linked to this listing
      // We need this ID to delete the property record later
      const listingData = await tx.query.listings.findFirst({
        where: eq(listings.id, id),
        columns: { propertyId: true }
      });

      if (!listingData) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // 2. Delete Media (Images)
      // Delete all images associated with this listing ID
      await tx.delete(propertyMedia).where(eq(propertyMedia.listingId, id));

      // 3. Delete the Listing
      // Remove the advertisement record
      await tx.delete(listings).where(eq(listings.id, id));

      // 4. Delete the Property
      // Finally, remove the property details from the database
      if (listingData.propertyId) {
        await tx.delete(properties).where(eq(properties.id, listingData.propertyId));
      }
    });

    res.json({ message: "Listing, Property, and Media deleted successfully" });
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
};

// PUT: Update Listing
export const updateListing = async (req: Request, res: Response) => {
  const { id } = req.params;

  const {
    price, status,
    address, city, state, zip, type,
    bedrooms, bathrooms, areaValue, areaUnit,
    furnishing, facing, floorNumber, totalFloors, parking, possession,
    projectName, reraId, approvalAuthority, totalUnits, projectType,
    loanAvailable, mediaUrls
  } = req.body;

  try {
    await db.transaction(async (tx) => {
      // 1. Get Property ID
      const listingData = await tx.query.listings.findFirst({
        where: eq(listings.id, id),
        columns: { propertyId: true }
      });

      if (!listingData) throw new Error("Listing not found");

      // 2. Update Listing
      await tx.update(listings)
        .set({
          price: price.toString(),
          status: status || 'active',
          updatedAt: new Date()
        })
        .where(eq(listings.id, id));

      // 3. Update Property
      await tx.update(properties)
        .set({
          addressLine1: address,
          city, state, zipCode: zip,
          propType: type,
          bedrooms: bedrooms ? Number(bedrooms) : 0,
          bathrooms: bathrooms ? bathrooms : 0,
          areaValue: areaValue ? Number(areaValue) : 0,
          areaUnit,
          loanAvailable,
          furnishingStatus: furnishing,
          facing,
          floorNumber: floorNumber ? Number(floorNumber) : null,
          totalFloors: totalFloors ? Number(totalFloors) : null,
          parkingSpaces: parking ? Number(parking) : 0,
          possessionStatus: possession,
          projectName, reraId, approvalAuthority,
          totalUnits: totalUnits ? Number(totalUnits) : 0,
          projectType
        })
        .where(eq(properties.id, listingData.propertyId));

      // 4. Update Media
      if (mediaUrls && Array.isArray(mediaUrls)) {
        await tx.delete(propertyMedia).where(eq(propertyMedia.listingId, id));

        if (mediaUrls.length > 0) {
          const mediaValues = mediaUrls.map((url: string, index: number) => ({
            listingId: id,
            url: url,
            mediaType: "image" as const,
            displayOrder: index
          }));
          await tx.insert(propertyMedia).values(mediaValues);
        }
      }
    });

    res.json({ message: "Listing updated successfully" });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
};
