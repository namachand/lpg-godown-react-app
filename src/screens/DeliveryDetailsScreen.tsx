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
import { COLORS } from "../constants/colors";
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
                <ActivityIndicator size="large" color={COLORS.primary} />
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
                        <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Delivery Details</Text>
                </View>

                <View style={styles.statusBox}>
                    <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.green} />
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
                        color={danger ? COLORS.orange : orange ? COLORS.orange : COLORS.primary}
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
                    blue && { color: COLORS.primary },
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
        backgroundColor: "#F5F6FA",
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
        fontSize: 22,
        fontWeight: "900",
        color: "#111827",
        marginLeft: 16,
    },

    statusBox: {
        backgroundColor: "#EAF7EE",
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
        gap: 8,
    },

    statusText: {
        fontSize: 19,
        fontWeight: "800",
        color: "#16A34A",
        marginBottom: 2,
    },

    statusTime: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
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
        borderRadius: 12,
        backgroundColor: "#EEF4FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },

    dangerIcon: {
        backgroundColor: "#FFF1F2",
    },

    orangeIcon: {
        backgroundColor: "#FFF7ED",
    },

    cardTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
    },

    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        paddingVertical: 14,
    },

    infoLabel: {
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
        flex: 1,
    },

    infoValue: {
        fontSize: 15,
        color: "#111827",
        fontWeight: "800",
        flexShrink: 1,
        textAlign: "right",
    },

    greenBadge: {
        backgroundColor: "#DCFCE7",
        color: "#16A34A",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        overflow: "hidden",
        fontSize: 13,
        fontWeight: "800",
        alignSelf: "flex-end",
        textAlign: "center",
        minWidth: 72,
    },
});