const mongoose = require("mongoose");
const Store = require("../models/Store");

const migrateLocations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/curator");
    console.log("Connected to MongoDB");

    // Find all stores that have lat/lng but no location or location is null
    const stores = await Store.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
      $or: [
        { location: { $exists: false } },
        { location: null }
      ]
    });

    console.log(`Found ${stores.length} stores to update`);

    for (const store of stores) {
      store.location = {
        type: "Point",
        coordinates: [store.longitude, store.latitude]
      };
      await store.save();
      console.log(`Updated store ${store._id} - ${store.storeName}`);
    }

    console.log("Migration completed!");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
};

migrateLocations();
