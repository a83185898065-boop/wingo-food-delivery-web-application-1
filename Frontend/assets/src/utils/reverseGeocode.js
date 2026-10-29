const getUniqueParts = (parts) => {
  const seen = new Set();
  return parts.filter((part) => {
    if (!part) return false;
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizePlace = (place) => {
  const city =
    place.city ||
    place.town ||
    place.village ||
    place.municipality ||
    place.locality ||
    '';
  const area =
    place.neighbourhood ||
    place.suburb ||
    place.quarter ||
    place.district ||
    place.county ||
    place.road ||
    '';
  const state = place.state || place.state_district || '';
  const country = place.country || '';
  const formatted =
    getUniqueParts([area, city, state, country]).join(', ') ||
    place.formatted ||
    '';

  return { area, city, state, country, formatted };
};

export async function reverseGeocode(latitude, longitude, apiKey, signal) {
  let geoapifyError;

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: 'json',
        apiKey,
      });
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?${params}`,
        { signal }
      );
      if (!response.ok) {
        throw new Error(`Geoapify reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      const result = data.results?.[0] || data.features?.[0];
      const properties = result?.properties || result;
      if (properties) {
        const place = normalizePlace(properties);
        if (place.city || place.formatted) return place;
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      geoapifyError = error;
      console.warn('Geoapify reverse geocoding unavailable; trying OpenStreetMap.', error);
    }
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      lat: String(latitude),
      lon: String(longitude),
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      { signal, headers: { 'Accept-Language': navigator.language || 'en' } }
    );
    if (!response.ok) {
      throw new Error(`OpenStreetMap reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    const place = normalizePlace(data.address || {});
    if (place.city || place.formatted || data.display_name) {
      return { ...place, formatted: place.formatted || data.display_name };
    }
    throw new Error('No place name was returned for these coordinates.');
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Reverse geocoding failed for all available providers:', {
      geoapifyError,
      openStreetMapError: error,
    });
    throw new Error('Could not resolve a place name for the current location.');
  }
}
