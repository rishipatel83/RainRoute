import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

const WINDOW_HEIGHT = Dimensions.get("window").height;

export const getWeatherMeta = (code = 0, rainAmount = 0, isDay = 1) => {
  const isNight = isDay === 0;

  if (code >= 95) {
    return {
      label: "Thunderstorm",
      icon: "weather-lightning-rainy",
      emoji: "⛈️",
      riskLevel: "HIGH",
      riskText: "Severe Flooding & Flash Risk",
      riskColor: "#dc2626",
      riskBg: "#fee2e2",
      advisory: "Torrential downpours and lightning active. High probability of deep waterlogging in low-lying underpasses.",
      themeColor: "#4338ca",
    };
  }
  if (code >= 61 || code === 80 || code === 81 || code === 82 || rainAmount > 0.5) {
    const isHeavy = code === 65 || code === 82 || rainAmount > 3.0;
    return {
      label: isHeavy ? "Heavy Downpour" : "Active Rainfall",
      icon: "weather-pouring",
      emoji: "🌧️",
      riskLevel: isHeavy ? "HIGH" : "MODERATE",
      riskText: isHeavy ? "High Waterlogging Hazard" : "Slick Road Warning",
      riskColor: isHeavy ? "#dc2626" : "#d97706",
      riskBg: isHeavy ? "#fee2e2" : "#fef3c7",
      advisory: isHeavy
        ? "Heavy rain accumulating. Road drainage may be overwhelmed. Follow RainRoute safe detours."
        : "Wet asphalt and reduced tire traction. Check user hazard reports along your trajectory.",
      themeColor: "#2563eb",
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      label: "Light Drizzle",
      icon: "weather-rainy",
      emoji: "🌦️",
      riskLevel: "LOW",
      riskText: "Minor Wet Surface",
      riskColor: "#2563eb",
      riskBg: "#dbeafe",
      advisory: "Light drizzle. Roads slightly slick; maintain safe braking distance.",
      themeColor: "#0284c7",
    };
  }
  if (code >= 1 && code <= 3) {
    return {
      label: code === 3 ? (isNight ? "Overcast Night" : "Overcast") : (isNight ? "Partly Cloudy" : "Partly Cloudy"),
      icon: isNight ? (code === 3 ? "weather-cloudy" : "weather-night-partly-cloudy") : "weather-partly-cloudy",
      emoji: isNight ? (code === 3 ? "☁️" : "☁️🌙") : "⛅",
      riskLevel: "SAFE",
      riskText: "Optimal Driving Conditions",
      riskColor: "#16a34a",
      riskBg: "#dcfce7",
      advisory: isNight
        ? "Night cloud cover with zero active rainfall. Normal city driving conditions."
        : "Overcast skies with zero active rainfall. Normal city driving conditions.",
      themeColor: isNight ? "#6366f1" : "#475569",
    };
  }
  if (code === 45 || code === 48) {
    return {
      label: isNight ? "Night Fog" : "Foggy",
      icon: "weather-fog",
      emoji: "🌫️",
      riskLevel: "MODERATE",
      riskText: "Reduced Visibility",
      riskColor: "#d97706",
      riskBg: "#fef3c7",
      advisory: "Dense fog reducing vision. Keep headlights on low-beam and reduce speed.",
      themeColor: "#64748b",
    };
  }
  // Clear Sky / Clear Night
  if (isNight) {
    return {
      label: "Clear Night",
      icon: "weather-night",
      emoji: "🌙",
      riskLevel: "SAFE",
      riskText: "Optimal Night Driving",
      riskColor: "#16a34a",
      riskBg: "#dcfce7",
      advisory: "Clear starlit night and dry roads. Excellent traction and visibility throughout the city.",
      themeColor: "#6366f1",
    };
  }
  return {
    label: "Clear Sky",
    icon: "weather-sunny",
    emoji: "☀️",
    riskLevel: "SAFE",
    riskText: "Optimal Driving Weather",
    riskColor: "#16a34a",
    riskBg: "#dcfce7",
    advisory: "Clear skies and dry roads. Excellent traction and visibility throughout the city.",
    themeColor: "#ea580c",
  };
};

export default function WeatherWidget({ userLocation }) {
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState("Local Area");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastFetchedCoords, setLastFetchedCoords] = useState(null);

  useEffect(() => {
    if (!userLocation || !userLocation.lat || !userLocation.lng) return;

    // Only re-fetch if location moved by more than ~0.02 deg (~2km) or first load
    if (
      !lastFetchedCoords ||
      Math.abs(lastFetchedCoords.lat - userLocation.lat) > 0.02 ||
      Math.abs(lastFetchedCoords.lng - userLocation.lng) > 0.02
    ) {
      fetchWeatherData(userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  const fetchWeatherData = async (lat, lng) => {
    setLoading(true);
    try {
      // 1. Fetch free Open-Meteo real-time weather with is_day
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(weatherUrl);
      const data = await res.json();

      if (data && data.current) {
        setWeather(data.current);
        setLastFetchedCoords({ lat, lng });
      }

      // 2. Reverse geocode city name (Nominatim OpenStreetMap)
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const geoRes = await fetch(geoUrl, {
          headers: { "User-Agent": "RainRouteApp/1.0" },
        });
        const geoData = await geoRes.json();
        const city =
          geoData?.address?.city ||
          geoData?.address?.town ||
          geoData?.address?.suburb ||
          geoData?.address?.county ||
          "Current Location";
        setLocationName(city);
      } catch (_) {
        setLocationName("Current Location");
      }
    } catch (e) {
      console.warn("Weather fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (userLocation?.lat && userLocation?.lng) {
      fetchWeatherData(userLocation.lat, userLocation.lng);
    }
  };

  if (!weather && loading) {
    return (
      <View style={styles.pillContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  if (!weather) return null;

  const currentHour = new Date().getHours();
  const fallbackIsDay = (currentHour >= 6 && currentHour < 19) ? 1 : 0;
  const isDay = weather.is_day !== undefined ? weather.is_day : fallbackIsDay;
  const meta = getWeatherMeta(weather.weather_code, weather.rain, isDay);
  const tempInt = Math.round(weather.temperature_2m);
  const feelsLikeInt = Math.round(weather.apparent_temperature);

  return (
    <>
      {/* Sleek Floating Ambient Weather Capsule */}
      <TouchableOpacity
        style={styles.pillContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.82}
      >
        <Text style={styles.pillEmoji}>{meta.emoji}</Text>
        <Text style={styles.pillTemp}>{tempInt}°C</Text>
        <View style={styles.pillDivider} />
        <Text style={styles.pillCondition} numberOfLines={1}>
          {weather.rain > 0 ? `${weather.rain}mm rain` : meta.label}
        </Text>
        {weather.rain > 1.5 && <View style={styles.rainAlertDot} />}
      </TouchableOpacity>

      {/* Interactive Weather & Flood Risk Sheet */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View style={styles.modalCard}>
            {/* Top Bar with Location & Close */}
            <View style={styles.cardHeader}>
              <View style={styles.locationTitleRow}>
                <Ionicons name="location-sharp" size={16} color="#2563eb" />
                <Text style={styles.cityName}>{locationName}</Text>
                <View style={styles.liveFeedBadge}>
                  <Text style={styles.liveFeedText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.headerRightBtns}>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={styles.circleBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh"
                    size={16}
                    color="#475569"
                    style={loading && styles.rotating}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.circleBtn}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Weather Section */}
            <View style={styles.heroWeatherRow}>
              <View>
                <View style={styles.tempLargeRow}>
                  <Text style={styles.tempLarge}>{tempInt}°</Text>
                  <Text style={styles.tempUnit}>C</Text>
                </View>
                <Text style={styles.conditionText}>{meta.label}</Text>
                <Text style={styles.feelsLikeText}>
                  Feels like {feelsLikeInt}°C • Wind {weather.wind_speed_10m} km/h
                </Text>
              </View>

              <View style={styles.heroIconCircle}>
                <MaterialCommunityIcons
                  name={meta.icon}
                  size={52}
                  color={meta.themeColor}
                />
              </View>
            </View>

            {/* Commuter Road Flooding Safety Card (Tailored for RainRoute) */}
            <View style={[styles.safetyBanner, { backgroundColor: meta.riskBg }]}>
              <View style={styles.safetyHeader}>
                <View
                  style={[
                    styles.riskPill,
                    { backgroundColor: meta.riskColor },
                  ]}
                >
                  <Text style={styles.riskPillText}>{meta.riskLevel} RISK</Text>
                </View>
                <Text
                  style={[styles.riskHeadline, { color: meta.riskColor }]}
                >
                  {meta.riskText}
                </Text>
              </View>
              <Text style={styles.safetyAdvisory}>{meta.advisory}</Text>
            </View>

            {/* 4-Column Meteorological Metrics Grid */}
            <View style={styles.metricsGrid}>
              {/* Rain Accumulation */}
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="rainy" size={18} color="#2563eb" />
                </View>
                <Text style={styles.metricValue}>
                  {weather.rain !== undefined ? `${weather.rain} mm` : "0 mm"}
                </Text>
                <Text style={styles.metricLabel}>Rain Intensity</Text>
              </View>

              {/* Relative Humidity */}
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="water" size={18} color="#0284c7" />
                </View>
                <Text style={styles.metricValue}>
                  {weather.relative_humidity_2m}%
                </Text>
                <Text style={styles.metricLabel}>Humidity</Text>
              </View>

              {/* Wind Speed */}
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Feather name="wind" size={18} color="#64748b" />
                </View>
                <Text style={styles.metricValue}>
                  {weather.wind_speed_10m} km/h
                </Text>
                <Text style={styles.metricLabel}>Wind Speed</Text>
              </View>

              {/* Apparent Temp */}
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="thermometer" size={18} color="#ea580c" />
                </View>
                <Text style={styles.metricValue}>{feelsLikeInt}°C</Text>
                <Text style={styles.metricLabel}>Feels Like</Text>
              </View>
            </View>

            {/* Open-Source Attribution Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Open-source meteorological telemetry via Open-Meteo API
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Ambient Pill on Map
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillTemp: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  pillDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#cbd5e1",
  },
  pillCondition: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    maxWidth: 85,
  },
  rainAlertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#dc2626",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBackdropTap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 26,
    padding: 20,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  liveFeedBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  liveFeedText: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerRightBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero Section
  heroWeatherRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tempLargeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tempLarge: {
    fontSize: 44,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -1,
  },
  tempUnit: {
    fontSize: 18,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 6,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 2,
  },
  feelsLikeText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  // Safety Banner
  safetyBanner: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  riskPillText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  riskHeadline: {
    fontSize: 12,
    fontWeight: "800",
  },
  safetyAdvisory: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },

  footerRow: {
    alignItems: "center",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 9,
    color: "#94a3b8",
  },
  rotating: {
    opacity: 0.5,
  },
});
