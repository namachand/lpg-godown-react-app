import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';
import { getDeliveryDrivers } from '../../services/godownService';

const filters = ['Today', 'Yesterday', 'This Week'];

export default function GodownDriversScreen() {
  const [activeFilter, setActiveFilter] = useState('Today');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrivers = async (filterValue = activeFilter) => {
    try {
      setLoading(true);

      const apiFilter =
        filterValue === 'Today'
          ? 'today'
          : filterValue === 'Yesterday'
            ? 'yesterday'
            : 'week';

      const data = await getDeliveryDrivers(apiFilter);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Delivery drivers error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [])
  );

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.filterRow}>
          {filters.map((item) => {
            const active = item === activeFilter;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterButton, active && styles.filterButtonActive]}
                onPress={() => {
                  setActiveFilter(item);
                  fetchDrivers(item);
                }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Delivery Drivers</Text>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          drivers.map((driver) => (
            <TouchableOpacity
              key={driver.id}
              activeOpacity={0.85}
              style={styles.driverCard}
              onPress={() =>
                router.push({
                  pathname: '/driver-allocation/[id]',
                  params: {
                    id: String(driver.id),
                    name: driver.name,
                    allocated: String(driver.allocated || 0),
                    delivered: String(driver.delivered || 0),
                    empty: String(driver.empty || 0),
                    inHand: String(driver.inHand || 0),
                  },
                })
              }
            >
              <View style={styles.avatarBox}>
                <Ionicons name="person-outline" size={28} color={COLORS.primary} />
              </View>

              <View style={styles.driverContent}>
                <Text style={styles.driverName}>{driver.name}</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.primary }]}>
                      {driver.allocated}
                    </Text>
                    <Text style={styles.statLabel}>Allocated</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.green }]}>
                      {driver.delivered}
                    </Text>
                    <Text style={styles.statLabel}>Delivered</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{driver.empty}</Text>
                    <Text style={styles.statLabel}>Empty</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.orange }]}>
                      {driver.inHand}
                    </Text>
                    <Text style={styles.statLabel}>In-Hand</Text>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  loaderBox: { height: 300, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  filterButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  filterTextActive: { color: COLORS.white },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  driverCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  driverContent: { flex: 1 },
  driverName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  statItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
});