// src/services/apiService.js
import Constants from 'expo-constants';

/**
 * Dynamically resolves the development machine's IP address.
 * Expo Go communicates with the dev server via hostUri (e.g. 10.76.19.42:8081).
 * We extract that IP so the app automatically works across any Wi-Fi network without manual config.
 */
const resolveDevHost = () => {
  try {
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri && typeof hostUri === 'string') {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:3000/api`;
      }
    }
  } catch (e) {
    console.warn('Could not auto-resolve Expo hostUri:', e);
  }
  // Fallback to active verified local IP
  return 'http://10.76.19.42:3000/api';
};

export const DEFAULT_BASE_API_URL = resolveDevHost();
let activeBaseUrl = DEFAULT_BASE_API_URL;

export const setServerUrl = (url) => {
  if (url && typeof url === 'string') {
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.endsWith('/reports')) {
      clean = clean.replace(/\/reports$/, '');
    }
    if (!clean.endsWith('/api') && !clean.includes('/api/')) {
      clean = `${clean}/api`;
    }
    activeBaseUrl = clean;
  }
};

export const getServerUrl = () => `${activeBaseUrl}/reports`;
export const getBaseApiUrl = () => activeBaseUrl;

// Helper to perform fetch with a timeout
const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
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

/**
 * Public: Save a new hazard report
 */
export const saveReportToDatabase = async (latitude, longitude, imageUrl, hazardData = {}) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/reports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          imageUrl,
          hazardType: hazardData.hazardType || 'waterlogging',
          title: hazardData.title || '',
          description: hazardData.description || '',
          severity: hazardData.severity || 'medium',
        }),
      },
      14000
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

/**
 * Public: Fetch active hazards
 */
export const fetchActiveReports = async () => {
  try {
    const response = await fetchWithTimeout(`${activeBaseUrl}/reports`, {}, 10000);
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

/**
 * Admin: Authenticate with username/password
 */
export const adminLogin = async (username, password) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      },
      10000
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }
    return data; // { success: true, token, admin }
  } catch (error) {
    console.warn('⚠️ Admin Login Failed:', error.message || error);
    throw error;
  }
};

/**
 * Admin: Mark a hazard as resolved or update status
 */
export const updateReportStatus = async (reportId, status, token) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/reports/${reportId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      },
      10000
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Status update failed');
    }
    return data;
  } catch (error) {
    console.warn('⚠️ Update Status Failed:', error.message || error);
    throw error;
  }
};

/**
 * Admin: Delete a hazard report permanently
 */
export const deleteReport = async (reportId, token) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/reports/${reportId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      10000
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Delete failed');
    }
    return data;
  } catch (error) {
    console.warn('⚠️ Delete Report Failed:', error.message || error);
    throw error;
  }
};

/**
 * Admin: Fetch all reports including resolved
 */
export const fetchAdminReports = async (token) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/reports/all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      10000
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch admin reports');
    }
    return data.reports || [];
  } catch (error) {
    console.warn('⚠️ Fetch Admin Reports Failed:', error.message || error);
    return [];
  }
};

/**
 * Public: Submit user feedback
 */
export const submitFeedback = async ({ rating, category, message, contactEmail }) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, category, message, contactEmail }),
      },
      10000
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Feedback submission failed');
    }
    return data;
  } catch (error) {
    console.warn('⚠️ Submit Feedback Failed:', error.message || error);
    throw error;
  }
};

/**
 * Admin: Fetch all community feedback submissions
 */
export const fetchAdminFeedbacks = async (token) => {
  try {
    const response = await fetchWithTimeout(
      `${activeBaseUrl}/feedback`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      10000
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch admin feedback');
    }
    return data.feedbacks || [];
  } catch (error) {
    console.warn('⚠️ Fetch Admin Feedbacks Failed:', error.message || error);
    return [];
  }
};


/**
 * Routing via OSRM
 */
export const getRouteFromOSRM = async (startLat, startLng, destLat, destLng) => {
  try {
    const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}_${destLat.toFixed(4)},${destLng.toFixed(4)}`;
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey);
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetchWithTimeout(url, {}, 9000);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const allRoutes = data.routes.map((r, idx) => ({
        id: idx,
        coordinates: r.geometry.coordinates,
        distance: r.distance,
        duration: r.duration,
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
 * Calculates a detour route bypassing a specific hazard cluster
 */
export const getDetourRoute = async (startLat, startLng, destLat, destLng, hazardLat, hazardLng) => {
  try {
    const dLat = destLat - startLat;
    const dLng = destLng - startLng;
    const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
    const offsetMagnitude = 0.005; // ~500 meters
    const detourLat = hazardLat - (dLng / len) * offsetMagnitude;
    const detourLng = hazardLng + (dLat / len) * offsetMagnitude;

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${detourLng.toFixed(5)},${detourLat.toFixed(5)};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetchWithTimeout(url, {}, 9000);
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

/**
 * Geocoding via Nominatim OpenStreetMap
 */
export const searchLocation = async (query, userCoords = null) => {
  try {
    if (!query || !query.trim()) return [];

    let cleanQuery = query.trim();
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=6&addressdetails=1`;
    
    if (userCoords && userCoords.lat && userCoords.lng) {
      const delta = 0.5;
      const viewbox = `${userCoords.lng - delta},${userCoords.lat + delta},${userCoords.lng + delta},${userCoords.lat - delta}`;
      url += `&viewbox=${viewbox}&bounded=0`;
    } else if (!cleanQuery.toLowerCase().includes('indore') && !cleanQuery.includes(',')) {
      url += `&countrycodes=in`;
    }

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent': 'RainRouteNavigation/2.0',
        },
      },
      8000
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