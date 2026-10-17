import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ActionButtons({ 
  onLocationPress, 
  onReportPress, 
  onRefreshPress,
  onSosPress,
  locationLoading, 
  reportLoading,
  hazardCount = 0,
  hasActiveRoute = false,
}) {
  return (
    <View 
      style={[
        styles.container,
        hasActiveRoute ? styles.containerWithRoute : styles.containerDefault
      ]} 
      pointerEvents="box-none"
    >
      {/* Left Dock: Report Hazard Button */}
      <TouchableOpacity 
        style={[styles.reportFab, reportLoading && styles.disabledFab]} 
        onPress={onReportPress} 
        disabled={reportLoading}
        activeOpacity={0.85}
      >
        {reportLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.reportText}>Locking GPS...</Text>
          </View>
        ) : (
          <View style={styles.reportContent}>
            <View style={styles.reportIconCircle}>
              <MaterialCommunityIcons name="alert-octagon" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.reportText}>Report Hazard</Text>
              <Text style={styles.reportSubtext}>Water, Pothole, Block</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Right Dock: Quick Tools (SOS, Refresh, GPS) */}
      <View style={styles.rightDock} pointerEvents="box-none">
        {/* Quick SOS Trigger */}
        {onSosPress && (
          <TouchableOpacity 
            style={[styles.iconFab, styles.sosFab]} 
            onPress={onSosPress}
            activeOpacity={0.8}
          >
            <MaterialIcons name="emergency" size={22} color="#dc2626" />
          </TouchableOpacity>
        )}

        {/* Refresh Hazards */}
        {onRefreshPress && (
          <TouchableOpacity 
            style={styles.iconFab} 
            onPress={onRefreshPress}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#334155" />
            {hazardCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{hazardCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* GPS Locate Button */}
        <TouchableOpacity 
          style={[styles.iconFab, styles.locationFab, locationLoading && styles.activeLocationFab]} 
          onPress={onLocationPress} 
          disabled={locationLoading}
          activeOpacity={0.8}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <MaterialIcons name="my-location" size={24} color="#2563eb" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  containerDefault: {
    bottom: 26,
  },
  containerWithRoute: {
    bottom: 230, // Floats cleanly above the route info card
  },
  reportFab: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  disabledFab: {
    opacity: 0.75,
  },
  reportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  reportSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  rightDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconFab: {
    backgroundColor: '#ffffff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sosFab: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  locationFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  activeLocationFab: {
    backgroundColor: '#eff6ff',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});