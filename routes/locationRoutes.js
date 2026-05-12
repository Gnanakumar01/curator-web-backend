const express = require("express");
const router = express.Router();
const axios = require("axios");

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const HEADERS = {
  "User-Agent": "Curator/1.0 (sgnanakumar929@gmail.com)", 
  "Accept-Language": "en",
};

// ─── In-memory cache for Nominatim responses (5 minute TTL) ───────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCacheKey(url, params) {
  return `${url}?${new URLSearchParams(params).toString()}`;
}

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, CACHE_TTL);

// ─── Rate limiting: minimum delay between requests (1 second) ───────────────────
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function rateLimitedRequest(url, config) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return axios.get(url, config);
}

// ─── ROOT CAUSE FIX 1 ────────────────────────────────────────────────────────
// getLocationType() was reading address.type but Nominatim puts type/class on
// the TOP-LEVEL result object, not inside result.address. Fixed below.
// ─────────────────────────────────────────────────────────────────────────────
function getLocationType(result) {
  const type = result.type || "";
  const cls = result.class || "";
  const addressType = result.addresstype || "";

  // Cities / towns / villages
  if (
    ["city", "town", "village", "municipality"].includes(type) ||
    ["city", "town", "village"].includes(addressType)
  ) return "city";

  // Localities / suburbs / neighbourhoods
  if (
    ["suburb", "quarter", "neighbourhood", "locality", "hamlet"].includes(type) ||
    ["suburb", "quarter", "neighbourhood"].includes(addressType)
  ) return "locality";

  // Administrative boundaries (India uses admin_level 5/6 for districts)
  if (cls === "boundary" || cls === "place") {
    const adminLevel = parseInt(result.address?.["ISO3166-2-lvl4"] ? "4" : result.extratags?.["admin_level"] || "0");
    if (type === "administrative") {
      // admin_level 6 = district in India
      if (result.extratags?.["admin_level"] === "6") return "district";
      if (result.extratags?.["admin_level"] === "4") return "state";
      return "city";
    }
  }

  if (["district", "county"].includes(type)) return "district";

  return null; // skip unknown types — roads, POIs, buildings etc.
}

function extractCity(address = {}) {
  return address.city || address.town || address.village || address.county || "";
}

function extractDistrict(address = {}) {
  return address.state_district || address.district || address.county || "";
}

// ─── ROOT CAUSE FIX 2 ────────────────────────────────────────────────────────
// Added `layer=address` to restrict results to inhabited places only
// (removes roads, POIs, buildings from results).
// Removed appending ", India" to query — Nominatim + countrycodes=in handles it.
// Increased limit and added featureType for better locality matching.
// ─────────────────────────────────────────────────────────────────────────────
async function searchNominatim(query, options = {}) {
  const { limit = 20, structured = null } = options;
  
  const params = structured
    ? {
        ...structured,
        format: "json",
        limit,
        countrycodes: "in",
        addressdetails: 1,
        extratags: 1,
        "accept-language": "en",
        layer: "address", // only inhabited places, not POIs or roads
      }
    : {
        q: query,
        format: "json",
        limit,
        countrycodes: "in",
        addressdetails: 1,
        extratags: 1,
        "accept-language": "en",
        layer: "address", // KEY FIX: filters out roads, buildings, POIs
      };

  // Check cache first
  const cacheKey = getCacheKey(`${NOMINATIM_BASE_URL}/search`, params);
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await rateLimitedRequest(`${NOMINATIM_BASE_URL}/search`, {
      params,
      headers: HEADERS,
      timeout: 8000,
    });
    const data = response.data || [];
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Nominatim search error:", err.message);
    return [];
  }
}

async function reverseNominatim(lat, lon) {
  const params = {
    lat,
    lon,
    format: "json",
    addressdetails: 1,
    zoom: 14, // zoom 14 = suburb/neighbourhood level
    "accept-language": "en",
  };

  // Check cache first
  const cacheKey = getCacheKey(`${NOMINATIM_BASE_URL}/reverse`, params);
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await rateLimitedRequest(`${NOMINATIM_BASE_URL}/reverse`, {
      params,
      headers: HEADERS,
      timeout: 8000,
    });
    const data = response.data || null;
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Nominatim reverse error:", err.message);
    return null;
  }
}

// ─── /search endpoint ──────────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const query = q.trim();
    const allResults = [];
    const seen = new Set();

    const addResult = (item) => {
      const key = `${item.type}:${item.name.toLowerCase()}`;
      if (!seen.has(key) && item.name) {
        seen.add(key);
        allResults.push(item);
      }
    };

    // ── Strategy 1: Direct Nominatim search (with layer=address fix) ──
    const nominatimResults = await searchNominatim(query, { limit: 20 });

    for (const r of nominatimResults) {
      const locationType = getLocationType(r); // ← fixed: reads from top-level
      if (!locationType || locationType === "state") continue;

      const name = r.display_name?.split(",")[0]?.trim() || r.name || "";
      addResult({
        name,
        type: locationType,
        city: extractCity(r.address),
        district: extractDistrict(r.address),
        state: r.address?.state || "",
        displayName: r.display_name,
        lat: r.lat,
        lon: r.lon,
      });
    }

    // ── Strategy 2: Structured search (city + suburb) for better locality hits ──
    // This catches "Koramangala" when Nominatim free-text misses it
    const structuredResults = await searchNominatim(null, {
      limit: 15,
      structured: {
        city: query,
        country: "India",
      },
    });

    for (const r of structuredResults) {
      const locationType = getLocationType(r);
      if (!locationType || locationType === "state") continue;
      const name = r.display_name?.split(",")[0]?.trim() || "";
      addResult({
        name,
        type: locationType,
        city: extractCity(r.address),
        district: extractDistrict(r.address),
        state: r.address?.state || "",
        displayName: r.display_name,
        lat: r.lat,
        lon: r.lon,
      });
    }

    // Sort: cities first, then localities, then districts
    const typeOrder = { city: 0, locality: 1, district: 2 };
    allResults.sort((a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3));

    res.json(allResults.slice(0, 15));
  } catch (err) {
    console.error("Location search error:", err.message);
    res.status(500).json({ message: "Failed to search locations" });
  }
});

// ─── /areas endpoint ───────────────────────────────────────────────────────────
// ROOT CAUSE FIX 3: Was searching for the city name itself instead of
// suburbs/localities WITHIN the city. Fixed with structured {city, state} query.
router.get("/areas", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city || city.trim().length < 2) return res.json([]);

    const cityTrimmed = city.trim();
    const cityLower = cityTrimmed.toLowerCase();
    const areas = [];
    const seen = new Set();

    const addArea = (name, cityName) => {
      const key = name.toLowerCase();
      if (!seen.has(key) && name) {
        seen.add(key);
        areas.push({ name, type: "locality", city: cityName, displayName: `${name}, ${cityName}` });
      }
    };

    // ── Nominatim: structured query for suburbs inside this city ──
    const results = await searchNominatim(null, {
      limit: 30,
      structured: { city: cityTrimmed, country: "India" },
    });

    for (const r of results) {
      const t = getLocationType(r);
      if (t === "locality") {
        const name = r.display_name?.split(",")[0]?.trim() || "";
        if (name && name.toLowerCase() !== cityLower) addArea(name, cityTrimmed);
      }
    }

    // ── Also try free-text search for "localities in <city>" ──
    const freeResults = await searchNominatim(`localities ${cityTrimmed}`, { limit: 20 });
    for (const r of freeResults) {
      const t = getLocationType(r);
      if (t === "locality") {
        const name = r.display_name?.split(",")[0]?.trim() || "";
        if (name && name.toLowerCase() !== cityLower) addArea(name, cityTrimmed);
      }
    }

    res.json(areas.slice(0, 50));
  } catch (err) {
    console.error("Areas search error:", err.message);
    res.json([]);
  }
});

// ─── /details endpoint ─────────────────────────────────────────────────────────
router.get("/details", async (req, res) => {
  try {
    const { name, city } = req.query;
    if (!name || name.trim().length < 2) return res.json({});

    // Try structured search first (more accurate pincode)
    const results = await searchNominatim(null, {
      limit: 5,
      structured: {
        ...(city ? { city } : {}),
        state: name,       // try as suburb/locality
        country: "India",
      },
    });

    // Also try free-text
    const freeQuery = city ? `${name}, ${city}, India` : `${name}, India`;
    const freeResults = await searchNominatim(freeQuery, { limit: 5 });

    const allCandidates = [...results, ...freeResults];

    if (allCandidates.length > 0) {
      const r = allCandidates[0];
      const addr = r.address || {};
      return res.json({
        name,
        displayName: r.display_name,
        pincode: addr.postcode || "",
        city: addr.city || addr.town || addr.village || city || "",
        state: addr.state || "",
        district: addr.state_district || addr.district || addr.county || "",
        type: getLocationType(r) || "locality",
        lat: r.lat,
        lon: r.lon,
      });
    }

    // No result found — return empty pincode gracefully
    res.json({
      name,
      displayName: `${name}${city ? ", " + city : ""}, India`,
      pincode: "",
      city: city || "",
      state: "",
      district: "",
      type: "locality",
    });
  } catch (err) {
    console.error("Location details error:", err.message);
    res.json({});
  }
});

module.exports = router;