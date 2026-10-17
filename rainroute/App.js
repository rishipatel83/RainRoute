import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  Keyboard,
  ActivityIndicator,
  LogBox,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

// Suppress known non-critical Expo development warnings
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "Cannot connect to Expo CLI",
]);

// Components
import MapScreen from "./src/components/MapScreen";
import ActionButtons from "./src/components/ActionButtons";
import ReportHazardModal, { HAZARD_TYPES } from "./src/components/ReportHazardModal";
import SosModal from "./src/components/SosModal";
import FaqModal from "./src/components/FaqModal";
import FeedbackModal from "./src/components/FeedbackModal";
import AdminModal from "./src/components/AdminModal";
import MenuDrawer from "./src/components/MenuDrawer";

// Services
import {
  getFastLocation,
  getAccurateLocation,
} from "./src/services/locationService";
import {
  captureHazardPhoto,
  uploadToCloudinary,
} from "./src/services/uploadService";
import {
  saveReportToDatabase,
  fetchActiveReports,
  getRouteFromOSRM,
  getDetourRoute,
  searchLocation,
  updateReportStatus,
  deleteReport,
} from "./src/services/apiService";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState({
    lat: 22.7196,
    lng: 75.8577,
  });
  const [customStartSelected, setCustomStartSelected] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Route & Navigation State
  const [routeDetails, setRouteDetails] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [activeReports, setActiveReports] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // Modals Visibility
  const [menuVisible, setMenuVisible] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Reporting Flow Temp State
  const [tempPhoto, setTempPhoto] = useState(null); // { uri, base64 }
  const [tempCoords, setTempCoords] = useState(null);

  // Admin Authentication State
  const [adminToken, setAdminToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  const webViewRef = useRef(null);
  const mapReadyRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Auto-refresh active hazards every 45 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (mapReadyRef.current) {
        loadWaterlogMarkers();
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [adminToken]);

  const handleMapReady = async () => {
    mapReadyRef.current = true;
    const coords = await getFastLocation();
    if (coords) {
      updateMapLocation(coords.latitude, coords.longitude);
    }
    await loadWaterlogMarkers();
  };

  /**
   * Loads hazards and plots rich multi-category markers on Leaflet
   */
  const loadWaterlogMarkers = async () => {
    try {
      const reports = await fetchActiveReports();
      setActiveReports(reports);

      if (!webViewRef.current) return;

      const safeData = JSON.stringify(reports || []);
      const isAdminActive = !!adminToken;

      const markerScript = `
        try {
          if (!window.map) { true; }
          if (window.waterlogLayer) {
            window.waterlogLayer.clearLayers(); 
          } else {
            window.waterlogLayer = L.layerGroup().addTo(map);
          }

          var reportsArray = ${safeData};
          var isAdmin = ${isAdminActive};

          // Palette and SVG icons by hazard type
          var iconConfigs = {
            waterlogging: { color: '#2563eb', bg: '#dbeafe', label: 'WATERLOGGED', icon: '🌊' },
            pothole: { color: '#d97706', bg: '#fef3c7', label: 'POTHOLE', icon: '🕳️' },
            construction: { color: '#ea580c', bg: '#ffedd5', label: 'CONSTRUCTION', icon: '🚧' },
            obstacle: { color: '#dc2626', bg: '#fee2e2', label: 'ROAD OBSTACLE', icon: '⛔' },
            accident: { color: '#9333ea', bg: '#f3e8ff', label: 'ACCIDENT', icon: '💥' },
            other: { color: '#475569', bg: '#f1f5f9', label: 'HAZARD', icon: '⚠️' }
          };

          reportsArray.forEach(function(report) {
            var hType = report.hazardType || 'waterlogging';
            var cfg = iconConfigs[hType] || iconConfigs.other;

            var hazardIcon = L.divIcon({
              className: 'hazard-custom-pin',
              html: '<div class="hazard-marker-wrapper">' +
                    '<div class="hazard-pulse-ring" style="background:' + cfg.color + '40;"></div>' +
                    '<div style="width:34px; height:34px; border-radius:17px; background:' + cfg.color + '; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35); border:2.5px solid #ffffff; font-size:16px;">' +
                    cfg.icon +
                    '</div>' +
                    '</div>',
              iconSize: [42, 42],
              iconAnchor: [21, 21]
            });

            var adminButtonsHtml = '';
            if (isAdmin) {
              adminButtonsHtml = "<div style='display:flex; gap:6px; margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0;'>" +
                "<button onclick=\\"triggerHazardAction('resolve', '" + report._id + "')\\" style='flex:1; background:#16a34a; color:#fff; border:none; border-radius:6px; padding:6px 0; font-size:11px; font-weight:700; cursor:pointer;'>✓ Mark Fixed</button>" +
                "<button onclick=\\"triggerHazardAction('delete', '" + report._id + "')\\" style='background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer;'>🗑️</button>" +
              "</div>";
            }

            var popupHTML = "<div style='font-family:-apple-system,BlinkMacSystemFont,sans-serif; min-width:210px; max-width:250px;'>" +
                              (report.imageUrl ? "<img src='" + report.imageUrl + "' style='width:100%; height:110px; object-fit:cover; display:block;' />" : "") +
                              "<div style='padding:12px;'>" +
                                "<div style='display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;'>" +
                                  "<span style='background:" + cfg.bg + "; color:" + cfg.color + "; font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; letter-spacing:0.4px;'>" + cfg.label + "</span>" +
                                  "<span style='font-size:10px; font-weight:600; color:#64748b; text-transform:capitalize;'>" + (report.severity || 'Medium') + "</span>" +
                                "</div>" +
                                (report.description ? "<div style='font-size:12px; color:#1e293b; font-weight:600; margin-bottom:4px; line-height:1.3;'>" + report.description + "</div>" : "") +
                                "<div style='font-size:11px; color:#64748b; margin-top:4px;'>📍 (" + report.latitude.toFixed(4) + ", " + report.longitude.toFixed(4) + ")</div>" +
                                adminButtonsHtml +
                              "</div>" +
                            "</div>";

            var marker = L.marker([report.latitude, report.longitude], { icon: hazardIcon }).bindPopup(popupHTML);
            
            // 50m translucent danger buffer zone
            var dangerCircle = L.circle([report.latitude, report.longitude], {
              radius: 50,
              color: cfg.color,
              fillColor: cfg.color,
              fillOpacity: 0.16,
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

  /**
   * Bridge callback when admin clicks actions inside the Leaflet map popup
   */
  const handleHazardActionFromMap = async (action, reportId) => {
    if (!adminToken) {
      Toast.show({
        type: "error",
        text1: "Admin Login Required",
        text2: "Open Menu > Admin Portal to authenticate.",
      });
      return;
    }

    if (action === "resolve") {
      try {
        await updateReportStatus(reportId, "resolved", adminToken);
        Toast.show({
          type: "success",
          text1: "Hazard Marked Fixed! 🛠️",
          text2: "Report status set to resolved.",
        });
        await loadWaterlogMarkers();
      } catch (e) {
        Toast.show({ type: "error", text1: "Update Failed", text2: e.message });
      }
    } else if (action === "delete") {
      try {
        await deleteReport(reportId, adminToken);
        Toast.show({
          type: "success",
          text1: "Hazard Removed 🗑️",
          text2: "Report permanently deleted.",
        });
        await loadWaterlogMarkers();
      } catch (e) {
        Toast.show({ type: "error", text1: "Delete Failed", text2: e.message });
      }
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

        map.fitBounds(window.routeLayer.getBounds(), { padding: [70, 70] });
      } catch(error) { console.error('Route draw error:', error); }
      true;
    `;
    webViewRef.current.injectJavaScript(routeScript);
  };

  const clearCurrentRoute = () => {
    setRouteDetails(null);
    setDestinationCoords(null);
    setSelectedRouteIndex(0);
    setIsNavigating(false);
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
    const HAZARD_RADIUS = 60; // 60 meters proximity buffer
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

  const calculateAndDrawRoute = async (destLat, destLng, customOrigin = null) => {
    const originLat = customOrigin ? customOrigin.lat : userLocation.lat;
    const originLng = customOrigin ? customOrigin.lng : userLocation.lng;

    setDestinationCoords({ lat: destLat, lng: destLng });

    const routeData = await getRouteFromOSRM(originLat, originLng, destLat, destLng);

    if (routeData && routeData.primary) {
      const primarySafety = checkRouteSafety(routeData.primary.coordinates);
      let alternativeRoutes = [];

      // Check alternative routes from OSRM
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

      // If the primary route has hazards, calculate an intelligent detour bypass
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

      const primaryRouteObj = {
        id: "primary",
        name: primarySafety.isDangerous ? "Direct Path" : "Direct Route",
        distance: (routeData.primary.distance / 1000).toFixed(1),
        duration: Math.ceil(routeData.primary.duration / 60),
        coordinates: routeData.primary.coordinates,
        isDangerous: primarySafety.isDangerous,
        hazardCount: primarySafety.hazardPointsCount,
      };

      const allAvailableRoutes = [primaryRouteObj, ...alternativeRoutes];
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
          text1: "⚠️ HAZARD DETECTED ON ROUTE",
          text2: `Path enters proximity of ${activeRoute.hazardCount} hazard(s).`,
          position: "top",
          topOffset: 125,
          visibilityTime: 4500,
        });
      } else {
        Toast.show({
          type: "success",
          text1: chosenIndex > 0 ? "🛡️ Safe Detour Active" : "🛡️ Clear & Passable Route",
          text2: chosenIndex > 0 ? "Bypassing waterlogged hazard zone." : "No hazards reported on this route.",
          position: "top",
          topOffset: 125,
          visibilityTime: 3500,
        });
      }
    } else {
      setRouteDetails(null);
      Toast.show({
        type: "error",
        text1: "Routing Failed",
        text2: "Could not calculate a path. Check network connection.",
        position: "top",
        topOffset: 125,
      });
    }
  };

  const handleSelectRouteOption = (index) => {
    if (!routeDetails || !routeDetails.routes[index]) return;
    setSelectedRouteIndex(index);
    const selected = routeDetails.routes[index];
    drawRouteOnMap(selected.coordinates, selected.isDangerous);
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
        topOffset: 125,
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
        webViewRef.current.injectJavaScript(`
          if (typeof startMarker !== 'undefined' && startMarker && window.map) {
            map.removeLayer(startMarker);
            startMarker = null;
          }
          true;
        `);
      }
      if (destinationCoords) {
        await calculateAndDrawRoute(destinationCoords.lat, destinationCoords.lng, {
          lat: coords.latitude,
          lng: coords.longitude,
        });
      }
      Toast.show({
        type: "info",
        text1: "GPS Reset",
        text2: "Start location reset to current GPS position.",
        position: "top",
        topOffset: 125,
        visibilityTime: 2000,
      });
    }
    setLocationLoading(false);
  };

  // Long-press handler: Sets custom start point
  const handleStartSelect = async (lat, lng) => {
    setCustomStartSelected(true);
    setUserLocation({ lat, lng });

    Toast.show({
      type: "info",
      text1: "📍 Custom Start Point Set",
      text2: destinationCoords ? "Recalculating route from new origin..." : "Point set as route origin.",
      position: "top",
      topOffset: 125,
      visibilityTime: 3000,
    });

    if (destinationCoords) {
      await calculateAndDrawRoute(destinationCoords.lat, destinationCoords.lng, { lat, lng });
    }
  };

  /**
   * User taps "Report Hazard" -> Capture photo, lock GPS, open customization modal
   */
  const handleReportPress = async () => {
    const photo = await captureHazardPhoto();
    if (!photo) return;

    setLoading(true);
    Toast.show({
      type: "info",
      text1: "Locking Coordinates...",
      text2: "Acquiring precision GPS tag for report.",
      position: "bottom",
      bottomOffset: 120,
    });

    const strictCoords = await getAccurateLocation();
    setLoading(false);

    if (!strictCoords) {
      return;
    }

    setTempPhoto(photo);
    setTempCoords(strictCoords);
    setReportModalVisible(true);
  };

  /**
   * User submits hazard report from ReportHazardModal
   */
  const handleHazardModalSubmit = async ({ hazardType, severity, description }) => {
    if (!tempPhoto || !tempCoords) return;

    setLoading(true);
    Toast.show({
      type: "info",
      text1: "Broadcasting Hazard...",
      text2: "Optimizing image & publishing to live map.",
      position: "bottom",
      bottomOffset: 120,
    });

    const imageUrl = await uploadToCloudinary(tempPhoto.base64);
    if (!imageUrl) {
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: "Could not upload image to CDN. Try again.",
        position: "bottom",
        bottomOffset: 120,
      });
      setLoading(false);
      return;
    }

    const typeMeta = HAZARD_TYPES.find((h) => h.id === hazardType);
    const dbResponse = await saveReportToDatabase(
      tempCoords.latitude,
      tempCoords.longitude,
      imageUrl,
      {
        hazardType,
        severity,
        description,
        title: typeMeta ? typeMeta.label : "Hazard Report",
      }
    );

    setLoading(false);
    setReportModalVisible(false);
    setTempPhoto(null);
    setTempCoords(null);

    if (!dbResponse) {
      Toast.show({
        type: "error",
        text1: "Database Offline",
        text2: "Could not persist report to backend server.",
        position: "bottom",
        bottomOffset: 120,
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "Hazard Published! 🚀",
      text2: "Report broadcasted to all commuters in real-time.",
      position: "bottom",
      bottomOffset: 120,
    });

    await loadWaterlogMarkers();
  };

  const currentRoute = routeDetails ? routeDetails.routes[selectedRouteIndex] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Google Maps Style Floating Navigation & Search Bar */}
      <View style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.searchBarWrapper}>
          <View style={styles.googleSearchCard}>
            {/* Hamburger Menu Button */}
            <TouchableOpacity
              style={styles.menuIconBtn}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color="#334155" />
            </TouchableOpacity>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search destination or address..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />

            {/* Clear Query or Live Reports Pill */}
            {searchLoading ? (
              <ActivityIndicator size="small" color="#2563eb" style={styles.searchRightAction} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                style={styles.searchRightAction}
              >
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.liveReportsPill}
                onPress={() => setAdminVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.livePulseDot} />
                <Text style={styles.liveReportsText}>
                  {activeReports.length} {activeReports.length === 1 ? "Report" : "Reports"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sub-bar for Custom GPS Start reset */}
          {customStartSelected && (
            <TouchableOpacity
              style={styles.customStartSubBar}
              onPress={handleResetToGps}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={13} color="#059669" />
              <Text style={styles.customStartText}>Custom Origin Active • Tap to restore GPS</Text>
            </TouchableOpacity>
          )}

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

      {/* Main Interactive Leaflet Map */}
      <MapScreen
        ref={webViewRef}
        onMapReady={handleMapReady}
        onStartSelect={handleStartSelect}
        onDestinationSelect={(lat, lng) => calculateAndDrawRoute(lat, lng)}
        onHazardAction={handleHazardActionFromMap}
      />

      {/* Floating Action Controls */}
      <ActionButtons
        onLocationPress={handleResetToGps}
        onReportPress={handleReportPress}
        onRefreshPress={loadWaterlogMarkers}
        onSosPress={() => setSosVisible(true)}
        locationLoading={locationLoading}
        reportLoading={loading}
        hazardCount={activeReports.length}
        hasActiveRoute={!!routeDetails}
      />

      {/* Production Google Maps Navigation Sheet */}
      {routeDetails && currentRoute && (
        <View style={styles.navBottomCard}>
          {/* Active Navigation Simulated Turn Banner */}
          {isNavigating && (
            <View style={styles.turnByTurnBanner}>
              <View style={styles.turnIconWrap}>
                <MaterialCommunityIcons name="arrow-up-right-bold" size={26} color="#ffffff" />
              </View>
              <View style={styles.turnTextWrap}>
                <Text style={styles.turnTitle}>In 350 meters, keep right</Text>
                <Text style={styles.turnSub}>Continue along elevated bypass corridor</Text>
              </View>
            </View>
          )}

          {/* Main Route Header & ETA */}
          <View style={styles.navCardHeader}>
            <View style={styles.etaContainer}>
              <View style={styles.etaRow}>
                <Text
                  style={[
                    styles.etaMinutes,
                    currentRoute.isDangerous ? styles.etaDanger : styles.etaSafe,
                  ]}
                >
                  {currentRoute.duration} min
                </Text>
                <Text style={styles.etaDistance}>({currentRoute.distance} km)</Text>
              </View>
              <Text style={styles.viaRouteName}>
                {selectedRouteIndex === 0 ? "Fastest route with typical traffic" : "Safe alternate detour"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={clearCurrentRoute}
              style={styles.navCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Route Safety Condition Banner */}
          <View
            style={[
              styles.safetyNoticeBanner,
              currentRoute.isDangerous
                ? styles.safetyNoticeDanger
                : styles.safetyNoticeSafe,
            ]}
          >
            <Ionicons
              name={currentRoute.isDangerous ? "warning" : "shield-checkmark"}
              size={18}
              color={currentRoute.isDangerous ? "#dc2626" : "#16a34a"}
            />
            <Text
              style={[
                styles.safetyNoticeText,
                currentRoute.isDangerous
                  ? styles.safetyNoticeTextDanger
                  : styles.safetyNoticeTextSafe,
              ]}
            >
              {currentRoute.isDangerous
                ? `Caution: ${currentRoute.hazardCount} active hazard(s) on this path.`
                : "Route verified: No waterlogging or obstacles reported."}
            </Text>
          </View>

          {/* Alternative Routes Selector Pills */}
          {routeDetails.routes.length > 1 && (
            <View style={styles.routeSelectorPills}>
              {routeDetails.routes.map((r, idx) => {
                const isSelected = selectedRouteIndex === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.routePill,
                      isSelected && styles.routePillSelected,
                      r.isDangerous ? styles.routePillDanger : styles.routePillSafe,
                    ]}
                    onPress={() => handleSelectRouteOption(idx)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.routePillText,
                        isSelected && styles.routePillTextSelected,
                        r.isDangerous ? { color: "#dc2626" } : { color: "#16a34a" },
                      ]}
                    >
                      {r.isDangerous ? "⚠️ Direct" : "🛡️ Detour"} • {r.duration}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Action Row: Start Navigation & SOS Quick trigger */}
          <View style={styles.navActionsRow}>
            <TouchableOpacity
              style={[
                styles.startNavBtn,
                isNavigating && styles.stopNavBtn,
              ]}
              onPress={() => setIsNavigating(!isNavigating)}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={isNavigating ? "pause" : "navigation"}
                size={22}
                color="#ffffff"
              />
              <Text style={styles.startNavText}>
                {isNavigating ? "Stop Navigation" : "Start Navigation"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sosNavBtn}
              onPress={() => setSosVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="emergency" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Feature Modals */}
      <ReportHazardModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleHazardModalSubmit}
        loading={loading}
        imageUri={tempPhoto?.uri}
        onRetakePhoto={handleReportPress}
        coords={tempCoords}
      />

      <SosModal
        visible={sosVisible}
        onClose={() => setSosVisible(false)}
        userCoords={userLocation}
      />

      <FaqModal
        visible={faqVisible}
        onClose={() => setFaqVisible(false)}
      />

      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />

      <AdminModal
        visible={adminVisible}
        onClose={() => setAdminVisible(false)}
        adminToken={adminToken}
        adminUser={adminUser}
        onLoginSuccess={(token, user) => {
          setAdminToken(token);
          setAdminUser(user);
        }}
        onLogout={() => {
          setAdminToken(null);
          setAdminUser(null);
        }}
        onDataChanged={loadWaterlogMarkers}
      />

      <MenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onOpenSos={() => setSosVisible(true)}
        onOpenFaq={() => setFaqVisible(true)}
        onOpenFeedback={() => setFeedbackVisible(true)}
        onOpenAdmin={() => setAdminVisible(true)}
        isAdmin={!!adminToken}
        reportCount={activeReports.length}
      />

      {/* Global Toast Component */}
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
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 48,
  },
  googleSearchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    paddingHorizontal: 8,
    height: 52,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  menuIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
    paddingHorizontal: 8,
  },
  searchRightAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  liveReportsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 4,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
    marginRight: 6,
  },
  liveReportsText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  customStartSubBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ecfdf5",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  customStartText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  dropdownCard: {
    backgroundColor: "#ffffff",
    marginTop: 6,
    borderRadius: 18,
    maxHeight: 240,
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

  // Google Maps Style Navigation Bottom Card
  navBottomCard: {
    position: "absolute",
    bottom: 20,
    left: 14,
    right: 14,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    zIndex: 25,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  turnByTurnBanner: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  turnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  turnTextWrap: {
    flex: 1,
  },
  turnTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  turnSub: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 1,
  },
  navCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  etaContainer: {
    flex: 1,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  etaMinutes: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  etaSafe: {
    color: "#15803d",
  },
  etaDanger: {
    color: "#dc2626",
  },
  etaDistance: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },
  viaRouteName: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  navCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  safetyNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  safetyNoticeSafe: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  safetyNoticeDanger: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  safetyNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  safetyNoticeTextSafe: {
    color: "#166534",
  },
  safetyNoticeTextDanger: {
    color: "#991b1b",
  },
  routeSelectorPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  routePill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    alignItems: "center",
  },
  routePillSelected: {
    backgroundColor: "#eff6ff",
  },
  routePillSafe: {
    borderColor: "#a7f3d0",
  },
  routePillDanger: {
    borderColor: "#fecaca",
  },
  routePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  routePillTextSelected: {
    fontWeight: "800",
  },
  navActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  startNavBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 3,
  },
  stopNavBtn: {
    backgroundColor: "#475569",
  },
  startNavText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  sosNavBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff5f5",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    justifyContent: "center",
    alignItems: "center",
  },
});