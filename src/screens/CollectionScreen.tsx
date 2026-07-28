import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AppHeader from "../components/common/AppHeader";
import ScreenContainer from "../components/common/ScreenContainer";
import CashDenominationModal from "../components/ui/CashDenominationModal";
import { AUTH_USER_KEY } from "../constants/auth";
import { DS, PALETTE, RADIUS, TYPO, WEIGHT } from "../constants/designSystem";
import { useDateRange } from "../context/DateRangeContext";
import api from "../services/api";

type CollectionStatus = "ASSIGNED" | "PENDING" | "SETTLED" | "APPROVED" | null;

type CollectionCardData = {
  amount: number;
  count: number;
  status: CollectionStatus;
  transactions: any[];
};

type CollectionSummaryResponse = {
  summary: {
    cashCollected: number;
    upiCollected: number;
    totalCollected: number;
  };
  settlements: {
    cashAssigned: CollectionCardData;
    cashPending: CollectionCardData;
    upiAssigned: CollectionCardData;
    upiPending: CollectionCardData;
  };
};

type CollectionHistoryTransaction = {
  saleId: number;
  customerName: string;
  amount: number;
  paymentMode: string;
  deliveredAt: string;
  status: CollectionStatus;
};

type CollectionHistoryDayItem = {
  date: string;
  totalAmount: number;
  summary: {
    cash: {
      amount: number;
      status: CollectionStatus;
      settledAt: string | null;
    };
    upi: {
      amount: number;
      status: CollectionStatus;
      settledAt: string | null;
    };
  };
  transactions: CollectionHistoryTransaction[];
};

type CollectionHistoryResponse = {
  items: CollectionHistoryDayItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const formatAmount = (value?: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatTime = (dateString?: string | null) => {
  if (!dateString) return "";

  try {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const formatDateLabel = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getPaymentLabel = (method?: string) => {
  const value = String(method || "").toUpperCase();

  if (value === "CARD" || value === "ONLINE") return "Online";
  if (value === "CASH") return "Cash";
  if (value === "UPI") return "UPI";

  return value || "N/A";
};

const TEXT_BLACK = DS.textPrimary;

function CollectionActionCard({
  type,
  title,
  amount,
  count,
  status,
  loading,
  onPress,
}: {
  type: "CASH" | "UPI";
  title: string;
  amount: number;
  count: number;
  status: CollectionStatus;
  loading: boolean;
  onPress: () => void;
}) {
  const isAssigned = status === "ASSIGNED";
  const isPending = status === "PENDING";

  const icon = type === "CASH" ? "wallet-outline" : "phone-portrait-outline";
  const color = type === "CASH" ? DS.green : DS.primary;
  const bg = type === "CASH" ? DS.greenSoft : DS.primarySoft;

  return (
    <View style={styles.collectionCard}>
      <View style={styles.collectionTopRow}>
        <View style={styles.collectionTitleRow}>
          <View style={[styles.iconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>

          <View>
            <Text style={styles.collectionTitle}>{title}</Text>
            <Text style={styles.collectionAmount}>{formatAmount(amount)}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.pendingPill}>
            <Ionicons name="time-outline" size={14} color={DS.orange} />
            <Text style={styles.pendingPillText}>
              Pending for Cashier Approval
            </Text>
          </View>
        )}
      </View>

      <View style={styles.collectionInfoRow}>
        <Text style={styles.collectionInfoText}>
          {count} {isAssigned ? "assigned" : "pending"} payments
        </Text>

        <Text style={styles.collectionInfoAmount}>{formatAmount(amount)}</Text>
      </View>

      {isAssigned && (
        <TouchableOpacity
          style={[
            styles.collectionButton,
            {
              backgroundColor: type === "CASH" ? DS.buttonGreen : DS.primary,
            },
          ]}
          onPress={onPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={DS.white} />
          ) : (
            <>
              <Ionicons
                name={type === "CASH" ? "cash-outline" : "card-outline"}
                size={16}
                color={DS.white}
              />
              <Text style={styles.collectionButtonText}>Settle Amount</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CollectionScreen() {
  const { rangeKey } = useDateRange();
  const [driverId, setDriverId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"summary" | "history">("summary");

  const [summaryData, setSummaryData] =
    useState<CollectionSummaryResponse | null>(null);

  const [historyData, setHistoryData] =
    useState<CollectionHistoryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  const [settlingMethod, setSettlingMethod] = useState<
    "UPI" | "TOTAL_UPI" | null
  >(null);

  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);

  useEffect(() => {
    const loadDriverId = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const id = Number(parsed?.id);

        setDriverId(id && !Number.isNaN(id) ? id : null);
      } catch {
        setDriverId(null);
      }
    };

    loadDriverId();
  }, []);

  const fetchCollectionSummary = useCallback(async () => {
    if (!driverId) return;

    const response = await api.get(`/drivers/${driverId}/collection-summary`);

    if (response.data?.success) {
      setSummaryData(response.data.data);
    }
  }, [driverId]);

  const fetchCollectionHistory = useCallback(
    async (page = 1) => {
      if (!driverId) return;

      const response = await api.get(
        `/drivers/${driverId}/collection-history?page=${page}&limit=2`,
      );

      if (response.data?.success) {
        setHistoryData(response.data.data);
      }
    },
    [driverId],
  );

  const loadScreen = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (activeTab === "summary") {
        await fetchCollectionSummary();
      } else {
        await fetchCollectionHistory(historyPage);
      }
    } catch (err: any) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchCollectionSummary, fetchCollectionHistory, historyPage]);

  useEffect(() => {
    loadScreen();
  }, [loadScreen, rangeKey]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      if (activeTab === "summary") {
        await fetchCollectionSummary();
      } else {
        await fetchCollectionHistory(historyPage);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const refreshAfterSettlement = async () => {
    await fetchCollectionSummary();
    await fetchCollectionHistory(historyPage);
  };

  const handleSettleUpi = async () => {
    if (!driverId) {
      Alert.alert("Error", "Driver session not found");
      return;
    }

    try {
      setSettlingMethod("UPI");

      const response = await api.put(
        `/drivers/${driverId}/settle-collections`,
        {
          method: "UPI",
        },
      );

      if (response.data?.success) {
        Alert.alert("Success", "UPI collection sent for cashier approval");

        await refreshAfterSettlement();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to settle UPI",
      );
    } finally {
      setSettlingMethod(null);
    }
  };

  const handleSettleTotal = async () => {
    if (!driverId) {
      Alert.alert("Error", "Driver session not found");
      return;
    }

    try {
      setSettlingMethod("TOTAL_UPI");

      const response = await api.put(
        `/drivers/${driverId}/settle-collections`,
        {
          method: "TOTAL_UPI",
        },
      );

      if (response.data?.success) {
        Alert.alert("Success", "Collection sent for cashier approval");

        await refreshAfterSettlement();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to settle total collection",
      );
    } finally {
      setSettlingMethod(null);
    }
  };

  const handleSubmitCashDenominations = async ({
    denominations,
    enteredAmount,
  }: {
    denominations: {
      "500": number;
      "100": number;
      "50": number;
      "20": number;
      "10": number;
      coins: number;
    };
    enteredAmount: number;
  }) => {
    if (!driverId) {
      Alert.alert("Error", "Driver session not found");
      return;
    }

    try {
      const expectedAmount =
        summaryData?.settlements?.cashAssigned?.amount ?? 0;

      const roundedExpected = Number(expectedAmount.toFixed(2));
      const roundedEntered = Number(enteredAmount.toFixed(2));

      if (roundedEntered !== roundedExpected) {
        Alert.alert(
          "Amount mismatch",
          `Entered ₹${roundedEntered} should match assigned cash ₹${roundedExpected}`,
        );

        return;
      }

      setCashSubmitting(true);

      const response = await api.put(
        `/drivers/${driverId}/settle-collections`,
        {
          method: "CASH",
          denominations,
        },
      );

      if (response.data?.success) {
        setCashModalVisible(false);

        Alert.alert("Success", "Cash collection sent for cashier approval");

        await refreshAfterSettlement();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to settle cash",
      );
    } finally {
      setCashSubmitting(false);
    }
  };

  const cashAssigned = summaryData?.settlements?.cashAssigned;
  const cashPending = summaryData?.settlements?.cashPending;

  const upiAssigned = summaryData?.settlements?.upiAssigned;
  const upiPending = summaryData?.settlements?.upiPending;

  const totalAmount = summaryData?.summary?.totalCollected ?? 0;

  const assignedTotal =
    Number(cashAssigned?.amount || 0) + Number(upiAssigned?.amount || 0);

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "summary" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("summary")}
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={activeTab === "summary" ? TEXT_BLACK : DS.textSecondary}
            />

            <Text
              style={[
                styles.tabText,
                activeTab === "summary" && styles.activeTabText,
              ]}
            >
              Collection Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "history" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("history")}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={activeTab === "history" ? TEXT_BLACK : DS.textSecondary}
            />

            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.activeTabText,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={DS.primary}
            style={{ marginTop: 40 }}
          />
        ) : activeTab === "summary" ? (
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIconWrap,
                    { backgroundColor: DS.greenSoft },
                  ]}
                >
                  <Ionicons name="wallet-outline" size={22} color={DS.green} />
                </View>

                <Text style={styles.summaryAmount}>
                  {formatAmount(summaryData?.summary?.cashCollected)}
                </Text>

                <Text style={styles.summaryLabel}>Cash Collected</Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIconWrap,
                    { backgroundColor: DS.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color={DS.primary}
                  />
                </View>

                <Text style={styles.summaryAmount}>
                  {formatAmount(summaryData?.summary?.upiCollected)}
                </Text>

                <Text style={styles.summaryLabel}>UPI Payments</Text>
              </View>
            </View>

            {(cashAssigned?.amount ?? 0) > 0 && (
              <CollectionActionCard
                type="CASH"
                title="Cash Collection"
                amount={cashAssigned?.amount ?? 0}
                count={cashAssigned?.count ?? 0}
                status="ASSIGNED"
                loading={cashSubmitting}
                onPress={() => setCashModalVisible(true)}
              />
            )}

            {(cashPending?.amount ?? 0) > 0 && (
              <CollectionActionCard
                type="CASH"
                title="Cash Collection"
                amount={cashPending?.amount ?? 0}
                count={cashPending?.count ?? 0}
                status="PENDING"
                loading={false}
                onPress={() => {}}
              />
            )}

            {(upiAssigned?.amount ?? 0) > 0 && (
              <CollectionActionCard
                type="UPI"
                title="UPI Payments"
                amount={upiAssigned?.amount ?? 0}
                count={upiAssigned?.count ?? 0}
                status="ASSIGNED"
                loading={settlingMethod === "UPI"}
                onPress={handleSettleUpi}
              />
            )}

            {(upiPending?.amount ?? 0) > 0 && (
              <CollectionActionCard
                type="UPI"
                title="UPI Payments"
                amount={upiPending?.amount ?? 0}
                count={upiPending?.count ?? 0}
                status="PENDING"
                loading={false}
                onPress={() => {}}
              />
            )}

            {assignedTotal > 0 && (
              <View style={styles.totalCard}>
                <View style={[styles.collectionTitleRow, { marginBottom: 16 }]}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: DS.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name="card-outline"
                      size={18}
                      color={DS.primary}
                    />
                  </View>

                  <View>
                    <Text style={styles.collectionTitle}>Total Collection</Text>

                    <Text style={styles.collectionAmount}>
                      {formatAmount(totalAmount)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.collectionButton,
                    { backgroundColor: DS.primary },
                  ]}
                  onPress={handleSettleTotal}
                  disabled={settlingMethod === "TOTAL_UPI"}
                >
                  {settlingMethod === "TOTAL_UPI" ? (
                    <ActivityIndicator color={DS.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="card-outline"
                        size={16}
                        color={DS.white}
                      />

                      <Text style={styles.collectionButtonText}>
                        Settle Total — Online Payment
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {historyData?.items?.map((group, index) => (
              <View key={index} style={styles.historyGroup}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyDateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={DS.textSecondary}
                    />

                    <Text style={styles.historyDate}>
                      {formatDateLabel(group.date)}
                    </Text>
                  </View>

                  <Text style={styles.historyTotal}>
                    {formatAmount(group.totalAmount)}
                  </Text>
                </View>

                <View style={styles.summaryStatusRow}>
                  {group.summary.cash.amount > 0 && (
                    <View style={styles.historyStatusCard}>
                      <Text style={styles.historyStatusTitle}>
                        Cash: {formatAmount(group.summary.cash.amount)}
                      </Text>

                      <Text style={styles.historyStatusText}>
                        Settled at {formatTime(group.summary.cash.settledAt)}
                      </Text>
                    </View>
                  )}

                  {group.summary.upi.amount > 0 && (
                    <View style={styles.historyStatusCard}>
                      <Text style={styles.historyStatusTitle}>
                        UPI: {formatAmount(group.summary.upi.amount)}
                      </Text>

                      <Text style={styles.historyStatusText}>
                        Settled at {formatTime(group.summary.upi.settledAt)}
                      </Text>
                    </View>
                  )}
                </View>

                {group.transactions.map((item, transactionIndex) => (
                  <View
                    key={transactionIndex}
                    style={styles.historyTransaction}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor:
                            item.paymentMode === "CASH"
                              ? DS.greenSoft
                              : DS.primarySoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          item.paymentMode === "CASH"
                            ? "wallet-outline"
                            : "phone-portrait-outline"
                        }
                        size={18}
                        color={
                          item.paymentMode === "CASH" ? DS.green : DS.primary
                        }
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>
                        {item.customerName}
                      </Text>

                      <Text style={styles.customerMeta}>
                        {formatTime(item.deliveredAt)} ·{" "}
                        {getPaymentLabel(item.paymentMode)}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.transactionAmount}>
                        {formatAmount(item.amount)}
                      </Text>

                      <View style={styles.paidPill}>
                        <Text style={styles.paidText}>Paid</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <CashDenominationModal
        visible={cashModalVisible}
        loading={cashSubmitting}
        expectedAmount={summaryData?.settlements?.cashAssigned?.amount ?? 0}
        onClose={() => setCashModalVisible(false)}
        onSubmit={handleSubmitCashDenominations}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: DS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: 18,
  },

  tabButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  activeTabButton: {
    backgroundColor: DS.white,
  },

  tabText: {
    ...TYPO.b4,
    fontWeight: WEIGHT.semibold,
    color: DS.textSecondary,
  },

  activeTabText: {
    color: TEXT_BLACK,
  },

  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: DS.white,
    borderRadius: RADIUS.xl,
    paddingVertical: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: DS.border,
  },

  summaryIconWrap: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  summaryAmount: {
    ...TYPO.h5,
    color: TEXT_BLACK,
    marginBottom: 8,
  },

  summaryLabel: {
    ...TYPO.c2,
    color: DS.textSecondary,
  },

  collectionCard: {
    backgroundColor: DS.white,
    borderRadius: RADIUS.xxl,
    padding: 18,
    borderWidth: 1,
    borderColor: DS.border,
    marginBottom: 18,
  },

  collectionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  collectionTitleRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },

  collectionTitle: {
    ...TYPO.s2,
    color: TEXT_BLACK,
  },

  collectionAmount: {
    ...TYPO.s2,
    color: TEXT_BLACK,
    marginTop: 2,
  },

  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: DS.orangeSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    maxWidth: 160,
  },

  pendingPillText: {
    ...TYPO.c3,
    fontWeight: WEIGHT.semibold,
    letterSpacing: 0.4,
    color: DS.orangeText,
  },

  collectionInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  collectionInfoText: {
    ...TYPO.b4,
    fontWeight: WEIGHT.semibold,
    color: TEXT_BLACK,
  },

  collectionInfoAmount: {
    ...TYPO.s2,
    color: TEXT_BLACK,
  },

  collectionButton: {
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  collectionButtonText: {
    ...TYPO.s2,
    color: DS.white,
  },

  totalCard: {
    backgroundColor: DS.white,
    borderRadius: RADIUS.xxl,
    padding: 18,
    borderWidth: 1,
    borderColor: DS.border,
    marginBottom: 18,
  },

  historyGroup: {
    backgroundColor: DS.white,
    borderRadius: RADIUS.xxl,
    padding: 18,
    borderWidth: 1,
    borderColor: DS.border,
    marginBottom: 18,
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  historyDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  historyDate: {
    ...TYPO.s2,
    color: TEXT_BLACK,
  },

  historyTotal: {
    ...TYPO.s1,
    color: DS.primary,
  },

  summaryStatusRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  historyStatusCard: {
    flex: 1,
    backgroundColor: DS.greenSoft,
    borderRadius: RADIUS.lg,
    padding: 14,
  },

  historyStatusTitle: {
    ...TYPO.s2,
    color: PALETTE.green600,
    marginBottom: 6,
  },

  historyStatusText: {
    ...TYPO.c2,
    color: PALETTE.green600,
  },

  historyTransaction: {
    backgroundColor: DS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  customerName: {
    ...TYPO.s2,
    color: TEXT_BLACK,
    marginBottom: 4,
  },

  customerMeta: {
    ...TYPO.b4,
    color: DS.textSecondary,
  },

  transactionAmount: {
    ...TYPO.s2,
    color: TEXT_BLACK,
    marginBottom: 6,
  },

  paidPill: {
    backgroundColor: DS.greenSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  paidText: {
    ...TYPO.c3,
    fontWeight: WEIGHT.semibold,
    letterSpacing: 0.4,
    color: PALETTE.green600,
  },
});
