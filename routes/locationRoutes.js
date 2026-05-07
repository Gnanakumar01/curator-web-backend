const express = require("express");
const router = express.Router();
const axios = require("axios");

// Nominatim API base URL
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Common Indian cities and their aliases
const CITY_ALIASES = {
  'bengaluru': ['bangalore', 'bengaluru'],
  'bangalore': ['bangalore', 'bengaluru'],
  'mumbai': ['mumbai', 'bombay'],
  'bombay': ['mumbai', 'bombay'],
  'chennai': ['chennai', 'madras'],
  'madras': ['chennai', 'madras'],
  'kolkata': ['kolkata', 'calcutta'],
  'calcutta': ['kolkata', 'calcutta'],
  'pune': ['pune', 'poona'],
  'poona': ['pune', 'poona'],
  'hyderabad': ['hyderabad'],
  'delhi': ['delhi', 'new delhi'],
  'new delhi': ['delhi', 'new delhi']
};

// Well-known localities for major Indian cities (fallback when Nominatim fails)
const CITY_LOCALITIES = {
  'bengaluru': [
    'BTM Layout', 'Jayanagar','NRI Layout','Madiwala', 'Koramangala', 'Indiranagar', 'Malleshwaram',
    'Rajajinagar', 'Vijayanagar', 'Whitefield', 'Marathahalli', 'HSR Layout',
    'JP Nagar', 'Banashankari', 'Basavanagudi', 'Girinagar', 'Yelahanka',
    'Hebbal', 'Kalyan Nagar', 'Kammanahalli', 'Ulsoor', 'Domlur'
  ],
  'bangalore': [],
  'mumbai': [
    'Andheri', 'Bandra', 'Juhu', 'Borivali', 'Malad', 'Goregaon',
    'Kandivali', 'Dahisar', 'Thane', 'Dombivli', 'Kalyan', 'Navi Mumbai',
    'Vashi', 'Nerul', 'Airoli', 'Powai', 'Worli', 'Colaba', 'Churchgate'
  ],
  'delhi': [
    'Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'Saket', 'Hauz Khas',
    'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Rajouri Garden',
    'Punjabi Bagh', 'Paschim Vihar', 'Uttam Nagar', 'New Delhi',
    'Chanakyapuri', 'Diplomatic Enclave', 'India Gate', 'Rashtrapati Bhavan'
  ],
  'chennai': [
    'T Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'Tambaram',
    'Chrompet', 'Pallavaram', 'Mylapore', 'Nungambakkam', 'Kodambakkam',
    'Vadapalani', 'Koyambedu', 'Egmore', 'Chepauk', 'Besant Nagar'
  ],
  'kolkata': [
    'Salt Lake', 'New Town', 'Rajarhat', 'Howrah', 'Alipore',
    'Ballygunge', 'Park Street', 'Esplanade', 'College Street', 'North Kolkata',
    'South Kolkata', 'East Kolkata', 'West Kolkata', 'Behala', 'Jadavpur'
  ],
  'pune': [
    'Kothrud', 'Hadapsar', 'Wakad', 'Hinjewadi', 'Baner', 'Aundh',
    'Viman Nagar', 'Kalyani Nagar', 'Koregaon Park', 'Camp', 'Deccan',
    'Shivaji Nagar', 'Swargate', 'Pune Station', 'Pimpri', 'Chinchwad'
  ],
  'hyderabad': [
    'Gachibowli', 'Madhapur', 'Kondapur', 'Kukatpally', 'Miyapur',
    'Hitech City', 'Jubilee Hills', 'Banjara Hills', 'Mehdipatnam', 'Secunderabad',
    'Begumpet', 'Ameerpet', 'Abids', 'Charminar', 'Toli Chowki'
  ]
};

// Helper function to search Nominatim API
async function searchNominatim(query, limit = 20) {
  try {
    const params = {
      q: query,
      format: 'json',
      limit: limit,
      countrycodes: 'in',
      addressdetails: 1,
      extratags: 1,
      'accept-language': 'en'
    };

    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params,
      headers: {
        'User-Agent': 'Curator/1.0 (your-email@example.com)'
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error("Nominatim search error:", error.message);
    return [];
  }
}

// Helper function to get details from Nominatim
async function getNominatimDetails(lat, lon) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'Curator/1.0 (your-email@example.com)'
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error("Nominatim reverse error:", error.message);
    return null;
  }
}

// Helper to determine location type from Nominatim address
function getLocationType(address) {
  if (!address) return 'locality';
  
  const type = address.type || address.class || '';
  const osmType = address.osm_type || '';
  
  if (type === 'administrative' || type === 'boundary') {
    if (address.admin_level === '4' || address.admin_level === '6') {
      return 'district';
    }
    return 'city';
  }
  
  if (type === 'city' || type === 'town' || type === 'village') {
    return 'city';
  }
  
  if (type === 'suburb' || type === 'quarter' || type === 'neighbourhood' || type === 'locality') {
    return 'locality';
  }
  
  return 'locality';
}

// Helper to extract city from Nominatim result
function extractCityFromResult(result) {
  const address = result.address || {};
  return address.city || address.town || address.village || address.county || '';
}

// Helper to extract district from Nominatim result
function extractDistrictFromResult(result) {
  const address = result.address || {};
  return address.state_district || address.district || address.county || '';
}

// Search endpoint - uses Nominatim for all Indian cities, localities, districts
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const query = q.trim();
    const allResults = [];

    // Search Nominatim for Indian locations
    const nominatimResults = await searchNominatim(query + ", India", 20);
    
    for (const result of nominatimResults) {
      const address = result.address || {};
      const locationType = getLocationType(address);
      
      // Only include cities, localities, and districts
      if (['city', 'locality', 'district'].includes(locationType)) {
        const name = result.display_name?.split(',')[0]?.trim() || result.name || '';
        const city = extractCityFromResult(result);
        const district = extractDistrictFromResult(result);
        
        if (name) {
          allResults.push({
            name: name,
            type: locationType,
            city: city,
            district: district,
            displayName: result.display_name,
            lat: result.lat,
            lon: result.lon
          });
        }
      }
    }

    // Also search in CITY_LOCALITIES as fallback
    const queryLower = query.toLowerCase();
    for (const [cityKey, localities] of Object.entries(CITY_LOCALITIES)) {
      // Match city name
      if (cityKey.includes(queryLower) || CITY_ALIASES[cityKey]?.some(alias => alias.includes(queryLower))) {
        allResults.push({
          name: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
          type: 'city',
          displayName: cityKey.charAt(0).toUpperCase() + cityKey.slice(1) + ', India'
        });
      }
      
      // Match localities within each city
      for (const locality of localities) {
        if (locality.toLowerCase().includes(queryLower)) {
          allResults.push({
            name: locality,
            type: 'locality',
            city: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
            displayName: `${locality}, ${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}`
          });
        }
      }
    }

    // Remove duplicates and sort
    const seen = new Set();
    const uniqueResults = allResults.filter(item => {
      const key = `${item.type}:${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: cities first, then localities, then districts
    uniqueResults.sort((a, b) => {
      const typeOrder = { 'city': 0, 'locality': 1, 'district': 2 };
      return (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
    });

    res.json(uniqueResults.slice(0, 15));

  } catch (error) {
    console.error("Location search error:", error.message);
    res.status(500).json({ message: "Failed to search locations", error: error.message });
  }
});

// Get location details including pincode
router.get("/details", async (req, res) => {
  try {
    const { name, city } = req.query;
    
    if (!name || name.trim().length < 2) {
      return res.json({});
    }

    // Search Nominatim for the location
    const searchQuery = city ? `${name}, ${city}, India` : `${name}, India`;
    const results = await searchNominatim(searchQuery, 5);
    
    if (results && results.length > 0) {
      const result = results[0];
      const address = result.address || {};
      
      const locationData = {
        name: name,
        displayName: result.display_name,
        pincode: address.postcode || '',
        city: address.city || address.town || address.village || city || '',
        state: address.state || '',
        district: address.state_district || address.district || '',
        type: getLocationType(address),
        lat: result.lat,
        lon: result.lon
      };
      
      return res.json(locationData);
    }

    // Fallback response
    res.json({
      name: name,
      displayName: `${name}${city ? ', ' + city : ''}, India`,
      pincode: '',
      city: city || '',
      state: '',
      district: '',
      type: 'locality'
    });

  } catch (error) {
    console.error("Location details error:", error.message);
    res.json({});
  }
});

// Get areas within a city
router.get("/areas", async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city || city.trim().length < 2) {
      return res.json([]);
    }

    const cityLower = city.toLowerCase().trim();
    const areas = [];

    // First, try to get localities from Nominatim
    const searchQuery = `${city}, India`;
    const cityResults = await searchNominatim(searchQuery, 1);
    
    if (cityResults && cityResults.length > 0) {
      const cityResult = cityResults[0];
      const cityLat = cityResult.lat;
      const cityLon = cityResult.lon;
      
      // Search for localities around the city center
      // Using a bounding box around the city
      const viewbox = `${parseFloat(cityLon) - 0.5},${parseFloat(cityLat) + 0.5},${parseFloat(cityLon) + 0.5},${parseFloat(cityLat) - 0.5}`;
      
      const localityResults = await searchNominatim(city, 30);
      
      for (const result of localityResults) {
        const address = result.address || {};
        const locationType = getLocationType(address);
        
        if (locationType === 'locality' || locationType === 'suburb' || locationType === 'quarter') {
          const name = result.display_name?.split(',')[0]?.trim() || result.name || '';
          if (name && name.toLowerCase() !== cityLower) {
            areas.push({
              name: name,
              type: 'locality',
              city: city,
              displayName: `${name}, ${city}`
            });
          }
        }
      }
    }

    // If Nominatim didn't return enough results, use CITY_LOCALITIES as fallback
    if (areas.length < 10) {
      let fallbackKey = cityLower;
      if (!CITY_LOCALITIES[fallbackKey]) {
        for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
          if (aliases.some(alias => cityLower.includes(alias))) {
            fallbackKey = key;
            break;
          }
        }
      }

      // Convert 'bangalore' to 'bengaluru'
      if (fallbackKey === 'bangalore' && CITY_LOCALITIES['bengaluru']) {
        fallbackKey = 'bengaluru';
      }

      if (CITY_LOCALITIES[fallbackKey]) {
        for (const locality of CITY_LOCALITIES[fallbackKey]) {
          if (!areas.find(a => a.name.toLowerCase() === locality.toLowerCase())) {
            areas.push({
              name: locality,
              type: 'locality',
              city: city,
              displayName: `${locality}, ${city}`
            });
          }
        }
      }
    }

    res.json(areas.slice(0, 30));

  } catch (error) {
    console.error("Areas search error:", error.message);
    
    // Fallback to CITY_LOCALITIES on error
    const cityLower = city.toLowerCase().trim();
    let fallbackKey = cityLower;
    if (cityLower === 'bangalore') fallbackKey = 'bengaluru';
    else if (cityLower === 'bombay') fallbackKey = 'mumbai';
    else if (cityLower === 'madras') fallbackKey = 'chennai';
    else if (cityLower === 'calcutta') fallbackKey = 'kolkata';
    else if (cityLower === 'poona') fallbackKey = 'pune';
    
    if (CITY_LOCALITIES[fallbackKey]) {
      const areas = CITY_LOCALITIES[fallbackKey].map(locality => ({
        name: locality,
        type: 'locality',
        city: city,
        displayName: `${locality}, ${city}`
      }));
      return res.json(areas.slice(0, 30));
    }
    
    res.status(500).json({ message: "Failed to search areas", error: error.message });
  }
});

module.exports = router;
