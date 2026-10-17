// src/services/apiService.js

// Default backend server URL for local network testing
export const DEFAULT_SERVER_URL = 'http://10.253.158.42:3000/api/reports';
let activeServerUrl = DEFAULT_SERVER_URL;

export const setServerUrl = (url) => {
  if (url && typeof url === 'string') {
    activeServerUrl = url.trim();
  }
};

export const getServerUrl = () => activeServerUrl;

// Helper to perform fetch with a timeout
const fetchWithTimeout = async (url, options = {}, timeoutMs = 7000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

// In-memory cache for routing to avoid redundant network requests
const routeCache = new Map();

export const saveReportToDatabase = async (latitude, longitude, imageUrl) => {
  try {
    const response = await fetchWithTimeout(
      activeServerUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude, imageUrl }),
      },
      8000
    );

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ API Report Save Failed:', error.message || error);
    return null;
  }
};

export const fetchActiveReports = async () => {
  try {
    const response = await fetchWithTimeout(activeServerUrl, {}, 5000);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    const reports = await response.json();
    return Array.isArray(reports) ? reports : [];
  } catch (error) {
    console.warn('⚠️ Could not reach hazard backend server:', error.message || error);
    return [];
  }
};

export const getRouteFromOSRM = async (startLat, startLng, destLat, destLng) => {
  try {
    const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}_${destLat.toFixed(4)},${destLng.toFixed(4)}`;
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey);
    }

    // Request full route with alternative route options from OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetchWithTimeout(url, {}, 8000);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const allRoutes = data.routes.map((r, idx) => ({
        id: idx,
        coordinates: r.geometry.coordinates,
        distance: r.distance, // in meters
        duration: r.duration, // in seconds
      }));

      const result = {
        primary: allRoutes[0],
        alternatives: allRoutes.slice(1),
        allRoutes: allRoutes,
      };

      if (routeCache.size > 25) {
        const firstKey = routeCache.keys().next().value;
        routeCache.delete(firstKey);
      }
      routeCache.set(cacheKey, result);

      return result;
    }
    return null;
  } catch (error) {
    console.error('❌ OSRM Routing Failed:', error.message || error);
    return null;
  }
};

/**
 * Calculates a detour route bypassing a specific flood hazard cluster
 */
export const getDetourRoute = async (startLat, startLng, destLat, destLng, hazardLat, hazardLng) => {
  try {
    // Calculate a perpendicular offset waypoint (~450 meters away from the flood spot)
    const dLat = destLat - startLat;
    const dLng = destLng - startLng;
    const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
    // Perpendicular vector (-dLng, dLat)
    const offsetMagnitude = 0.005; // ~500 meters in degrees
    const detourLat = hazardLat - (dLng / len) * offsetMagnitude;
    const detourLng = hazardLng + (dLat / len) * offsetMagnitude;

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${detourLng.toFixed(5)},${detourLat.toFixed(5)};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetchWithTimeout(url, {}, 8000);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      return {
        id: 'detour',
        isDetour: true,
        coordinates: data.routes[0].geometry.coordinates,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
      };
    }
    return null;
  } catch (err) {
    console.warn('⚠️ Detour calculation failed:', err.message);
    return null;
  }
};

export const searchLocation = async (query, userCoords = null) => {
  try {
    if (!query || !query.trim()) return [];

    let cleanQuery = query.trim();
    // If no city specified in query, prioritize around current location or Indore
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=6&addressdetails=1`;
    
    if (userCoords && userCoords.lat && userCoords.lng) {
      const delta = 0.5; // ~55km bounding box around user
      const viewbox = `${userCoords.lng - delta},${userCoords.lat + delta},${userCoords.lng + delta},${userCoords.lat - delta}`;
      url += `&viewbox=${viewbox}&bounded=0`;
    } else if (!cleanQuery.toLowerCase().includes('indore') && !cleanQuery.includes(',')) {
      // Default convenience fallback
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', Indore')}&limit=6&addressdetails=1`;
    }

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent': 'RainRouteNavigation/2.0',
        },
      },
      6000
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return data.map((item) => {
        const parts = (item.display_name || '').split(',').map((p) => p.trim());
        const title = parts[0] || 'Location';
        const subtitle = parts.slice(1, 4).join(', ');

        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          name: item.display_name,
          title: title,
          subtitle: subtitle,
        };
      });
    }
    return [];
  } catch (error) {
    console.error('❌ Geocoding Failed:', error.message || error);
    return [];
  }
};