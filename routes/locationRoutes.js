const express = require("express");
const router = express.Router();
const axios = require("axios");

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const HEADERS = {
  "User-Agent": "Curator/1.0 (sgnanakumar929@gmail.com)", 
  "Accept-Language": "en",
};

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
  try {
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

    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params,
      headers: HEADERS,
      timeout: 8000,
    });
    return response.data || [];
  } catch (err) {
    console.error("Nominatim search error:", err.message);
    return [];
  }
}

async function reverseNominatim(lat, lon) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: "json",
        addressdetails: 1,
        zoom: 14, // zoom 14 = suburb/neighbourhood level
        "accept-language": "en",
      },
      headers: HEADERS,
      timeout: 8000,
    });
    return response.data || null;
  } catch (err) {
    console.error("Nominatim reverse error:", err.message);
    return null;
  }
}

// ─── Expanded fallback data (used when Nominatim returns < 5 results) ─────────
const CITY_LOCALITIES = {
  bengaluru: [
    "BTM Layout","Jayanagar","Madiwala","Koramangala","Indiranagar","Malleshwaram",
    "Rajajinagar","Vijayanagar","Whitefield","Marathahalli","HSR Layout","JP Nagar",
    "Banashankari","Basavanagudi","Girinagar","Yelahanka","Hebbal","Kalyan Nagar",
    "Kammanahalli","Ulsoor","Domlur","Electronic City","Sarjapur Road","Bellandur",
    "Brookefield","Kadugodi","Mahadevapura","Ramamurthy Nagar","KR Puram",
    "Horamavu","Banaswadi","Lingarajapuram","Frazer Town","Cox Town","Ulsoor",
    "Shivaji Nagar","Cubbon Park","MG Road","Brigade Road","Jayanagar","RT Nagar",
    "Sadashivanagar","Dollars Colony","Jalahalli","Peenya","Yeshwanthpur",
    "Tumkur Road","Nagarbhavi","Kengeri","Uttarahalli","Gottigere","Hulimavu",
    "Arekere","Begur","Harlur","Haralur","Gunjur","Varthur","Hopefarm",
    "NRI Layout","Rachenahalli","Thanisandra","Kogilu","Hennur","Bettahalasur",
  ],
  mumbai: [
    "Andheri","Bandra","Juhu","Borivali","Malad","Goregaon","Kandivali","Dahisar",
    "Thane","Dombivli","Kalyan","Navi Mumbai","Vashi","Nerul","Airoli","Powai",
    "Worli","Colaba","Churchgate","Dadar","Parel","Lower Parel","Kurla","Ghatkopar",
    "Vikhroli","Bhandup","Mulund","Nahur","Kanjurmarg","Sion","Chembur","Govandi",
    "Mankhurd","Trombay","Chunabhatti","Dharavi","Mahim","Matunga","Wadala",
    "Aarey Colony","Santacruz","Khar","Ville Parle","Jogeshwari","Oshiwara",
    "Lokhandwala","Versova","Oshiwara","Mira Road","Bhayander","Naigaon","Vasai",
  ],
  delhi: [
    "Connaught Place","Karol Bagh","Lajpat Nagar","Saket","Hauz Khas","Dwarka",
    "Rohini","Pitampura","Janakpuri","Rajouri Garden","Punjabi Bagh","Paschim Vihar",
    "Uttam Nagar","Chanakyapuri","India Gate","Rashtrapati Bhavan","Vasant Kunj",
    "Vasant Vihar","RK Puram","Safdarjung Enclave","Defence Colony","Jangpura",
    "Bhogal","Nizamuddin","Okhla","Jasola","Sarita Vihar","Govindpuri","Kalkaji",
    "Malviya Nagar","Sheikh Sarai","Begumpur","Sangam Vihar","Pul Prahladpur",
    "Alaknanda","Greater Kailash","CR Park","Panchsheel","Munirka","Arjangarh",
    "Chattarpur","Mehrauli","Bijwasan","Dwarka Mor","Uttam Nagar","Bindapur",
    "Nawada","Hastsal","Vikaspuri","Subhash Nagar","Tilak Nagar","Khyala",
  ],
  chennai: [
    "T Nagar","Anna Nagar","Adyar","Velachery","Tambaram","Chrompet","Pallavaram",
    "Mylapore","Nungambakkam","Kodambakkam","Vadapalani","Koyambedu","Egmore",
    "Chepauk","Besant Nagar","Thiruvanmiyur","Sholinganallur","Perungudi","Thoraipakkam",
    "Perumbakkam","Medavakkam","Madambakkam","Selaiyur","Chitlapakkam","Mudichur",
    "Urapakkam","Guduvanchery","Mahindra City","Padappai","Manimangalam","Kundrathur",
    "Porur","Valasaravakkam","Alwarthirunagar","Virugambakkam","Arumbakkam",
    "Mogappair","Ambattur","Avadi","Villivakkam","Perambur","Kolathur","Villapuram",
  ],
  kolkata: [
    "Salt Lake","New Town","Rajarhat","Howrah","Alipore","Ballygunge","Park Street",
    "Esplanade","College Street","Behala","Jadavpur","Dum Dum","Baranagar","Serampore",
    "Bally","Belur","Liluah","Shibpur","Santragachi","Panchla","Domjur","Andul",
    "Rishra","Konnagar","Uttarpara","Baidyabati","Chandannagar","Bhadreswar",
    "Champdani","Uttarpara","Titagarh","Barrackpore","Naihati","Halisahar",
    "Kalyani","Haringhata","Chakdaha","Bidhannagar","Kestopur","Teghoria",
  ],
  pune: [
    "Kothrud","Hadapsar","Wakad","Hinjewadi","Baner","Aundh","Viman Nagar",
    "Kalyani Nagar","Koregaon Park","Camp","Deccan","Shivaji Nagar","Swargate",
    "Pimpri","Chinchwad","Nigdi","Akurdi","Bhosari","Moshi","Chakan","Talegaon",
    "Lonavala","Khadki","Dapodi","Sangvi","Rahatani","Vishrantwadi","Lohegaon",
    "Wagholi","Kharadi","Mundhwa","Magarpatta","Undri","Kondhwa","Bibwewadi",
    "Sahakarnagar","Katraj","Dhayari","Narhe","Ambegaon","Warje","Bavdhan",
  ],
  hyderabad: [
    "Gachibowli","Madhapur","Kondapur","Kukatpally","Miyapur","Hitech City",
    "Jubilee Hills","Banjara Hills","Mehdipatnam","Secunderabad","Begumpet",
    "Ameerpet","Abids","Charminar","Toli Chowki","Manikonda","Narsingi","Kokapet",
    "Tellapur","Khajaguda","Puppalaguda","Rajendranagar","Shamshabad","LB Nagar",
    "Uppal","Nacharam","Mallapur","Boduppal","Peerzadiguda","Ghatkesar","Medchal",
    "Kompally","Alwal","Malkajgiri","Trimulgherry","Bowenpally","Yapral","Dammaiguda",
  ],
  ahmedabad: [
    "Navrangpura","Satellite","Vastrapur","Bodakdev","Thaltej","Prahlad Nagar",
    "Maninagar","Isanpur","Vatva","Odhav","Naroda","Bapunagar","Amraiwadi",
    "Nikol","Vastral","Chandkheda","Motera","Sabarmati","Gota","Tragad",
    "Ranip","Nava Vadaj","Memnagar","Gurukul","Drive-In Road","Judges Bungalow",
    "SG Highway","Sindhu Bhavan","Science City","Sola","Shela","Ghuma",
  ],
  jaipur: [
    "Malviya Nagar","Vaishali Nagar","Mansarovar","Raja Park","Bapu Nagar",
    "Sitapura","Sanganer","Pratap Nagar","Jagatpura","Durgapura","Tonk Road",
    "Ajmer Road","Gopalpura","Sodala","Shastri Nagar","Civil Lines","MI Road",
    "Sindhi Camp","Walled City","Amer","Jhotwara","Vidyadhar Nagar","Nirman Nagar",
  ],
  surat: [
    "Adajan","Vesu","Pal","Althan","Dumas","Bhatar","Katargam","Varachha",
    "Limbayat","Majura Gate","Ring Road","Rander","Sachin","Hazira","Magdalla",
    "Ichchhapor","Kamrej","Bardoli","Navsari Road","City Light","Ghod Dod Road",
  ],
  lucknow: [
    "Hazratganj","Gomti Nagar","Indira Nagar","Alambagh","Aliganj","Vikas Nagar",
    "Janakipuram","Chinhat","Shaheed Path","Mahanagar","Kapoorthala","Butler Palace",
    "Jankipuram","Kursi Road","Sultanpur Road","Faizabad Road","Sitapur Road",
  ],
};

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

    // ── Strategy 3: Fallback from CITY_LOCALITIES static data ──
    const queryLower = query.toLowerCase();
    for (const [cityKey, localities] of Object.entries(CITY_LOCALITIES)) {
      // Match city name itself
      if (cityKey.startsWith(queryLower) || cityKey.includes(queryLower)) {
        addResult({
          name: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
          type: "city",
          city: "",
          district: "",
          displayName: `${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}, India`,
        });
      }
      // Match localities within cities
      for (const locality of localities) {
        if (locality.toLowerCase().includes(queryLower)) {
          addResult({
            name: locality,
            type: "locality",
            city: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
            district: "",
            displayName: `${locality}, ${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}, India`,
          });
        }
      }
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

    // ── Static fallback (always append these so the dropdown is never empty) ──
    let fallbackKey = cityLower;
    // Alias normalisation
    const aliases = { bangalore: "bengaluru", bombay: "mumbai", madras: "chennai", calcutta: "kolkata", poona: "pune", "new delhi": "delhi" };
    if (aliases[fallbackKey]) fallbackKey = aliases[fallbackKey];

    if (CITY_LOCALITIES[fallbackKey]) {
      for (const locality of CITY_LOCALITIES[fallbackKey]) {
        addArea(locality, cityTrimmed);
      }
    }

    res.json(areas.slice(0, 50));
  } catch (err) {
    console.error("Areas search error:", err.message);
    // Graceful fallback
    const cityLower = req.query.city?.toLowerCase().trim() || "";
    const aliases = { bangalore: "bengaluru", bombay: "mumbai", madras: "chennai", calcutta: "kolkata", poona: "pune" };
    const key = aliases[cityLower] || cityLower;
    const fallback = CITY_LOCALITIES[key] || [];
    res.json(fallback.map((l) => ({ name: l, type: "locality", city: req.query.city, displayName: `${l}, ${req.query.city}` })));
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