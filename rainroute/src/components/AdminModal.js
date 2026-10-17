import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  adminLogin,
  fetchAdminReports,
  fetchAdminFeedbacks,
  updateReportStatus,
  deleteReport,
} from '../services/apiService';

const WINDOW_HEIGHT = Dimensions.get('window').height;

export default function AdminModal({
  visible,
  onClose,
  adminToken,
  adminUser,
  onLoginSuccess,
  onLogout,
  onDataChanged,
}) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  
  // Dashboard Section: 'hazards' | 'feedback'
  const [adminSection, setAdminSection] = useState('hazards');

  // Reports State
  const [reports, setReports] = useState([]);
  const [fetchingReports, setFetchingReports] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'resolved'

  // Feedback State
  const [feedbacks, setFeedbacks] = useState([]);
  const [fetchingFeedbacks, setFetchingFeedbacks] = useState(false);

  useEffect(() => {
    if (visible && adminToken) {
      loadReports();
      loadFeedbacks();
    }
  }, [visible, adminToken]);

  const loadReports = async () => {
    if (!adminToken) return;
    setFetchingReports(true);
    try {
      const data = await fetchAdminReports(adminToken);
      setReports(data || []);
    } catch (e) {
      console.warn('Failed to load admin reports:', e);
    } finally {
      setFetchingReports(false);
    }
  };

  const loadFeedbacks = async () => {
    if (!adminToken) return;
    setFetchingFeedbacks(true);
    try {
      const data = await fetchAdminFeedbacks(adminToken);
      setFeedbacks(data || []);
    } catch (e) {
      console.warn('Failed to load admin feedbacks:', e);
    } finally {
      setFetchingFeedbacks(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Credentials Required',
        text2: 'Enter both username and password.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin(username.trim(), password.trim());
      onLoginSuccess(res.token, res.admin);
      Toast.show({
        type: 'success',
        text1: 'Admin Access Granted',
        text2: `Welcome back, ${res.admin?.username || 'Admin'}!`,
      });
      setLoading(false);
    } catch (e) {
      setLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Authentication Failed',
        text2: e.message || 'Invalid credentials.',
      });
    }
  };

  const handleStatusToggle = async (report) => {
    const nextStatus = report.status === 'resolved' ? 'active' : 'resolved';
    try {
      await updateReportStatus(report._id, nextStatus, adminToken);
      Toast.show({
        type: 'success',
        text1: nextStatus === 'resolved' ? 'Hazard Marked Fixed! 🛠️' : 'Reopened Hazard',
        text2: `Status updated to ${nextStatus}.`,
      });
      await loadReports();
      if (onDataChanged) onDataChanged();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: e.message || 'Could not update status.',
      });
    }
  };

  const handleDelete = (reportId) => {
    Alert.alert(
      'Delete Hazard Report?',
      'This will permanently remove this report from the database and live map.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReport(reportId, adminToken);
              Toast.show({
                type: 'success',
                text1: 'Report Deleted',
                text2: 'Hazard permanently purged from map.',
              });
              await loadReports();
              if (onDataChanged) onDataChanged();
            } catch (e) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: e.message || 'Could not delete report.',
              });
            }
          },
        },
      ]
    );
  };

  const filteredReports = reports.filter((r) => {
    if (filter === 'active') return r.status !== 'resolved';
    if (filter === 'resolved') return r.status === 'resolved';
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.title}>Admin Control Center</Text>
                <Text style={styles.subtitle}>
                  {adminToken ? `Signed in as ${adminUser?.username || 'admin'}` : 'Staff & Municipal Access Only'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {!adminToken ? (
            /* Login Form */
            <View style={styles.loginContainer}>
              <Text style={styles.loginHint}>
                Standard commuters can freely report and navigate without accounts. Sign in with municipal credentials to moderate and manage reports.
              </Text>

              <Text style={styles.inputLabel}>Username or Email</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="admin"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.loginBtnText}>Authenticate as Admin</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Admin Management Dashboard */
            <View style={styles.dashboardContainer}>
              {/* Primary Section Switcher: Hazards vs. Feedbacks */}
              <View style={styles.sectionTabsRow}>
                <TouchableOpacity
                  style={[styles.sectionTabBtn, adminSection === 'hazards' && styles.sectionTabBtnActive]}
                  onPress={() => setAdminSection('hazards')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="alert-octagon-outline"
                    size={16}
                    color={adminSection === 'hazards' ? '#ffffff' : '#64748b'}
                  />
                  <Text style={[styles.sectionTabBtnText, adminSection === 'hazards' && styles.sectionTabBtnTextActive]}>
                    Hazards ({reports.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sectionTabBtn, adminSection === 'feedback' && styles.sectionTabBtnActive]}
                  onPress={() => setAdminSection('feedback')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={16}
                    color={adminSection === 'feedback' ? '#ffffff' : '#64748b'}
                  />
                  <Text style={[styles.sectionTabBtnText, adminSection === 'feedback' && styles.sectionTabBtnTextActive]}>
                    Feedback ({feedbacks.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>

              {/* HAZARDS TAB CONTENT */}
              {adminSection === 'hazards' ? (
                <View style={styles.flexOne}>
                  {/* Filter Pills */}
                  <View style={styles.toolbar}>
                    <View style={styles.filterTabs}>
                      {['all', 'active', 'resolved'].map((f) => (
                        <TouchableOpacity
                          key={f}
                          style={[styles.filterTab, filter === f && styles.filterTabActive]}
                          onPress={() => setFilter(f)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)} (
                            {
                              reports.filter((r) =>
                                f === 'all'
                                  ? true
                                  : f === 'active'
                                  ? r.status !== 'resolved'
                                  : r.status === 'resolved'
                              ).length
                            }
                            )
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity onPress={loadReports} style={styles.refreshIconBtn}>
                      <Ionicons name="refresh" size={16} color="#2563eb" />
                    </TouchableOpacity>
                  </View>

                  {/* Reports List */}
                  {fetchingReports ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="large" color="#2563eb" />
                      <Text style={styles.loadingText}>Fetching database reports...</Text>
                    </View>
                  ) : filteredReports.length === 0 ? (
                    <View style={styles.centerBox}>
                      <MaterialCommunityIcons name="clipboard-check-outline" size={44} color="#94a3b8" />
                      <Text style={styles.emptyTitle}>No reports in this view</Text>
                      <Text style={styles.emptySub}>All reported road hazards are in check.</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredReports}
                      keyExtractor={(item) => item._id}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item }) => (
                        <View style={styles.reportCard}>
                          <View style={styles.cardHeader}>
                            {item.imageUrl ? (
                              <Image source={{ uri: item.imageUrl }} style={styles.reportThumb} />
                            ) : (
                              <View style={styles.noThumb}>
                                <MaterialCommunityIcons name="image-off-outline" size={20} color="#94a3b8" />
                              </View>
                            )}
                            <View style={styles.cardMainInfo}>
                              <View style={styles.badgeRow}>
                                <View
                                  style={[
                                    styles.hazardTypeBadge,
                                    item.hazardType === 'waterlogging' && { backgroundColor: '#dbeafe' },
                                    item.hazardType === 'pothole' && { backgroundColor: '#fef3c7' },
                                    item.hazardType === 'construction' && { backgroundColor: '#ffedd5' },
                                    item.hazardType === 'obstacle' && { backgroundColor: '#fee2e2' },
                                  ]}
                                >
                                  <Text style={styles.hazardTypeText}>
                                    {(item.hazardType || 'Hazard').toUpperCase()}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.statusBadge,
                                    item.status === 'resolved'
                                      ? styles.statusResolved
                                      : styles.statusActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusText,
                                      item.status === 'resolved'
                                        ? styles.statusTextResolved
                                        : styles.statusTextActive,
                                    ]}
                                  >
                                    {item.status === 'resolved' ? 'Fixed' : 'Active'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.reportDesc} numberOfLines={2}>
                                {item.description || 'No additional details provided.'}
                              </Text>

                              <Text style={styles.reportCoords}>
                                📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                              </Text>
                            </View>
                          </View>

                          {/* Admin Action Buttons */}
                          <View style={styles.cardActions}>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                item.status === 'resolved' ? styles.reopenBtn : styles.resolveBtn,
                              ]}
                              onPress={() => handleStatusToggle(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name={item.status === 'resolved' ? 'refresh' : 'checkmark-circle'}
                                size={15}
                                color="#ffffff"
                              />
                              <Text style={styles.actionBtnText}>
                                {item.status === 'resolved' ? 'Reopen Hazard' : 'Mark Fixed'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => handleDelete(item._id)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="trash-outline" size={15} color="#dc2626" />
                              <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    />
                  )}
                </View>
              ) : (
                /* FEEDBACK TAB CONTENT */
                <View style={styles.flexOne}>
                  <View style={styles.toolbar}>
                    <Text style={styles.feedbackListTitle}>Community Feedback Submissions</Text>
                    <TouchableOpacity onPress={loadFeedbacks} style={styles.refreshIconBtn}>
                      <Ionicons name="refresh" size={16} color="#2563eb" />
                    </TouchableOpacity>
                  </View>

                  {fetchingFeedbacks ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="large" color="#2563eb" />
                      <Text style={styles.loadingText}>Fetching community feedback...</Text>
                    </View>
                  ) : feedbacks.length === 0 ? (
                    <View style={styles.centerBox}>
                      <MaterialCommunityIcons name="comment-text-outline" size={44} color="#94a3b8" />
                      <Text style={styles.emptyTitle}>No feedback received yet</Text>
                      <Text style={styles.emptySub}>User feedback and ratings will appear here.</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={feedbacks}
                      keyExtractor={(item) => item._id}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.listContent}
                      renderItem={({ item }) => (
                        <View style={styles.feedbackCard}>
                          <View style={styles.feedbackTopRow}>
                            <View style={styles.starsRow}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons
                                  key={s}
                                  name={s <= (item.rating || 5) ? 'star' : 'star-outline'}
                                  size={16}
                                  color="#f59e0b"
                                />
                              ))}
                            </View>

                            <View style={styles.feedbackCategoryBadge}>
                              <Text style={styles.feedbackCategoryText}>
                                {(item.category || 'general').replace('_', ' ').toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.feedbackMessage}>{item.message}</Text>

                          <View style={styles.feedbackFooter}>
                            {item.contactEmail ? (
                              <Text style={styles.feedbackEmail}>✉️ {item.contactEmail}</Text>
                            ) : (
                              <Text style={styles.feedbackEmail}>Anonymous Commuter</Text>
                            )}
                            <Text style={styles.feedbackDate}>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                      )}
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: WINDOW_HEIGHT * 0.85, // Fixed 85% screen height guarantees no Android flexbox collapse!
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    padding: 20,
  },
  loginHint: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  loginBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    elevation: 3,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dashboardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  flexOne: {
    flex: 1,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  sectionTabBtnActive: {
    backgroundColor: '#2563eb',
  },
  sectionTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  sectionTabBtnTextActive: {
    color: '#ffffff',
  },
  logoutBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  reportCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  reportThumb: {
    width: 65,
    height: 65,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  noThumb: {
    width: 65,
    height: 65,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMainInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  hazardTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  hazardTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#fee2e2',
  },
  statusResolved: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#dc2626',
  },
  statusTextResolved: {
    color: '#16a34a',
  },
  reportDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  reportCoords: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveBtn: {
    backgroundColor: '#16a34a',
  },
  reopenBtn: {
    backgroundColor: '#475569',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },

  // Feedback Card Styles
  feedbackListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  feedbackCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  feedbackTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  feedbackCategoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feedbackCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  feedbackMessage: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
    marginTop: 2,
  },
  feedbackEmail: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  feedbackDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
});
