import { Request, Response } from "express";
import { db } from "../config/db";
import { listings, properties, propertyMedia } from "../db/schema";
import { eq, desc } from "drizzle-orm";

// GET: Fetch all active listings with property details and first image
export const getListings = async (req: Request, res: Response) => {
  try {
    const data = await db.query.listings.findMany({
      where: eq(listings.status, "active"),
      with: {
        property: true,
        media: { limit: 1, orderBy: desc(propertyMedia.displayOrder) }, // Get thumbnail
      },
      orderBy: [desc(listings.listedDate)],
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error fetching listings" });
  }
};

// POST: Create Property + Listing + Initial Media (Transaction)
export const createListing = async (req: Request, res: Response) => {
  const {
    address,
    city,
    state,
    zip,
    type,
    price,
    bedrooms,
    bathrooms,
    ownerId,
    mediaUrl,
    loanAvailable,
    areaValue,
    areaUnit,
    furnishing,
    facing,
    floorNumber,
    totalFloors,
    parking,
    possession,
    // NEW INPUTS
    projectName,
    reraId,
    approvalAuthority,
    totalUnits,
    projectType,
  } = req.body;

  try {
    await db.transaction(async (tx) => {
      // 1. Create Property
      const [newProp] = await tx
        .insert(properties)
        .values({
          ownerId,
          addressLine1: address,
          city,
          state,
          zipCode: zip,
          propType: type,
          bedrooms: bedrooms || 0,
          bathrooms: bathrooms || 0,
          loanAvailable: loanAvailable || false,
          areaValue: areaValue ? Number(areaValue) : 0,
          areaUnit: areaUnit || "sqft",

          furnishingStatus: furnishing || "unfurnished",
          facing: facing || null,
          floorNumber: floorNumber ? Number(floorNumber) : null,
          totalFloors: totalFloors ? Number(totalFloors) : null,
          parkingSpaces: parking ? Number(parking) : 0,
          possessionStatus: possession || "ready_to_move",

          // SAVE NEW PROJECT FIELDS
          projectName: projectName || null,
          reraId: reraId || null,
          approvalAuthority: approvalAuthority || null,
          totalUnits: totalUnits ? Number(totalUnits) : 0,
          projectType: projectType || null,
        })
        .returning({ id: properties.id });

      // 2. Create Listing
      const [newListing] = await tx
        .insert(listings)
        .values({
          propertyId: newProp.id,
          listType: "sale", // Default to sale for now
          price,
          status: "active",
        })
        .returning({ id: listings.id });

      // 3. Add Media (if provided)
      if (mediaUrl) {
        await tx.insert(propertyMedia).values({
          listingId: newListing.id,
          url: mediaUrl,
          mediaType: "image",
        });
      }
    });

    res.status(201).json({ message: "Property listed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create listing" });
  }
};

// DELETE: Remove a listing (Cascades will handle property/media cleanup if configured in DB, else we do manually)
export const deleteListing = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // We delete the listing. The DB foreign keys set to CASCADE will delete related media/inquiries.
    // Note: We might want to keep the Property record, but for now we delete the Listing.
    await db.delete(listings).where(eq(listings.id, id));
    res.json({ message: "Listing deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
};

export const updateListing = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { price, status, description } = req.body;

  try {
    await db
      .update(listings)
      .set({ price, status, description, updatedAt: new Date() })
      .where(eq(listings.id, id));
    res.json({ message: "Listing updated" });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};
