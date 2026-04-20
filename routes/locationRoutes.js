const express = require("express");
const router = express.Router();
const { geocodeAddress } = require("../utils/geocoding");
const axios = require('axios');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

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
    // South Bangalore
    'BTM Layout', 'Jayanagar', 'Jayanagar 1st Block', 'Jayanagar 2nd Block', 'Jayanagar 3rd Block',
    'Jayanagar 4th Block', 'Jayanagar 5th Block', 'Jayanagar 6th Block', 'Jayanagar 7th Block', 'Jayanagar 8th Block', 'Jayanagar 9th Block',
    'Banashankari', 'Banashankari 2nd Stage', 'Banashankari 3rd Stage',
    'Kumaraswamy Layout', 'Uttarahalli', 'Uttarahalli Main Road', 'Vasanth Nagar',
    'Sarjapur Road', 'Sarjapur', 'Bellandur', 'Outer Ring Road', 'Silk Board',
    'HSR Layout', 'HSR Sector 1', 'HSR Sector 2', 'HSR Sector 3', 'HSR Sector 4', 'HSR Sector 5', 'HSR Sector 6', 'HSR Sector 7',
    'Haralur Road', 'Carmelaram', 'Kasavanahalli', 'Kaikondrahalli',
    'Bannerghatta Road', 'Bannerghatta', 'Adugodi', 'Lakkasandra',
    // Central Bangalore
    'Koramangala', 'Koramangala 1st Block', 'Koramangala 2nd Block', 'Koramangala 3rd Block',
    'Koramangala 4th Block', 'Koramangala 5th Block', 'Koramangala 6th Block', 'Koramangala 7th Block', 'Koramangala 8th Block',
    'Indiranagar', 'Indiranagar 1st Stage', 'Indiranagar 2nd Stage', 'Indiranagar 3rd Stage', 'Indiranagar 4th Stage', 'Indiranagar 5th Stage',
    'Domlur', 'Domlur Layout',
    'New Thippasandra', 'Kacharakanahalli', 'Kodihalli',
    'MG Road', 'Brigade Road', 'Church Street', 'Commercial Street',
    'Richmond Town', 'Richmond Road', 'Sanjay Nagar', 'Sanjay Nagar 1st Block',
    'Shanthi Nagar', 'Shanthi Nagar',
    // North Bangalore
    'Malleshwaram', 'Malleshwaram 8th Cross', 'Malleshwaram 7th Cross', 'Malleshwaram 6th Cross',
    'Rajajinagar', 'Rajajinagar 1st Block', 'Rajajinagar 2nd Block', 'Rajajinagar 3rd Block',
    'Rajajinagar 4th Block', 'Rajajinagar 5th Block', 'Rajajinagar 6th Block',
    'Vijayanagar', 'Vijayanagar 2nd Stage', 'Vijayanagar 4th Block',
    'Nagarbhavi', 'Nagarbhavi 2nd Stage',
    'Yeshwantpur', 'Yeshwantpur 2nd Phase',
    'Mahalakshmi Layout', 'Mahalakshmi Extension',
    'Rajarajeshwari Nagar', 'Rajarajeshwari Nagar 2nd Stage',
    'Nandini Layout', 'Annachandra Gardens',
    // East Bangalore
    'Whitefield', 'Whitefield Railway Station', 'ITPL', 'Brookfield',
    'Marathahalli', 'Marathahalli Bridge', 'Kundalahalli Gate', 'Spica',
    'Varthur', 'Varthur Main Road', 'Gunjur', 'Gunjur Main Road',
    'Benniganahalli', 'Kacharakanahalli Junction',
    'KR Puram', 'KRS Layout', 'Mahadevapura', 'Grandhasavanahalli',
    'Tin Factory', 'Sanjay Gandhi Nagar',
    'CV Raman Nagar', 'New Thippasandra',
    // West Bangalore
    'Vijayanagar', 'Vijayanagar 2nd Stage', 'Vijayanagar 4th Block',
    'Mahalakshmi Layout', 'Rajajinagar Industrial Layout',
    'Dasarahalli', 'Dasarahalli Main Road',
    'Manjunathanagar', 'Manjunathanagar Road',
    'Kengeri', 'Kengeri Satellite Town', 'Kengeri Industrial Area',
    'Nayandahalli', 'Rajarajeshwari Nagar',
    // Additional popular areas
    'Hosur Road', 'Electronic City', 'Electronic City Phase 1', 'Electronic City Phase 2',
    'Electronic City Phase 3', 'Electronic City Junction',
    'JP Nagar', 'JP Nagar 1st Phase', 'JP Nagar 2nd Phase', 'JP Nagar 3rd Phase',
    'JP Nagar 4th Phase', 'JP Nagar 5th Phase', 'JP Nagar 6th Phase',
    'JP Nagar 7th Phase', 'JP Nagar 8th Phase', 'JP Nagar 9th Phase',
    'Madiwala', 'Madiwala Market', 'St. Marks Road',
    'Shivaji Nagar', 'Cantonment', 'Richmond Circle',
    'HAL', 'HAL 2nd Stage', 'HAL 3rd Stage',
    'AECS Layout', 'AECS Layout Kundalahalli',
    'Brookfield', 'Immadihalli', 'Spig Road',
    'Frazer Town', 'Cox Town', 'Cooke Town',
    'Ulsoor', 'Ulsoor Lake', 'Halasuru',
    'S腺rpur', 'Mg Road Metro',
    'Yelahanka', 'Yelahanka Old Town', 'Yelahanka New Town',
    'Kodigehalli', 'Kodigehalli Main Road', 'Sahakarnagar',
    'Hebbal', 'Hebbal Flyover', 'Lokhandwala Layout',
    'Jakkur', 'Jakkur Aerodrome', 'Uttarahalli Main Road',
    'Kalyan Nagar', 'Kalyan Nagar 2nd Block', 'Kalyan Nagar 3rd Block',
    'Kammanahalli', 'Kammanahalli Main Road',
    'Lingarajapuram', 'Lingarajapuram Road',
    'Banaswadi', 'Banaswadi Main Road',
    'Horamavu', 'Horamavu BDA Layout', 'Horamavu Main Road',
    'Ramamurthy Nagar', 'Ramamurthy Nagar 2nd Block',
    // Tech Parks
    'Manyata Tech Park', 'Manyata Embassy Business Park',
    'RMZ Centennial', 'RMZ Tech Park', 'RMZ Infinity',
    'Bagmane Tech Park', 'Bagmane World Technology Center',
    'Prestige Tech Park', 'Prestige Technology Park',
    'Divya Shree Chambers', 'DLF Glen', 'DLF Corporate Park',
    'Brigade Tech Park', 'Brigade Millennium',
    'RMZ Legacy', 'RMZ Latitude',
    'Mantri Commerz', 'Mantri Residency',
    // New Areas in North Bangalore
    'Hennur', 'Hennur Main Road', 'Hennur Cross', 'Hennur Gardens',
    'Kannur', 'Kannur Main Road',
    'Bagalur', 'Bagalur Cross',
    'Yelahanka Road', 'Devanahalli', 'Devanahalli Road',
    'Kolkata', 'Kolar Gold Fields',
    // New Areas in East Bangalore
    'Hoodi', 'Hoodi Junction',
    'Graphite India Road', 'Hoskote', 'Hoskote Road',
    'Tin Factory', 'Tin Factory Junction',
    'Mahadevapura', 'Mahadevapura Industrial Area',
    'Sadaramangala', 'Ayappa Nagar',
    // New Areas in South Bangalore
    'Gottigere', 'Gottigere Cross',
    'Banerghatta', 'Anekal', 'Chapagar',
    'Hosur Road', 'Begur', 'Begur Main Road',
    'Subramanyapura', 'Uttarahalli',
    'Konanakunte', 'Konanakunte Cross',
    'Anjanapura', 'Anjanapura Main Road',
    'Doddakallasandra', 'Kanakapura Road',
    // Other areas
    'Wilson Garden', 'Lalbagh', 'Lalbagh Main Road',
    'Basavanagudi', 'Bull Temple Road', 'Hanumantha Nagar',
    'Girinagar', 'Girinagar 2nd Stage',
    'Sadashivanagar', 'Sadashivanagar 2nd Cross',
    'Gandhi Bazaar', 'Gandhi Bazaar Main Road',
    'Chikkpet', 'Chikkpet Main Road',
    'Narayan Singh Building', 'City Market'
  ],
  // Bangalore is same as Bengaluru
  'bangalore': [],
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

async function searchNominatim(query, viewbox = null, bounded = 0) {
  const params = {
    q: query,
    format: 'json',
    limit: 20,
    countrycodes: 'in',
    addressdetails: 1,
    extratags: 1
  };
  
  if (viewbox) {
    params.viewbox = viewbox;
    params.bounded = bounded;
  }
  
  const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
    params,
    headers: {
      'User-Agent': 'Curator/1.0'
    }
  });
  return response.data;
}

async function queryNominatimReverse(lat, lon) {
  const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
    params: {
      lat,
      lon,
      format: 'json',
      addressdetails: 1
    },
    headers: {
      'User-Agent': 'Curator/1.0'
    }
  });
  return response.data;
}

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const queryLower = q.toLowerCase().trim();
    
    let searchQueries = [q];
    for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
      if (aliases.some(alias => queryLower.includes(alias))) {
        searchQueries = [...new Set([...searchQueries, ...aliases])];
        break;
      }
    }

    const allLocations = [];
    const seen = new Set();

    for (const searchQuery of searchQueries) {
      try {
        const data = await searchNominatim(searchQuery);

        if (data && data.length > 0) {
          data.forEach(result => {
            const address = result.address || {};
            
            const city = address.city || address.town || address.municipality || address.county;
            const locality = address.suburb || address.neighbourhood || address.locality || address.village;
            const state = address.state;
            
            if (city && !seen.has(city.toLowerCase())) {
              seen.add(city.toLowerCase());
              allLocations.push({
                name: city,
                type: 'city',
                state: state || '',
                displayName: result.display_name,
                lat: result.lat,
                lon: result.lon
              });
            }
            
            if (locality && !seen.has(locality.toLowerCase())) {
              seen.add(locality.toLowerCase());
              allLocations.push({
                name: locality,
                type: 'locality',
                city: city || '',
                state: state || '',
                displayName: result.display_name,
                lat: result.lat,
                lon: result.lon
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error searching for ${searchQuery}:`, err.message);
      }
    }

    allLocations.sort((a, b) => {
      if (a.type === 'city' && b.type !== 'city') return -1;
      if (a.type !== 'city' && b.type === 'city') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(allLocations.slice(0, 15));

  } catch (error) {
    console.error("Location search error:", error.message);
    res.status(500).json({ message: "Failed to search locations", error: error.message });
  }
});

router.get("/details", async (req, res) => {
  try {
    const { name, city } = req.query;
    
    if (!name || name.trim().length < 2) {
      return res.json({});
    }

    let queryStr = name;
    if (city) {
      queryStr = `${name}, ${city}, India`;
    } else {
      queryStr = `${name}, India`;
    }

    let locationData = {};
    const results = await searchNominatim(queryStr);
    
    if (results && results.length > 0) {
      const result = results[0];
      const address = result.address || {};
      locationData = {
        name: address.name || address.suburb || address.neighbourhood || name,
        displayName: result.display_name,
        lat: result.lat,
        lon: result.lon,
        pincode: address.postcode || '',
        city: address.city || address.town || address.municipality || '',
        state: address.state || '',
        type: result.type || 'locality'
      };
    }

    res.json(locationData);
  } catch (error) {
    console.error("Location details error:", error.message);
    res.json({});
  }
});

router.get("/areas", async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city || city.trim().length < 2) {
      return res.json([]);
    }

    const cityLower = city.toLowerCase().trim();
    
    let searchCity = city;
    for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
      if (aliases.some(alias => cityLower.includes(alias))) {
        searchCity = key;
        break;
      }
    }

    const cityResponse = await searchNominatim(searchCity);

    if (!cityResponse || cityResponse.length === 0) {
      return res.json([]);
    }

    const cityData = cityResponse[0];
    const boundingBox = cityData.boundingbox;

    if (!boundingBox || boundingBox.length < 4) {
      return res.json([]);
    }

    const viewbox = `${boundingBox[2]},${boundingBox[0]},${boundingBox[3]},${boundingBox[1]}`;
    const allAreas = [];
    const seen = new Set();
    
    const searchQueries = [
      `${searchCity} locality`,
      `${searchCity} area`,
      `${searchCity} neighbourhood`,
      `${searchCity} suburb`,
      `${searchCity} residential`,
      `${searchCity} layout`
    ];

    for (const searchQuery of searchQueries) {
      try {
        const areasResponse = await searchNominatim(searchQuery, viewbox, 1);

        if (areasResponse && areasResponse.length > 0) {
          areasResponse.forEach(result => {
            const address = result.address || {};
            const locality = address.suburb || address.neighbourhood || address.locality || address.village || address.town;
            
            if (locality && !seen.has(locality.toLowerCase())) {
              seen.add(locality.toLowerCase());
              allAreas.push({
                name: locality,
                type: 'locality',
                city: city,
                displayName: result.display_name,
                lat: result.lat,
                lon: result.lon
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error searching for ${searchQuery}:`, err.message);
      }
    }

    allAreas.sort((a, b) => a.name.localeCompare(b.name));

    let fallbackKey = cityLower;
    if (!CITY_LOCALITIES[fallbackKey]) {
      fallbackKey = searchCity.toLowerCase();
    }
    if (fallbackKey === 'bangalore' && CITY_LOCALITIES['bengaluru']) {
      fallbackKey = 'bengaluru';
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

    res.json(allAreas.slice(0, 30));

  } catch (error) {
    console.error("Areas search error:", error.message);
    
    const cityLower = city.toLowerCase().trim();
    let fallbackKey = cityLower;
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
      return res.json(allAreas.slice(0, 30));
    }
    
    res.status(500).json({ message: "Failed to search areas", error: error.message });
  }
});

module.exports = router;
