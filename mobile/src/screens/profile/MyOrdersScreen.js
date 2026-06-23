import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../utils/theme';
import { orderService } from '../../services/orderService';
import { Package, ChevronRight, Calendar } from 'lucide-react-native';

export default function MyOrdersScreen({ navigation }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await orderService.getMyOrders();
            setOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const renderOrder = ({ item }) => (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        >
            <View style={styles.orderHeader}>
                <View style={styles.orderIcon}>
                    <Package size={20} color={colors.neonGreen} />
                </View>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>Pedido #{item.id}</Text>
                    <View style={styles.dateContainer}>
                        <Calendar size={12} color={colors.textSecondary} />
                        <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
            </View>

            <View style={styles.orderFooter}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>€{item.total_amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.neonGreen} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={orders}
                renderItem={renderOrder}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No tienes pedidos aún</Text>
                    </View>
                }
            />
        </View>
    );
}

const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return '#fbbf2430'; // Yellow
        case 'processing': return '#3b82f630'; // Blue
        case 'shipped': return '#8b5cf630'; // Purple
        case 'delivered': return '#22c55e30'; // Green
        default: return '#9ca3af30';
    }
};

const getStatusLabel = (status) => {
    const labels = {
        pending: 'Pendiente',
        processing: 'Procesando',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.darkBg,
    },
    list: {
        padding: spacing.md,
    },
    orderCard: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderColor,
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    orderIcon: {
        backgroundColor: `${colors.neonGreen}20`,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginRight: spacing.md,
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: fontSize.md,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    orderDate: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
    },
    orderFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderColor,
    },
    totalLabel: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
    },
    totalValue: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: fontSize.lg,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statusText: {
        color: colors.textPrimary,
        fontSize: fontSize.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
    }
});
