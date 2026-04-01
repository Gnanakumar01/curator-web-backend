const axios = require('axios');

/**
 * Geocode an address using Nominatim (OpenStreetMap)
 * @param {string} address - The address to geocode
 * @returns {Promise<{latitude: number|null, longitude: number|null, displayName: string|null}>}
 */
async function geocodeAddress(address) {
  if (!address) {
    return { latitude: null, longitude: null, displayName: null };
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'in', // Restrict to India
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'Qurator/1.0' // Required by Nominatim usage policy
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name
      };
    }

    return { latitude: null, longitude: null, displayName: null };
  } catch (error) {
    console.error('Nominatim geocoding error:', error.message);
    return { latitude: null, longitude: null, displayName: null };
  }
}

/**
 * Reverse geocode coordinates to get address using Nominatim
 * @param {number} latitude - The latitude
 * @param {number} longitude - The longitude
 * @returns {Promise<{displayName: string|null, address: object|null}>}
 */
async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) {
    return { displayName: null, address: null };
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'Qurator/1.0' // Required by Nominatim usage policy
      }
    });

    if (response.data && response.data.display_name) {
      return {
        displayName: response.data.display_name,
        address: response.data.address || null
      };
    }

    return { displayName: null, address: null };
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error.message);
    return { displayName: null, address: null };
  }
}

/**
 * Build a full address string from store data
 * @param {object} storeData - Store data object
 * @returns {string} - Full address string
 */
function buildFullAddress(storeData) {
  const parts = [];
  
  if (storeData.storeAddressLine) parts.push(storeData.storeAddressLine);
  if (storeData.storeLocality) parts.push(storeData.storeLocality);
  if (storeData.storeCity) parts.push(storeData.storeCity);
  if (storeData.storeState) parts.push(storeData.storeState);
  if (storeData.storePincode) parts.push(storeData.storePincode);
  
  return parts.join(', ');
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  buildFullAddress
};
