import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

export default function MenuDrawer({
  visible,
  onClose,
  onOpenSos,
  onOpenFaq,
  onOpenFeedback,
  onOpenAdmin,
  isAdmin,
  reportCount = 0,
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoCircle}>
                <Text style={styles.brandEmoji}>🌧️</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>RainRoute</Text>
                <Text style={styles.brandTagline}>Monsoon Navigation & Safety</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{reportCount}</Text>
              <Text style={styles.metricLabel}>Live Hazards</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#16a34a' }]}>6h</Text>
              <Text style={styles.metricLabel}>Auto Decay</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#2563eb' }]}>Realtime</Text>
              <Text style={styles.metricLabel}>GPS Routing</Text>
            </View>
          </View>

          {/* Navigation Items */}
          <View style={styles.navSection}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                onOpenSos();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, { backgroundColor: '#fee2e2' }]}>
                <MaterialIcons name="emergency" size={20} color="#dc2626" />
              </View>
              <View style={styles.navTextWrap}>
                <Text style={[styles.navLabel, { color: '#dc2626' }]}>Emergency SOS</Text>
                <Text style={styles.navSub}>Helplines & live location beacon</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                onOpenFaq();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="help-circle" size={20} color="#2563eb" />
              </View>
              <View style={styles.navTextWrap}>
                <Text style={styles.navLabel}>FAQs & Guide</Text>
                <Text style={styles.navSub}>How hazard decay & routing works</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                onOpenFeedback();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, { backgroundColor: '#f0fdf4' }]}>
                <MaterialCommunityIcons name="message-draw" size={20} color="#16a34a" />
              </View>
              <View style={styles.navTextWrap}>
                <Text style={styles.navLabel}>Send Feedback</Text>
                <Text style={styles.navSub}>Suggest features or improvements</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                onOpenAdmin();
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.navIconWrap,
                  { backgroundColor: isAdmin ? '#dcfce7' : '#f1f5f9' },
                ]}
              >
                <Ionicons
                  name={isAdmin ? 'shield-checkmark' : 'shield-outline'}
                  size={20}
                  color={isAdmin ? '#16a34a' : '#475569'}
                />
              </View>
              <View style={styles.navTextWrap}>
                <View style={styles.adminLabelRow}>
                  <Text style={styles.navLabel}>Admin Portal</Text>
                  {isAdmin && (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Signed In</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.navSub}>
                  {isAdmin ? 'Manage, resolve & purge reports' : 'Municipal authority login'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Clean Production Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.footerVersion}>RainRoute v2.4</Text>
            <Text style={styles.footerSub}>Safe & Smart Monsoon Commuting</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 16,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandEmoji: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  brandTagline: {
    fontSize: 11,
    color: '#64748b',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
  },
  navSection: {
    padding: 12,
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    gap: 12,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTextWrap: {
    flex: 1,
  },
  adminLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activePillText: {
    color: '#16a34a',
    fontSize: 9,
    fontWeight: '800',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  navSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  menuFooter: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  footerSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
