import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../utils/theme';
import { orderService } from '../../services/orderService';
import { Package, MapPin, Calendar, CreditCard, ChevronLeft } from 'lucide-react-native';

export default function OrderDetailScreen({ route, navigation }) {
    const { orderId } = route.params;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrder();
    }, []);

    const loadOrder = async () => {
        try {
            const data = await orderService.getOrderById(orderId);
            setOrder(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.neonGreen} size="large" />
            </View>
        );
    }

    if (!order) return null;

    return (
        <ScrollView style={styles.container}>
            {/* cabecera con el estado */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.orderTitle}>Pedido #{order.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                    </View>
                </View>
                <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString()} a las {new Date(order.createdAt).toLocaleTimeString()}</Text>
            </View>

            {/* lista de productos */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Productos</Text>
                {order.items?.map((item, index) => (
                    <View key={index} style={styles.productItem}>
                        <Image
                            source={{ uri: item.product?.imageUrl || 'https://via.placeholder.com/60' }}
                            style={styles.productImage}
                        />
                        <View style={styles.productInfo}>
                            <Text style={styles.productName}>{item.product?.name || 'Producto eliminado'}</Text>
                            <Text style={styles.productMeta}>Cant: {item.quantity} x €{item.price}</Text>
                        </View>
                        <Text style={styles.productTotal}>€{(item.quantity * item.price).toFixed(2)}</Text>
                    </View>
                ))}
            </View>

            {/* resumen del pedido */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resumen</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>€{order.total_amount}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Envío</Text>
                    <Text style={styles.summaryValue}>Gratis</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>€{order.total_amount}</Text>
                </View>
            </View>

            {/* dirección de envío (si no está en la BD mostramos un valor por defecto) */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MapPin size={20} color={colors.neonGreen} />
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Dirección de Envío</Text>
                </View>
                <Text style={styles.addressText}>{order.shipping_address || 'Dirección guardada en perfil'}</Text>
            </View>
        </ScrollView>
    );
}

const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return '#fbbf2430';
        case 'processing': return '#3b82f630';
        case 'shipped': return '#8b5cf630';
        case 'delivered': return '#22c55e30';
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
    header: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    orderTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
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
    date: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
    },
    section: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    productImage: {
        width: 50,
        height: 50,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.cardBg,
    },
    productInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    productName: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    productMeta: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
    },
    productTotal: {
        color: colors.textPrimary,
        fontWeight: 'bold',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    summaryLabel: {
        color: colors.textSecondary,
    },
    summaryValue: {
        color: colors.textPrimary,
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderColor,
    },
    totalLabel: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: fontSize.lg,
    },
    totalValue: {
        color: colors.neonGreen,
        fontWeight: 'bold',
        fontSize: fontSize.lg,
    },
    addressText: {
        color: colors.textSecondary,
        lineHeight: 20,
    }
});
