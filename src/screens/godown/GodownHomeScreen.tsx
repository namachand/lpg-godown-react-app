import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getGodownDashboardData } from '../../services/godownService';

const activities = [
  {
    title: '15 Domestic cylinders allocated to Ravi Kumar',
    time: '10 min ago',
    icon: 'arrow-up-circle-outline',
    color: COLORS.primary,
  },
  {
    title: '50 Commercial cylinders received from Depot',
    time: '1 hr ago',
    icon: 'arrow-down-circle-outline',
    color: COLORS.green,
  },
  {
    title: '12 empty cylinders returned by Suresh',
    time: '2 hrs ago',
    icon: 'refresh-outline',
    color: COLORS.orange,
  },
  {
    title: '20 Domestic cylinders allocated to Amit Singh',
    time: '3 hrs ago',
    icon: 'arrow-up-circle-outline',
    color: COLORS.primary,
  },
];

export default function GodownHomeScreen() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getGodownDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.log('Godown dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const cards = [
    {
      title: 'Domestic\nAvailable',
      value: dashboardData?.available?.domestic?.total ?? 0,
      type: 'domestic',
      icon: 'cube-outline',
      color: COLORS.primary,
      bg: COLORS.blueSoft,
    },
    {
      title: 'Commercial\nAvailable',
      value: dashboardData?.available?.commercial?.total ?? 0,
      type: 'commercial',
      icon: 'cube-outline',
      color: COLORS.green,
      bg: COLORS.greenSoft,
    },
    {
      title: 'Domestic\nEmpty',
      value: dashboardData?.empty?.domestic?.total ?? 0,
      type: 'empty-domestic',
      icon: 'refresh-outline',
      color: COLORS.orange,
      bg: COLORS.orangeSoft,
    },
    {
      title: 'Commercial\nEmpty',
      value: dashboardData?.empty?.commercial?.total ?? 0,
      type: 'empty-commercial',
      icon: 'refresh-outline',
      color: COLORS.orange,
      bg: COLORS.orangeSoft,
    },
    {
      title: 'Allocated\nToday',
      value: dashboardData?.allocatedToday ?? 0,
      type: 'allocated',
      icon: 'car-outline',
      color: COLORS.primary,
      bg: COLORS.blueSoft,
    },
    {
      title: 'Returned\nToday',
      value: dashboardData?.returnedToday ?? 0,
      type: 'returned',
      icon: 'arrow-down-circle-outline',
      color: COLORS.green,
      bg: COLORS.greenSoft,
    },
    {
      title: 'Total\nDefectives',
      value: dashboardData?.totalDefectives ?? 0,
      type: 'defective',
      icon: 'warning-outline',
      color: '#EF4444',
      bg: '#FEE2E2',
    },
    {
      title: 'Cashier Sale\nStock',
      value: dashboardData?.cashierSaleStock ?? 27,
      type: 'cashier-sale',
      icon: 'cash-outline',
      color: COLORS.green,
      bg: COLORS.greenSoft,
    },
  ];

  const handleCardPress = (type: string) => {
    if (type === 'allocated') {
      router.push('/drivers' as any);
      return;
    }

    if (type === 'returned') {
      router.push('/returns-today' as any);
      return;
    }

    if (type === 'defective') {
      router.push({
        pathname: '/stock',
        params: { tab: 'defective' },
      } as any);
      return;
    }

    if (type === 'cashier-sale') {
      router.push('/cashier-sale' as any);
      return;
    }

    router.push({
      pathname: '/stock-detail/[type]',
      params: { type },
    });
  };

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <>
            <View style={styles.cardGrid}>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.type}
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() => handleCardPress(card.type)}
                >
                  <View style={[styles.iconBox, { backgroundColor: card.bg }]}>
                    <Ionicons
                      name={card.icon as any}
                      size={22}
                      color={card.color}
                    />
                  </View>

                  <View style={styles.cardTextBox}>
                    <Text style={styles.cardValue}>{card.value}</Text>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>

            {activities.map((item, index) => (
              <View key={index} style={styles.activityCard}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />

                <View style={styles.activityTextBox}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loaderBox: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    minHeight: 88,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextBox: {
    flex: 1,
  },
  cardValue: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityTextBox: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  activityTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
});