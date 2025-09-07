import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './OrderManagement.css';

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeOrder, setActiveOrder] = useState(null);
    const [revisionMode, setRevisionMode] = useState(false);
    const [revisedItems, setRevisedItems] = useState([]);
    const [shopperNotes, setShopperNotes] = useState('');


    useEffect(() => {
        fetchShopperOrders();

        // Set up periodic refresh to catch any missed updates
        const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing orders...');
            fetchShopperOrders();
        }, 10000); // Refresh every 10 seconds for faster updates

        return () => clearInterval(refreshInterval);
    }, []);

    const fetchShopperOrders = async () => {
        try {
            const response = await api.get('/shopper/orders/active');
            console.log('Fetched orders response:', response.data);
            if (response.data.success && response.data.orders) {
                setOrders(response.data.orders);
            } else if (response.data.orders) {
                setOrders(response.data.orders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, status, additionalData = {}) => {
        try {
            console.log('Updating order status:', { orderId, status, additionalData });
            const response = await api.put(`/shopper/orders/status`, {
                orderId,
                status,
                ...additionalData
            });

            console.log('Update response:', response.data);

            if (response.data.success !== false) {
                fetchShopperOrders();
                alert(`Order status updated to: ${status}`);
                return true;
            } else {
                alert('Failed to update order status: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Failed to update order status: ' + (error.response?.data?.message || error.message));
        }
        return false;
    };

    const handleAcceptOrder = (orderId) => {
        updateOrderStatus(orderId, 'accepted_by_shopper');
    };

    const handleArrivedAtShop = (orderId) => {
        updateOrderStatus(orderId, 'shopper_at_shop');
    };

    const handleStartShopping = (orderId) => {
        updateOrderStatus(orderId, 'shopping_in_progress');
    };

    const handleReviseOrder = (order) => {
        setActiveOrder(order);
        setRevisionMode(true);
        setRevisedItems(order.items.map(item => ({
            itemId: item._id,
            name: item.name,
            originalQuantity: item.quantity,
            originalPrice: item.price,
            quantity: item.quantity,
            price: item.price,
            isAvailable: true,
            notes: ''
        })));
    };

    const handleItemRevision = (itemId, field, value) => {
        setRevisedItems(prev => prev.map(item =>
            item.itemId === itemId ? { ...item, [field]: value } : item
        ));
    };

    const submitRevision = async () => {
        try {
            console.log('Submitting revision for order:', activeOrder._id);
            console.log('Revised items:', revisedItems);
            console.log('Shopper notes:', shopperNotes);

            const response = await api.put(`/orders/${activeOrder._id}/revise`, {
                revisedItems,
                shopperNotes
            });

            console.log('Revision response:', response.data);

            if (response.data.success) {
                setRevisionMode(false);
                setActiveOrder(null);
                setRevisedItems([]);
                setShopperNotes('');
                fetchShopperOrders();
                alert('Order revision submitted successfully!');
            } else {
                throw new Error(response.data.message || 'Failed to submit revision');
            }
        } catch (error) {
            console.error('Error submitting revision:', error);
            console.error('Error details:', error.response?.data);
            alert(error.response?.data?.message || 'Failed to submit revision');
        }
    };

    const handleFinalShopping = (orderId) => {
        updateOrderStatus(orderId, 'final_shopping');
    };

    const handleCompleteOrder = async (orderId) => {
        try {
            await api.put(`/shopper/orders/status`, {
                orderId,
                status: 'out_for_delivery'
            });
            fetchShopperOrders();
            alert('Order marked as ready for delivery!');
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Failed to complete order. Please try again.');
        }
    };


    const handleDelivered = (orderId) => {
        updateOrderStatus(orderId, 'delivered');
    };

    const getStatusActions = (order) => {
        switch (order.status) {
            case 'pending_shopper':
                return (
                    <button
                        className="action-btn accept"
                        onClick={() => handleAcceptOrder(order._id)}
                    >
                        Accept Order
                    </button>
                );

            case 'accepted_by_shopper':
                return (
                    <button
                        className="action-btn primary"
                        onClick={() => handleArrivedAtShop(order._id)}
                    >
                        I've Arrived at Shop
                    </button>
                );

            case 'shopper_at_shop':
                return (
                    <button
                        className="action-btn primary"
                        onClick={() => handleStartShopping(order._id)}
                    >
                        Start Shopping
                    </button>
                );

            case 'shopping_in_progress':
                return (
                    <div className="action-group">
                        <button
                            className="action-btn warning"
                            onClick={() => handleReviseOrder(order)}
                        >
                            Revise Order (Items Unavailable)
                        </button>
                        <button
                            className="action-btn success"
                            onClick={() => handleFinalShopping(order._id)}
                        >
                            All Items Available - Proceed
                        </button>
                    </div>
                );

            case 'customer_approved_revision':
                return (
                    <button
                        className="action-btn primary"
                        onClick={() => handleFinalShopping(order._id)}
                    >
                        Start Final Shopping
                    </button>
                );

            case 'final_shopping':
                return (
                    <button
                        className="action-btn primary"
                        onClick={() => handleCompleteOrder(order._id)}
                    >
                        Complete Order & Start Delivery
                    </button>
                );

            case 'out_for_delivery':
                return (
                    <button
                        className="action-btn success"
                        onClick={() => handleDelivered(order._id)}
                    >
                        Mark as Delivered & Collect Payment
                    </button>
                );

            default:
                return null;
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending_shopper': { text: 'New Order', class: 'new' },
            'accepted_by_shopper': { text: 'Accepted', class: 'accepted' },
            'shopper_at_shop': { text: 'At Shop', class: 'in-progress' },
            'shopping_in_progress': { text: 'Shopping', class: 'in-progress' },
            'shopper_revised_order': { text: 'Revision Sent', class: 'warning' },
            'customer_reviewing_revision': { text: 'Customer Reviewing', class: 'warning' },
            'customer_approved_revision': { text: 'Revision Approved', class: 'success' },
            'final_shopping': { text: 'Final Shopping', class: 'in-progress' },
            'out_for_delivery': { text: 'Out for Delivery', class: 'delivery' },
            'delivered': { text: 'Delivered', class: 'completed' }
        };

        const config = statusConfig[status] || { text: status, class: 'default' };
        return <span className={`status-badge ${config.class}`}>{config.text}</span>;
    };

    if (loading) {
        return (
            <div className="order-management">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading orders...</p>
                </div>
            </div>
        );
    }

    if (revisionMode && activeOrder) {
        return (
            <div className="order-management">
                <div className="revision-modal">
                    <div className="revision-header">
                        <h2>Revise Order #{activeOrder.orderNumber}</h2>
                        <p>Update quantities and mark unavailable items</p>
                    </div>

                    <div className="revision-content">
                        {revisedItems.map((item, index) => (
                            <div key={item.itemId} className="revision-item">
                                <div className="item-info">
                                    <h4>{item.name}</h4>
                                    <p>Original: {item.originalQuantity} × ₹{item.originalPrice}</p>
                                </div>

                                <div className="revision-controls">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={item.isAvailable}
                                            onChange={(e) => handleItemRevision(item.itemId, 'isAvailable', e.target.checked)}
                                        />
                                        Available
                                    </label>

                                    {item.isAvailable && (
                                        <>
                                            <div className="input-group">
                                                <label>Quantity:</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemRevision(item.itemId, 'quantity', parseInt(e.target.value))}
                                                />
                                            </div>

                                            <div className="input-group">
                                                <label>Price:</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.price}
                                                    onChange={(e) => handleItemRevision(item.itemId, 'price', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="input-group">
                                        <label>Notes:</label>
                                        <input
                                            type="text"
                                            placeholder="Reason for change..."
                                            value={item.notes}
                                            onChange={(e) => handleItemRevision(item.itemId, 'notes', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="revision-notes">
                            <label>Overall Notes for Customer:</label>
                            <textarea
                                value={shopperNotes}
                                onChange={(e) => setShopperNotes(e.target.value)}
                                placeholder="Explain the changes to the customer..."
                                rows="3"
                            />
                        </div>

                        <div className="revision-actions">
                            <button
                                className="action-btn secondary"
                                onClick={() => setRevisionMode(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-btn primary"
                                onClick={submitRevision}
                            >
                                Submit Revision to Customer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="order-management">
            <div className="orders-header">
                <div className="header-content">
                    <div>
                        <h2>Order Management</h2>
                        <p>Manage your assigned orders through their complete lifecycle</p>
                    </div>
                    <button
                        className="refresh-btn"
                        onClick={fetchShopperOrders}
                        title="Refresh orders"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="no-orders">
                    <div className="no-orders-icon">📦</div>
                    <h3>No orders assigned</h3>
                    <p>Orders will appear here once customers place them and you accept them.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <div className="order-info">
                                    <h3>Order #{order.orderNumber}</h3>
                                    {getStatusBadge(order.status)}
                                </div>
                                <div className="order-value">
                                    <span className="amount">₹{(order.totalAmount || order.orderValue?.total || 0).toFixed(2)}</span>
                                    <span className="earning">Earn: ₹{order.shopperCommission || order.orderValue?.deliveryFee || 0}</span>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="customer-info">
                                    <p><strong>Customer:</strong> {order.customerId?.name}</p>
                                    <p><strong>Phone:</strong> {order.deliveryAddress?.contactPhone || order.customerId?.phone}</p>
                                </div>

                                <div className="delivery-info">
                                    <p><strong>Delivery Address:</strong></p>
                                    <p>{order.deliveryAddress?.street}, {order.deliveryAddress?.city}</p>
                                    {order.deliveryAddress?.instructions && (
                                        <p><em>Instructions: {order.deliveryAddress.instructions}</em></p>
                                    )}
                                </div>

                                <div className="items-info">
                                    <p><strong>Items ({order.items?.length || 0}):</strong></p>
                                    <ul>
                                        {order.items?.slice(0, 3).map((item, index) => (
                                            <li key={index}>
                                                {item.name} × {item.revisedQuantity || item.quantity}
                                                {!item.isAvailable && <span className="unavailable"> (Unavailable)</span>}
                                            </li>
                                        ))}
                                        {order.items?.length > 3 && <li>...and {order.items.length - 3} more items</li>}
                                    </ul>
                                </div>
                            </div>

                            <div className="order-actions">
                                {getStatusActions(order)}
                            </div>

                            {order.status === 'customer_reviewing_revision' && (
                                <div className="revision-status">
                                    <p>✅ Revision sent to customer. Waiting for approval.</p>
                                </div>
                            )}

                            {order.status === 'customer_reviewing_revision' && (
                                <div className="revision-status">
                                    <p>⏳ Customer is reviewing your revision.</p>
                                </div>
                            )}


                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
