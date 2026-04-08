const express = require("express");
const router = express.Router();
const { geocodeAddress } = require("../utils/geocoding");
const axios = require('axios');

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
    'BTM Layout', 'Whitefield', 'Koramangala', 'Indiranagar', 'Jayanagar',
    'HSR Layout', 'Electronic City', 'Marathahalli', 'Bannerghatta Road',
    'JP Nagar', 'Banashankari', 'Malleshwaram', 'Rajajinagar', 'Yelahanka',
    'Hebbal', 'KR Puram', 'Bommanahalli', 'Dasarahalli', 'Mahalakshmi Layout',
    'Sadashivanagar', 'Basavanagudi', 'Girinagar', 'Vijayanagar', 'Nagarbhavi',
    'Uttarahalli', 'Kengeri', 'Kaggadasapura', 'Begur', 'Hulimavu', 'Bilekahalli',
    'Arekere', 'Konanakunte', 'Jaraganahalli', 'Sarakki', 'Puttenahalli',
    'JP Nagar 1st Phase', 'JP Nagar 2nd Phase', 'JP Nagar 3rd Phase',
    'JP Nagar 4th Phase', 'JP Nagar 5th Phase', 'JP Nagar 6th Phase',
    'JP Nagar 7th Phase', 'JP Nagar 8th Phase', 'JP Nagar 9th Phase',
    'Madiwala', 'Kumaraswamy Layout', 'Uttarahalli Main Road', 'Hosur Road',
    'Sarjapur Road', 'Bellandur', 'Outer Ring Road', 'Silk Board'
  ],
  'bangalore': [
    'BTM Layout', 'Whitefield', 'Koramangala', 'Indiranagar', 'Jayanagar',
    'HSR Layout', 'Electronic City', 'Marathahalli', 'Bannerghatta Road',
    'JP Nagar', 'Banashankari', 'Malleshwaram', 'Rajajinagar', 'Yelahanka',
    'Hebbal', 'KR Puram', 'Bommanahalli', 'Dasarahalli', 'Mahalakshmi Layout',
    'Sadashivanagar', 'Basavanagudi', 'Girinagar', 'Vijayanagar', 'Nagarbhavi',
    'Uttarahalli', 'Kengeri', 'Kaggadasapura', 'Begur', 'Hulimavu', 'Bilekahalli',
    'Arekere', 'Konanakunte', 'Jaraganahalli', 'Sarakki', 'Puttenahalli',
    'JP Nagar 1st Phase', 'JP Nagar 2nd Phase', 'JP Nagar 3rd Phase',
    'JP Nagar 4th Phase', 'JP Nagar 5th Phase', 'JP Nagar 6th Phase',
    'JP Nagar 7th Phase', 'JP Nagar 8th Phase', 'JP Nagar 9th Phase',
    'Madiwala', 'Kumaraswamy Layout', 'Uttarahalli Main Road', 'Hosur Road',
    'Sarjapur Road', 'Bellandur', 'Outer Ring Road', 'Silk Board'
  ],
  'mumbai': [
    'Andheri', 'Bandra', 'Juhu', 'Borivali', 'Malad', 'Goregaon',
    'Kandivali', 'Dahisar', 'Mira Road', 'Bhayandar', 'Vasai', 'Virar',
    'Nallasopara', 'Palghar', 'Dahanu', 'Thane', 'Dombivli', 'Kalyan',
    'Ulhasnagar', 'Ambernath', 'Badlapur', 'Panvel', 'Navi Mumbai',
    'Vashi', 'Nerul', 'Belapur', 'Kharghar', 'Kopar Khairane',
    'Ghansoli', 'Airoli', 'Rabale', 'Mahape', 'Turbhe', 'Sanpada',
    'Juhu Beach', 'Versova', 'Lokhandwala', 'Oshiwara', 'Goregaon East',
    'Goregaon West', 'Malad East', 'Malad West', 'Borivali East',
    'Borivali West', 'Kandivali East', 'Kandivali West'
  ],
  'delhi': [
    'Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'Saket', 'Hauz Khas',
    'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Rajouri Garden',
    'Punjabi Bagh', 'Paschim Vihar', 'Uttam Nagar', 'Najafgarh',
    'Mundka', 'Nangloi', 'Bawana', 'Alipur', 'Narela', 'Burari',
    'Timarpur', 'Civil Lines', 'Kamla Nagar', 'Mukherjee Nagar',
    'Model Town', 'Gulabi Bagh', 'Shalimar Bagh', 'Wazirpur',
    'Ashok Vihar', 'Tri Nagar', 'Kirti Nagar', 'Moti Nagar',
    'Ramesh Nagar', 'Patel Nagar', 'Rajendra Nagar', 'Pusa Road'
  ],
  'chennai': [
    'T Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'Tambaram',
    'Chrompet', 'Pallavaram', 'Chengalpattu', 'Kanchipuram',
    'Tiruvallur', 'Ambattur', 'Avadi', 'Maduravoyal', 'Valasaravakkam',
    'Alandur', 'Poonamallee', 'Thiruninravur', 'Thiruvottiyur',
    'Royapuram', 'Washermanpet', 'George Town', 'Triplicane',
    'Mylapore', 'Nungambakkam', 'Kodambakkam', 'Ashok Nagar',
    'Vadapalani', 'Saligramam', 'Virugambakkam', 'Koyambedu',
    'Arumbakkam', 'Aminjikarai', 'Nelson Manickam Road', 'Choolaimedu'
  ],
  'kolkata': [
    'Salt Lake', 'New Town', 'Rajarhat', 'Howrah', 'Serampore',
    'Barrackpore', 'Barasat', 'Naihati', 'Kalyani', 'Nadia',
    'Hooghly', 'Chandannagar', 'Chinsurah', 'Uttarpara', 'Bally',
    'Belur', 'Liluah', 'Salkia', 'Shibpur', 'Garden Reach',
    'Metiabruz', 'Taratala', 'Behala', 'Joka', 'Thakurpukur',
    'Budge Budge', 'Maheshtala', 'Batanagar', 'Nangi', 'Pujali',
    'Rajpur', 'Sonarpur', 'Narendrapur', 'Garia', 'Jadavpur',
    'Tollygunge', 'Alipore', 'Ballygunge', 'Park Street', 'Camac Street'
  ],
  'pune': [
    'Kothrud', 'Hadapsar', 'Wakad', 'Hinjewadi', 'Baner', 'Aundh',
    'Pimple Saudagar', 'Pimple Nilakh', 'Pimple Gurav', 'Rahatani',
    'Wagholi', 'Kharadi', 'Viman Nagar', 'Kalyani Nagar', 'Koregaon Park',
    'Camp', 'Deccan', 'Shivaji Nagar', 'Sadashiv Peth', 'Swargate',
    'Pune Station', 'Pimpri', 'Chinchwad', 'Nigdi', 'Akurdi',
    'Ravet', 'Tathawade', 'Thergaon', 'Dapodi', 'Bopodi',
    'Khadki', 'Aundh Road', 'Baner Road', 'Balewadi', 'Mahalunge'
  ],
  'hyderabad': [
    'Gachibowli', 'Madhapur', 'Kondapur', 'Kukatpally', 'Miyapur',
    'Bachupally', 'Nizampet', 'Pragathi Nagar', 'KPHB Colony',
    'Manikonda', 'Nanakramguda', 'Financial District', 'Hitech City',
    'Jubilee Hills', 'Banjara Hills', 'Film Nagar', 'Jubilee Hills Extension',
    'Mehdipatnam', 'Tolichowki', 'Attapur', 'Rajendranagar', 'Shamshabad',
    'Aramghar', 'Uppal', 'Habsiguda', 'Tarnaka', 'Malkajgiri',
    'Secunderabad', 'Begumpet', 'Ameerpet', 'SR Nagar', 'Sanath Nagar',
    'Erragadda', 'Borabanda', 'Yousufguda', 'Moosapet', 'Balanagar'
  ]
};

/**
 * Search for locations using Nominatim
 * Returns cities, localities, and areas matching the query
 */
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const queryLower = q.toLowerCase().trim();
    
    // Check if query matches a known city alias
    let searchQueries = [q];
    for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
      if (aliases.some(alias => queryLower.includes(alias))) {
        // Add all aliases to search
        searchQueries = [...new Set([...searchQueries, ...aliases])];
        break;
      }
    }

    // Search for locations using Nominatim
    const allLocations = [];
    const seen = new Set();

    for (const searchQuery of searchQueries) {
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: searchQuery,
            format: 'json',
            limit: 15,
            countrycodes: 'in', // Restrict to India
            addressdetails: 1,
            extratags: 1
          },
          headers: {
            'User-Agent': 'Qurator/1.0' // Required by Nominatim usage policy
          }
        });

        if (response.data && response.data.length > 0) {
          response.data.forEach(result => {
            const address = result.address || {};
            
            // Extract relevant location parts
            const city = address.city || address.town || address.municipality || address.county;
            const locality = address.suburb || address.neighbourhood || address.locality || address.village;
            const state = address.state;
            
            // Add city if available and not seen
            if (city && !seen.has(city.toLowerCase())) {
              seen.add(city.toLowerCase());
              allLocations.push({
                name: city,
                type: 'city',
                state: state || '',
                displayName: result.display_name
              });
            }
            
            // Add locality if available and not seen
            if (locality && !seen.has(locality.toLowerCase())) {
              seen.add(locality.toLowerCase());
              allLocations.push({
                name: locality,
                type: 'locality',
                city: city || '',
                state: state || '',
                displayName: result.display_name
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error searching for ${searchQuery}:`, err.message);
      }
    }

    // Sort: cities first, then localities
    allLocations.sort((a, b) => {
      if (a.type === 'city' && b.type !== 'city') return -1;
      if (a.type !== 'city' && b.type === 'city') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(allLocations.slice(0, 15)); // Limit to 15 results

  } catch (error) {
    console.error("Location search error:", error.message);
    res.status(500).json({ message: "Failed to search locations", error: error.message });
  }
});

/**
 * Get cities and localities within a specific city (e.g., "Bengaluru")
 * This helps when searching for "bengaluru" to show all areas within Bengaluru
 */
router.get("/areas", async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city || city.trim().length < 2) {
      return res.json([]);
    }

    const cityLower = city.toLowerCase().trim();
    
    // Check if city matches a known alias
    let searchCity = city;
    for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
      if (aliases.some(alias => cityLower.includes(alias))) {
        searchCity = key; // Use the canonical name
        break;
      }
    }

    // First, get the city's bounding box using Nominatim
    const cityResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: searchCity,
        format: 'json',
        limit: 1,
        countrycodes: 'in',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'Qurator/1.0'
      }
    });

    if (!cityResponse.data || cityResponse.data.length === 0) {
      return res.json([]);
    }

    const cityData = cityResponse.data[0];
    const boundingBox = cityData.boundingbox;

    if (!boundingBox || boundingBox.length < 4) {
      return res.json([]);
    }

    // Search for areas within the city's bounding box using multiple queries
    const allAreas = [];
    const seen = new Set();
    
    // Try different search queries to find more localities
    const searchQueries = [
      `${searchCity} locality`,
      `${searchCity} area`,
      `${searchCity} neighbourhood`,
      `${searchCity} suburb`
    ];

    for (const searchQuery of searchQueries) {
      try {
        const areasResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: searchQuery,
            format: 'json',
            limit: 20,
            countrycodes: 'in',
            addressdetails: 1,
            viewbox: `${boundingBox[2]},${boundingBox[0]},${boundingBox[3]},${boundingBox[1]}`,
            bounded: 1
          },
          headers: {
            'User-Agent': 'Qurator/1.0'
          }
        });

        if (areasResponse.data && areasResponse.data.length > 0) {
          areasResponse.data.forEach(result => {
            const address = result.address || {};
            const locality = address.suburb || address.neighbourhood || address.locality || address.village || address.town;
            
            if (locality && !seen.has(locality.toLowerCase())) {
              seen.add(locality.toLowerCase());
              allAreas.push({
                name: locality,
                type: 'locality',
                city: city,
                displayName: result.display_name
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error searching for ${searchQuery}:`, err.message);
      }
    }

    // Sort alphabetically
    allAreas.sort((a, b) => a.name.localeCompare(b.name));

    // If Nominatim returned no results, use hardcoded localities as fallback
    // Check both the original cityLower and the canonical searchCity
    let fallbackKey = cityLower;
    if (!CITY_LOCALITIES[fallbackKey]) {
      fallbackKey = searchCity.toLowerCase();
    }
    
    if (allAreas.length === 0 && CITY_LOCALITIES[fallbackKey]) {
      const fallbackLocalities = CITY_LOCALITIES[fallbackKey];
      fallbackLocalities.forEach(locality => {
        allAreas.push({
          name: locality,
          type: 'locality',
          city: city,
          displayName: `${locality}, ${city}`
        });
      });
    }

    res.json(allAreas.slice(0, 20)); // Limit to 20 results

  } catch (error) {
    console.error("Areas search error:", error.message);
    
    // If Nominatim fails completely, use hardcoded localities as fallback
    const cityLower = city.toLowerCase().trim();
    let fallbackKey = cityLower;
    // Also check for canonical city name (bengaluru instead of bangalore)
    if (cityLower === 'bangalore') fallbackKey = 'bengaluru';
    else if (cityLower === 'bombay') fallbackKey = 'mumbai';
    else if (cityLower === 'madras') fallbackKey = 'chennai';
    else if (cityLower === 'calcutta') fallbackKey = 'kolkata';
    else if (cityLower === 'poona') fallbackKey = 'pune';
    
    if (CITY_LOCALITIES[fallbackKey]) {
      const fallbackLocalities = CITY_LOCALITIES[fallbackKey];
      const allAreas = fallbackLocalities.map(locality => ({
        name: locality,
        type: 'locality',
        city: city,
        displayName: `${locality}, ${city}`
      }));
      return res.json(allAreas.slice(0, 20));
    }
    
    res.status(500).json({ message: "Failed to search areas", error: error.message });
  }
});

module.exports = router;
