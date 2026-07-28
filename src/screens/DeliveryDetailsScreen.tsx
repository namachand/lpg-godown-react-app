import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AppHeader from "../components/common/AppHeader";
import { DS, TYPO, RADIUS, PALETTE, WEIGHT } from '../constants/designSystem';
import api from "../services/api";

export default function DeliveryDetailsScreen() {
    const router = useRouter();
    const { saleId } = useLocalSearchParams();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/drivers/deliveries/${saleId}/details`);

            if (res.data?.success) {
                setData(res.data.data);
            }
        } catch (err: any) {
            console.log("fetch delivery details error:", err?.response?.data || err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [saleId]);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={DS.primary} />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.loader}>
                <Text>No delivery details found</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <AppHeader />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.titleRow}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={26} color={DS.textPrimary} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Delivery Details</Text>
                </View>

                <View style={styles.statusBox}>
                    <Ionicons name="checkmark-circle-outline" size={28} color={DS.green} />
                    <View>
                        <Text style={styles.statusText}>Delivered</Text>
                        <Text style={styles.statusTime}>at 09:15 AM</Text>
                    </View>
                </View>

                <InfoCard title="Customer Details" icon="person-outline">
                    <InfoRow label="Name" value={data.customer.name} />
                    <InfoRow label="Phone" value={data.customer.phone} blue />
                    <InfoRow label="Address" value={data.customer.address} />
                </InfoCard>

                <InfoCard title="Sales Details" icon="cube-outline">
                    <InfoRow label="Cylinder Type" value={data.sales.cylinderType} />
                    <InfoRow label="Quantity" value={String(data.sales.quantity)} />
                    <InfoRow label="Unit Price" value={`₹${data.sales.unitPrice}`} />
                    <InfoRow label="Total" value={`₹${data.sales.total}`} />
                </InfoCard>

                <InfoCard title="Return Cylinder" icon="refresh-outline" danger>
                    <InfoRow label="Empty Collected" value={data.returnCylinder.emptyCollected} />
                    <InfoRow label="Empty Count" value={String(data.returnCylinder.emptyCount)} />
                </InfoCard>

                <InfoCard title="Payment Details" icon="cash-outline" orange>
                    <InfoRow label="Method" value={data.payment.method} />
                    <InfoRow label="Amount" value={`₹${data.payment.amount}`} />
                    <InfoRow label="Status" value={data.payment.status === "SUCCESS" ? "Paid" : data.payment.status} green />
                </InfoCard>
            </ScrollView>
        </View>
    );
}

function InfoCard({ title, icon, children, danger, orange }: any) {
    return (
        <View style={styles.card}>
            <View style={styles.cardTitleRow}>
                <View
                    style={[
                        styles.cardIcon,
                        danger && styles.dangerIcon,
                        orange && styles.orangeIcon,
                    ]}
                >
                    <Ionicons
                        name={icon}
                        size={18}
                        color={danger ? DS.red : orange ? DS.orange : DS.primary}
                    />
                </View>

                <Text style={styles.cardTitle}>{title}</Text>
            </View>

            {children}
        </View>
    );
}

function InfoRow({ label, value, blue, green }: any) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text
                style={[
                    styles.infoValue,
                    blue && { color: DS.primary },
                    green && styles.greenBadge,
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: DS.background,
    },

    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    content: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 120,
    },

    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 22,
    },

    title: {
        ...TYPO.h5,
        color: DS.textPrimary,
        marginLeft: 16,
    },

    statusBox: {
        backgroundColor: DS.greenSoft,
        borderRadius: RADIUS.lg,
        paddingVertical: 18,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
        gap: 8,
    },

    statusText: {
        ...TYPO.s1,
        color: PALETTE.green600,
        marginBottom: 2,
    },

    statusTime: {
        ...TYPO.c1,
        color: DS.textSecondary,
        marginTop: 2,
    },

    card: {
        backgroundColor: DS.card,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: DS.border,
        padding: 18,
        marginBottom: 18,
    },

    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
    },

    cardIcon: {
        width: 38,
        height: 38,
        borderRadius: RADIUS.md,
        backgroundColor: DS.primarySoft,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },

    dangerIcon: {
        backgroundColor: DS.redSoft,
    },

    orangeIcon: {
        backgroundColor: DS.orangeSoft,
    },

    cardTitle: {
        ...TYPO.s1,
        color: DS.textPrimary,
    },

    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: DS.divider,
        paddingVertical: 14,
    },

    infoLabel: {
        ...TYPO.b4,
        color: DS.textSecondary,
        flex: 1,
    },

    infoValue: {
        ...TYPO.s2,
        color: DS.textPrimary,
        flexShrink: 1,
        textAlign: "right",
    },

    greenBadge: {
        ...TYPO.c3,
        fontWeight: WEIGHT.semibold,
        letterSpacing: 0.4,
        backgroundColor: DS.greenSoft,
        color: PALETTE.green600,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        overflow: "hidden",
        alignSelf: "flex-end",
        textAlign: "center",
        minWidth: 72,
    },
});