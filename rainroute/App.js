import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  Keyboard,
  ActivityIndicator,
  LogBox,
} from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons, Feather } from "@expo/vector-icons";

// Suppress known non-critical Expo development warnings on screen
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "Cannot connect to Expo CLI",
]);

// Components
import MapScreen from "./src/components/MapScreen";
import ActionButtons from "./src/components/ActionButtons";

// Services
import {
  getFastLocation,
  getAccurateLocation,
} from "./src/services/locationService";
import {
  openCameraAndGetBase64,
  uploadToCloudinary,
} from "./src/services/uploadService";
import {
  saveReportToDatabase,
  fetchActiveReports,
  getRouteFromOSRM,
  getDetourRoute,
  searchLocation,
} from "./src/services/apiService";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState({
    lat: 22.7196,
    lng: 75.8577,
  });
  const [customStartSelected, setCustomStartSelected] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  // Route state
  const [routeDetails, setRouteDetails] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [activeReports, setActiveReports] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0); // 0: recommended, 1: alternate

  const webViewRef = useRef(null);
  const mapReadyRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Auto-refresh active flood hazards every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (mapReadyRef.current) {
        loadWaterlogMarkers();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleMapReady = async () => {
    mapReadyRef.current = true;
    const coords = await getFastLocation();
    if (coords) {
      updateMapLocation(coords.latitude, coords.longitude);
    }
    await loadWaterlogMarkers();
  };

  const loadWaterlogMarkers = async () => {
    try {
      const reports = await fetchActiveReports();
      setActiveReports(reports);

      if (!webViewRef.current) return;

      const safeData = JSON.stringify(reports || []);

      const markerScript = `
        try {
          if (!window.map) { true; }
          if (window.waterlogLayer) {
            window.waterlogLayer.clearLayers(); 
          } else {
            window.waterlogLayer = L.layerGroup().addTo(map);
          }

          var reportsArray = ${safeData};
          var warningIcon = L.divIcon({
            className: 'hazard-icon',
            html: '<div class="hazard-marker-wrapper">' +
                  '<div class="hazard-pulse-ring"></div>' +
                  '<svg width="30" height="30" viewBox="0 0 24 24" fill="none">' +
                  '<path d="M12 2L1 21H23L12 2Z" fill="#EF4444" stroke="#ffffff" stroke-width="1.5"/>' +
                  '<path d="M12 9V14M12 17H12.01" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>' +
                  '</svg>' +
                  '</div>',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });

          reportsArray.forEach(function(report) {
            var popupHTML = "<div style='font-family:-apple-system,sans-serif; min-width:180px;'>" +
                              "<div style='display:flex; align-items:center; gap:6px; margin-bottom:6px;'>" +
                                "<span style='background:#FEE2E2; color:#DC2626; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;'>⚠️ WATERLOGGED</span>" +
                              "</div>" +
                              (report.imageUrl ? "<img src='" + report.imageUrl + "' style='width:100%; height:110px; object-fit:cover; border-radius:10px; margin-bottom:6px;' />" : "") +
                              "<div style='font-size:12px; color:#4B5563; line-height:1.3;'>Caution: Commuters reported waterlogging at this spot.</div>" +
                            "</div>";

            var marker = L.marker([report.latitude, report.longitude], { icon: warningIcon }).bindPopup(popupHTML);
            
            // 50m translucent danger buffer zone
            var dangerCircle = L.circle([report.latitude, report.longitude], {
              radius: 50,
              color: '#EF4444',
              fillColor: '#EF4444',
              fillOpacity: 0.18,
              weight: 1.5,
              dashArray: '4, 4'
            });

            window.waterlogLayer.addLayer(dangerCircle);
            window.waterlogLayer.addLayer(marker);
          });
        } catch(error) { console.error('Marker load error:', error); }
        true;
      `;
      webViewRef.current.injectJavaScript(markerScript);
    } catch (e) {
      console.warn("Failed to update waterlog markers:", e);
    }
  };

  const updateMapLocation = (lat, lng) => {
    setUserLocation({ lat, lng });
    if (webViewRef.current) {
      const jsCode = `
        try {
          if (window.map) {
            map.setView([${lat}, ${lng}], 15); 
            var pulseIcon = L.divIcon({
              className: 'user-pulse-marker',
              html: '<div class="user-pulse-container"><div class="user-pulse-ring"></div><div class="user-pulse-core"></div></div>',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            if (window.userMarker) {
              window.userMarker.setLatLng([${lat}, ${lng}]);
            } else {
              window.userMarker = L.marker([${lat}, ${lng}], { icon: pulseIcon }).addTo(map);
            }
          }
        } catch(e) { console.error('Set user location error:', e); }
        true;
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  };

  const drawRouteOnMap = (coordinates, isDangerous) => {
    if (!webViewRef.current || !coordinates) return;
    const safeCoords = JSON.stringify(coordinates);
    const routeColor = isDangerous ? "#EF4444" : "#2563EB";

    const routeScript = `
      try {
        if (!window.map) { true; }
        if (window.routeLayer) {
          map.removeLayer(window.routeLayer);
        }
        var latLngs = ${safeCoords}.map(function(coord) {
          return [coord[1], coord[0]];
        });

        window.routeLayer = L.polyline(latLngs, {
          color: '${routeColor}',
          weight: 6,
          opacity: 0.88,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        map.fitBounds(window.routeLayer.getBounds(), { padding: [60, 60] });
      } catch(error) { console.error('Route draw error:', error); }
      true;
    `;
    webViewRef.current.injectJavaScript(routeScript);
  };

  const clearCurrentRoute = () => {
    setRouteDetails(null);
    setDestinationCoords(null);
    setSelectedRouteIndex(0);
    if (webViewRef.current) {
      const clearScript = `
        try {
          if (window.routeLayer && window.map) {
            map.removeLayer(window.routeLayer);
            window.routeLayer = null;
          }
          if (typeof destinationMarker !== 'undefined' && destinationMarker && window.map) {
            map.removeLayer(destinationMarker);
            destinationMarker = null;
          }
          if (typeof startMarker !== 'undefined' && startMarker && window.map) {
            map.removeLayer(startMarker);
            startMarker = null;
          }
        } catch(e) {}
        true;
      `;
      webViewRef.current.injectJavaScript(clearScript);
    }
  };

  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) *
        Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkRouteSafety = (routeCoords) => {
    const HAZARD_RADIUS = 50; // meters
    let count = 0;
    let collidingHazard = null;

    for (let i = 0; i < routeCoords.length; i++) {
      const routeLng = routeCoords[i][0];
      const routeLat = routeCoords[i][1];
      for (let j = 0; j < activeReports.length; j++) {
        const hazard = activeReports[j];
        if (
          getDistanceInMeters(
            routeLat,
            routeLng,
            hazard.latitude,
            hazard.longitude
          ) < HAZARD_RADIUS
        ) {
          count++;
          if (!collidingHazard) collidingHazard = hazard;
        }
      }
    }
    return {
      isDangerous: count > 0,
      hazardPointsCount: count,
      collidingHazard,
    };
  };

  /**
   * Calculates route from start to destination, detects flood hazards,
   * and automatically finds or calculates a safe detour if blocked!
   */
  const calculateAndDrawRoute = async (destLat, destLng, customOrigin = null) => {
    const originLat = customOrigin ? customOrigin.lat : userLocation.lat;
    const originLng = customOrigin ? customOrigin.lng : userLocation.lng;

    setDestinationCoords({ lat: destLat, lng: destLng });

    const routeData = await getRouteFromOSRM(originLat, originLng, destLat, destLng);

    if (routeData && routeData.primary) {
      const primarySafety = checkRouteSafety(routeData.primary.coordinates);
      let alternativeRoutes = [];

      // Check if OSRM returned alternative routes
      if (routeData.alternatives && routeData.alternatives.length > 0) {
        for (let alt of routeData.alternatives) {
          const altSafety = checkRouteSafety(alt.coordinates);
          alternativeRoutes.push({
            id: alt.id,
            name: altSafety.isDangerous ? "Alternate Path" : "Safe Alternate",
            distance: (alt.distance / 1000).toFixed(1),
            duration: Math.ceil(alt.duration / 60),
            coordinates: alt.coordinates,
            isDangerous: altSafety.isDangerous,
            hazardCount: altSafety.hazardPointsCount,
          });
        }
      }

      // If the primary route has flood hazards, calculate an intelligent detour bypass
      if (primarySafety.isDangerous && primarySafety.collidingHazard) {
        const detour = await getDetourRoute(
          originLat,
          originLng,
          destLat,
          destLng,
          primarySafety.collidingHazard.latitude,
          primarySafety.collidingHazard.longitude
        );

        if (detour) {
          const detourSafety = checkRouteSafety(detour.coordinates);
          alternativeRoutes.push({
            id: "detour-safe",
            name: detourSafety.isDangerous ? "Alternate Detour" : "🛡️ Recommended Detour",
            distance: (detour.distance / 1000).toFixed(1),
            duration: Math.ceil(detour.duration / 60),
            coordinates: detour.coordinates,
            isDangerous: detourSafety.isDangerous,
            hazardCount: detourSafety.hazardPointsCount,
            isSafeDetour: !detourSafety.isDangerous,
          });
        }
      }

      // Prepare list of options:
      // If a safe alternative exists, put it first!
      const primaryRouteObj = {
        id: "primary",
        name: primarySafety.isDangerous ? "Direct (Hazardous)" : "Direct Route",
        distance: (routeData.primary.distance / 1000).toFixed(1),
        duration: Math.ceil(routeData.primary.duration / 60),
        coordinates: routeData.primary.coordinates,
        isDangerous: primarySafety.isDangerous,
        hazardCount: primarySafety.hazardPointsCount,
      };

      const allAvailableRoutes = [primaryRouteObj, ...alternativeRoutes];

      // Auto-select safe route if primary is blocked
      const safeIndex = allAvailableRoutes.findIndex((r) => !r.isDangerous);
      const chosenIndex = safeIndex !== -1 ? safeIndex : 0;
      const activeRoute = allAvailableRoutes[chosenIndex];

      setSelectedRouteIndex(chosenIndex);
      drawRouteOnMap(activeRoute.coordinates, activeRoute.isDangerous);

      setRouteDetails({
        routes: allAvailableRoutes,
        destLat,
        destLng,
        originLat,
        originLng,
      });

      if (activeRoute.isDangerous) {
        Toast.show({
          type: "error",
          text1: "⚠️ FLOOD HAZARD ON PATH",
          text2: `Route passes near ${activeRoute.hazardCount} waterlogged spot(s).`,
          position: "top",
          topOffset: 135, // Below search card, no overlap!
          visibilityTime: 4500,
        });
      } else {
        Toast.show({
          type: "success",
          text1: chosenIndex > 0 ? "🛡️ Safe Detour Found!" : "🛡️ Clear Route",
          text2: chosenIndex > 0 ? "Bypassing waterlogged area safely." : "No waterlogging reported on this path.",
          position: "top",
          topOffset: 135,
          visibilityTime: 3500,
        });
      }
    } else {
      setRouteDetails(null);
      Toast.show({
        type: "error",
        text1: "Routing Failed",
        text2: "Could not calculate a path. Please try again.",
        position: "top",
        topOffset: 135,
      });
    }
  };

  // Switch between primary route and alternative / detour routes
  const handleSelectRouteOption = (index) => {
    if (!routeDetails || !routeDetails.routes[index]) return;
    setSelectedRouteIndex(index);
    const selected = routeDetails.routes[index];
    drawRouteOnMap(selected.coordinates, selected.isDangerous);

    if (selected.isDangerous) {
      Toast.show({
        type: "error",
        text1: "⚠️ Warning: Route Has Waterlogging",
        text2: `Passes near ${selected.hazardCount} flooded hazard(s).`,
        position: "top",
        topOffset: 135,
        visibilityTime: 3000,
      });
    } else {
      Toast.show({
        type: "success",
        text1: "🛡️ Safe Route Selected",
        text2: "This path avoids all reported flood spots.",
        position: "top",
        topOffset: 135,
        visibilityTime: 2500,
      });
    }
  };

  // Debounced search when typing
  const handleQueryChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await searchLocation(text, userLocation);
      setSuggestions(results);
      setSearchLoading(false);
    }, 400);
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearchLoading(true);
    const results = await searchLocation(searchQuery, userLocation);
    if (results.length > 0) {
      setSuggestions(results);
    } else {
      setSuggestions([]);
      Toast.show({
        type: "info",
        text1: "No locations found",
        text2: "Try searching with a landmark or street name.",
        position: "top",
        topOffset: 135,
      });
    }
    setSearchLoading(false);
  };

  const selectSuggestion = async (item) => {
    Keyboard.dismiss();
    setSuggestions([]);
    setSearchQuery(item.title || item.name.split(",")[0]);

    const pinScript = `
      try {
        if (window.map) {
          if (typeof setDestinationMarker === 'function') {
            setDestinationMarker(${item.lat}, ${item.lng});
          }
          map.setView([${item.lat}, ${item.lng}], 15);
        }
      } catch(e) {}
      true;
    `;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(pinScript);
    }

    await calculateAndDrawRoute(item.lat, item.lng);
  };

  // Reset origin to real GPS
  const handleResetToGps = async () => {
    setLocationLoading(true);
    setCustomStartSelected(false);
    const coords = await getAccurateLocation();
    if (coords) {
      updateMapLocation(coords.latitude, coords.longitude);
      if (webViewRef.current) {
        // Clear start marker
        webViewRef.current.injectJavaScript(`
          if (typeof startMarker !== 'undefined' && startMarker && window.map) {
            map.removeLayer(startMarker);
            startMarker = null;
          }
          true;
        `);
      }
      // If a destination was already active, recalculate from GPS
      if (destinationCoords) {
        await calculateAndDrawRoute(destinationCoords.lat, destinationCoords.lng, {
          lat: coords.latitude,
          lng: coords.longitude,
        });
      }
      Toast.show({
        type: "info",
        text1: "GPS Reset",
        text2: "Start location reset to your GPS position.",
        position: "top",
        topOffset: 135,
        visibilityTime: 2000,
      });
    }
    setLocationLoading(false);
  };

  // Long-press handler: Sets custom start point AND updates route dynamically!
  const handleStartSelect = async (lat, lng) => {
    setCustomStartSelected(true);
    setUserLocation({ lat, lng });

    Toast.show({
      type: "info",
      text1: "📍 Custom Start Point Set",
      text2: destinationCoords ? "Recalculating route from new origin..." : "Long-pressed location set as route start.",
      position: "top",
      topOffset: 135,
      visibilityTime: 3000,
    });

    // If destination already exists, update route immediately!
    if (destinationCoords) {
      await calculateAndDrawRoute(destinationCoords.lat, destinationCoords.lng, { lat, lng });
    }
  };

  const handleReportPress = async () => {
    const base64Img = await openCameraAndGetBase64();
    if (!base64Img) return;
    setLoading(true);

    Toast.show({
      type: "info",
      text1: "Locking Coordinates...",
      text2: "Acquiring precision GPS tag for live map.",
      position: "bottom",
      bottomOffset: 120,
    });

    const strictCoords = await getAccurateLocation();
    if (!strictCoords) {
      setLoading(false);
      return;
    }

    const imageUrl = await uploadToCloudinary(base64Img);
    if (!imageUrl) {
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: "Could not upload photo. Check your connection.",
        position: "bottom",
        bottomOffset: 120,
      });
      setLoading(false);
      return;
    }

    const dbResponse = await saveReportToDatabase(
      strictCoords.latitude,
      strictCoords.longitude,
      imageUrl
    );
    if (!dbResponse) {
      Toast.show({
        type: "error",
        text1: "Server Offline",
        text2: "Could not reach database. Check backend server.",
        position: "bottom",
        bottomOffset: 120,
      });
      setLoading(false);
      return;
    }

    Toast.show({
      type: "success",
      text1: "Hazard Flagged! 🌧️",
      text2: "Waterlogged spot broadcast to all commuters.",
      position: "bottom",
      bottomOffset: 120,
    });
    setLoading(false);
    await loadWaterlogMarkers();
  };

  const currentRoute = routeDetails ? routeDetails.routes[selectedRouteIndex] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Floating Search & Brand Hub (Using View to eliminate SafeAreaView warning) */}
      <View style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.headerWrapper} pointerEvents="box-none">
          {/* Brand & Live Hazard Indicator */}
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandIcon}>🌧️</Text>
              <Text style={styles.brandText}>RainRoute</Text>
            </View>

            <View style={styles.headerRightActions}>
              {customStartSelected && (
                <TouchableOpacity
                  style={styles.customStartBadge}
                  onPress={handleResetToGps}
                  activeOpacity={0.8}
                >
                  <Ionicons name="locate" size={13} color="#059669" />
                  <Text style={styles.customStartText}>Use GPS Start</Text>
                </TouchableOpacity>
              )}

              {activeReports.length > 0 && (
                <View style={styles.hazardLiveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.hazardLiveText}>
                    {activeReports.length} {activeReports.length === 1 ? "Flood" : "Floods"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Search Card */}
          <View style={styles.searchCard}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search destination or address..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchLoading ? (
              <ActivityIndicator size="small" color="#2563eb" style={styles.searchAction} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                style={styles.searchAction}
              >
                <Feather name="x-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <View style={styles.dropdownCard}>
              <FlatList
                data={suggestions}
                keyExtractor={(_, index) => index.toString()}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionIconWrapper}>
                      <Ionicons name="location-sharp" size={18} color="#2563eb" />
                    </View>
                    <View style={styles.suggestionTextWrapper}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {item.title || item.name}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </View>

      {/* Main Interactive Map with 100% Free OpenStreetMap Tiles */}
      <MapScreen
        ref={webViewRef}
        onMapReady={handleMapReady}
        onStartSelect={handleStartSelect}
        onDestinationSelect={(lat, lng) => calculateAndDrawRoute(lat, lng)}
      />

      {/* Floating Action Controls - Automatically shifts position when route is active! */}
      <ActionButtons
        onLocationPress={handleResetToGps}
        onReportPress={handleReportPress}
        onRefreshPress={loadWaterlogMarkers}
        locationLoading={locationLoading}
        reportLoading={loading}
        hazardCount={activeReports.length}
        hasActiveRoute={!!routeDetails}
      />

      {/* User-Friendly Route Info & Alternative Route Switcher */}
      {routeDetails && currentRoute && (
        <View
          style={[
            styles.routePanel,
            currentRoute.isDangerous
              ? styles.routePanelDanger
              : styles.routePanelSafe,
          ]}
        >
          {/* Header Row */}
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleRow}>
              <Text
                style={[
                  styles.routeTitle,
                  currentRoute.isDangerous
                    ? styles.routeTitleDanger
                    : styles.routeTitleSafe,
                ]}
              >
                {currentRoute.isDangerous ? "Flood Warning" : "Route Safe"}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  currentRoute.isDangerous
                    ? styles.statusBadgeDanger
                    : styles.statusBadgeSafe,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    currentRoute.isDangerous
                      ? styles.statusBadgeTextDanger
                      : styles.statusBadgeTextSafe,
                  ]}
                >
                  {currentRoute.isDangerous
                    ? `⚠️ ${currentRoute.hazardCount} Waterlog Hazard(s)`
                    : "🛡️ Clear of Floods"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={clearCurrentRoute}
              style={styles.closeRouteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Alternative Routes Switcher Tabs */}
          {routeDetails.routes.length > 1 && (
            <View style={styles.routeTabsRow}>
              {routeDetails.routes.map((r, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.routeTab,
                    selectedRouteIndex === idx && styles.routeTabActive,
                    r.isDangerous ? styles.routeTabDangerBorder : styles.routeTabSafeBorder,
                  ]}
                  onPress={() => handleSelectRouteOption(idx)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.routeTabText,
                      selectedRouteIndex === idx && styles.routeTabTextActive,
                      r.isDangerous ? styles.routeTabDangerText : styles.routeTabSafeText,
                    ]}
                  >
                    {r.isDangerous ? "⚠️ Direct" : "🛡️ Detour"} ({r.duration}m)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Stats Summary Row */}
          <View style={styles.routeStatsRow}>
            <View style={styles.statBox}>
              <Ionicons name="navigate-circle-outline" size={17} color="#475569" />
              <Text style={styles.statValue}>{currentRoute.distance} km</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={17} color="#475569" />
              <Text style={styles.statValue}>{currentRoute.duration} mins</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons
                name={currentRoute.isDangerous ? "warning" : "shield-checkmark"}
                size={17}
                color={currentRoute.isDangerous ? "#dc2626" : "#16a34a"}
              />
              <Text
                style={[
                  styles.statValue,
                  {
                    color: currentRoute.isDangerous ? "#dc2626" : "#16a34a",
                    fontWeight: "700",
                  },
                ]}
              >
                {currentRoute.isDangerous ? "Flooded" : "Passable"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Global Toast component with safe high z-index and elevation */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 46,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  brandIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  brandText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customStartBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfdf5",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  customStartText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  hazardLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
    marginRight: 6,
  },
  hazardLiveText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
  },
  searchAction: {
    padding: 6,
  },
  dropdownCard: {
    backgroundColor: "#ffffff",
    marginTop: 6,
    borderRadius: 14,
    maxHeight: 220,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  suggestionTextWrapper: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },

  // User-Friendly Route Info Panel
  routePanel: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 18,
    padding: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    zIndex: 25,
  },
  routePanelSafe: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#86efac",
  },
  routePanelDanger: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  routeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  routeTitleSafe: {
    color: "#15803d",
  },
  routeTitleDanger: {
    color: "#b91c1c",
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusBadgeSafe: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeDanger: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadgeTextSafe: {
    color: "#166534",
  },
  statusBadgeTextDanger: {
    color: "#991b1b",
  },
  closeRouteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Route Alternate Tabs
  routeTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  routeTab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderWidth: 1.5,
  },
  routeTabActive: {
    backgroundColor: "#eff6ff",
  },
  routeTabSafeBorder: {
    borderColor: "#a7f3d0",
  },
  routeTabDangerBorder: {
    borderColor: "#fecaca",
  },
  routeTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  routeTabTextActive: {
    fontWeight: "800",
  },
  routeTabSafeText: {
    color: "#065f46",
  },
  routeTabDangerText: {
    color: "#991b1b",
  },

  routeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    paddingVertical: 8,
    borderRadius: 12,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#cbd5e1",
  },
});