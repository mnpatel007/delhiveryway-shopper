import React, { useState, useEffect, useCallback } from 'react';
import api from '../core/services/api';
import { useSocket } from '../core/context/SocketContext';
import './OrderManagement.css';

// Component to display items list with expand/collapse functionality
const ItemsList = ({ items }) => {
    const [showAll, setShowAll] = useState(false);
    const displayItems = showAll ? items : items.slice(0, 3);
    const hasMoreItems = items.length > 3;

    return (
        <div className="items-list">
            <ul>
                {displayItems.map((item, index) => (
                    <li key={index}>
                        {item.name} × {item.revisedQuantity || item.quantity}
                        {!item.isAvailable && <span className="unavailable"> (Unavailable)</span>}
                    </li>
                ))}
            </ul>
            {hasMoreItems && (
                <button
                    className="toggle-items-btn"
                    onClick={() => setShowAll(!showAll)}
                    type="button"
                >
                    {showAll
                        ? `Show Less`
                        : `Show ${items.length - 3} More Items`
                    }
                </button>
            )}
        </div>
    );
};

const OrderManagement = () => {
    const { orders: socketOrders, fetchShopperOrders: socketFetchOrders } = useSocket();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeOrder, setActiveOrder] = useState(null);
    const [revisionMode, setRevisionMode] = useState(false);
    const [revisedItems, setRevisedItems] = useState([]);
    const [shopperNotes, setShopperNotes] = useState('');

    const fetchShopperOrders = useCallback(async () => {
        try {
            // Use socket fetch function for real-time updates
            if (socketFetchOrders) {
                console.log('🔄 Using socket fetch function');
                await socketFetchOrders();
            } else {
                // Fallback to direct API call
                const response = await api.get('/shopper/orders/active');
                console.log('Fetched orders response:', response.data);
                if (response.data.success && response.data.orders) {
                    setOrders(response.data.orders);
                } else if (response.data.orders) {
                    setOrders(response.data.orders);
                }
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }, [socketFetchOrders]);

    useEffect(() => {
        fetchShopperOrders();

        // Set up periodic refresh to catch any missed updates
        const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing orders...');
            fetchShopperOrders();
        }, 10000); // Refresh every 10 seconds for faster updates

        return () => clearInterval(refreshInterval);
    }, [fetchShopperOrders]);

    // Sync with socket orders for real-time updates
    useEffect(() => {
        if (socketOrders && socketOrders.length > 0) {
            console.log('🔄 Syncing with socket orders:', socketOrders);
            setOrders(socketOrders);
            setLoading(false);
        }
    }, [socketOrders]);

    // Filter orders based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredOrders(orders);
        } else {
            const filtered = orders.filter(order =>
                order.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOrders(filtered);
        }
    }, [orders, searchTerm]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
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
        setRevisedItems(prev => prev.map(item => {
            if (item.itemId !== itemId) return item;

            if (field === 'quantity') {
                const next = Number(value);
                if (!Number.isFinite(next) || next < 1) {
                    alert('You cannot decrease the quantity to zero. Instead, mark the item as Not Available.');
                    return item; // do not apply invalid change
                }
                return { ...item, quantity: Math.floor(next) };
            }

            return { ...item, [field]: value };
        }));
    };

    const submitRevision = async () => {
        try {
            // Prevent any available item with zero/invalid quantity
            const invalid = revisedItems.some(it => (it.isAvailable !== false) && (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) < 1));
            if (invalid) {
                alert('One or more items have quantity set to zero while marked Available. Please mark such items as Not Available instead.');
                return;
            }

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
                if (socketFetchOrders) {
                    await socketFetchOrders();
                } else {
                    fetchShopperOrders();
                }
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
            if (socketFetchOrders) {
                await socketFetchOrders();
            } else {
                fetchShopperOrders();
            }
            alert('Order marked as ready for delivery!');
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Failed to complete order. Please try again.');
        }
    };


    const handleDelivered = (orderId) => {
        updateOrderStatus(orderId, 'delivered');
    };

    const handleCancelOrder = async (orderId) => {
        const reason = prompt('Please provide a reason for cancelling this order:');
        if (!reason || !reason.trim()) {
            alert('Cancellation reason is required');
            return;
        }

        if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
            try {
                console.log('🚫 Cancelling order:', orderId, 'with reason:', reason.trim());

                const response = await api.put(`/shopper/orders/status`, {
                    orderId,
                    status: 'cancelled',
                    reason: reason.trim()
                });

                console.log('📋 Cancel order response:', response.data);

                if (response.data.success !== false) {
                    // Refresh orders list
                    await fetchShopperOrders();
                    alert('✅ Order cancelled successfully');
                } else {
                    alert('❌ Failed to cancel order: ' + (response.data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('❌ Error cancelling order:', error);
                alert('❌ Failed to cancel order: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    const generateOrderSummary = (order) => {
        const orderNumber = order.orderNumber || order._id?.slice(-8) || 'N/A';
        const customerName = order.customerId?.name || 'Unknown Customer';
        const customerPhone = order.deliveryAddress?.contactPhone || order.customerId?.phone || 'N/A';
        const shopName = order.shopId?.name || order.shop?.name || order.shopName || 'Shop';

        // Calculate totals
        const itemsTotal = order.items?.reduce((sum, item) => {
            const price = parseFloat(item.price || 0);
            const quantity = parseInt(item.quantity || 1);
            return sum + (price * quantity);
        }, 0) || 0;



        // Format address
        const address = order.deliveryAddress ?
            `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}${order.deliveryAddress.zipCode ? ' - ' + order.deliveryAddress.zipCode : ''}` :
            'Address not provided';

        // Format items list
        const itemsList = order.items?.map((item, index) => {
            const price = parseFloat(item.price || 0);
            const quantity = parseInt(item.quantity || 1);
            const itemTotal = price * quantity;
            return `${index + 1}. ${item.name}\n   Qty: ${quantity} × ₹${price.toFixed(2)} = ₹${itemTotal.toFixed(2)}`;
        }).join('\n\n') || 'No items';

        // Create comprehensive order summary
        const orderSummary = `🛒 *DelhiveryWay Order Details*

📋 *Order #${orderNumber}*
🏪 *Shop:* ${shopName}
📅 *Date:* ${new Date().toLocaleDateString('en-IN')}

👤 *Customer Details:*
Name: ${customerName}
Phone: ${customerPhone}

📍 *Delivery Address:*
${address}
${order.deliveryAddress?.instructions ? `\nInstructions: ${order.deliveryAddress.instructions}` : ''}

🛍️ *Items Ordered:*
${itemsList}

💰 *Order Summary:*
Items Total: ₹${itemsTotal.toFixed(2)}

📱 *Shared via DelhiveryWay Shopper App*`;

        return orderSummary;
    };

    const handleShareOrder = (order) => {
        const orderSummary = generateOrderSummary(order);

        // Check if Web Share API is available (mobile devices)
        if (navigator.share) {
            navigator.share({
                title: `Order #${order.orderNumber || 'Details'}`,
                text: orderSummary,
            }).catch((error) => {
                console.log('Error sharing:', error);
                fallbackShare(orderSummary);
            });
        } else {
            // Fallback for desktop or unsupported browsers
            fallbackShare(orderSummary, order);
        }
    };

    const fallbackShare = (orderSummary, order) => {
        // Create share options
        const encodedText = encodeURIComponent(orderSummary);
        const customerPhone = order?.deliveryAddress?.contactPhone || order?.customerId?.phone;

        // WhatsApp share (if customer phone is available)
        const whatsappUrl = customerPhone ?
            `https://wa.me/91${customerPhone.replace(/\D/g, '')}?text=${encodedText}` :
            `https://wa.me/?text=${encodedText}`;

        // SMS share (if customer phone is available)
        const smsUrl = customerPhone ?
            `sms:+91${customerPhone.replace(/\D/g, '')}?body=${encodedText}` :
            `sms:?body=${encodedText}`;

        // Create share modal
        const shareModal = document.createElement('div');
        shareModal.className = 'share-modal-overlay';
        shareModal.innerHTML = `
            <div class="share-modal">
                <div class="share-header">
                    <h3>Share Order Details</h3>
                    <button class="close-share-btn" onclick="this.closest('.share-modal-overlay').remove()">×</button>
                </div>
                <div class="share-options">
                    <a href="${whatsappUrl}" target="_blank" class="share-btn whatsapp">
                        📱 Share via WhatsApp
                    </a>
                    <a href="${smsUrl}" class="share-btn sms">
                        💬 Share via SMS
                    </a>
                    <button class="share-btn copy" onclick="
                        navigator.clipboard.writeText(\`${orderSummary.replace(/`/g, '\\`')}\`).then(() => {
                            this.textContent = '✅ Copied!';
                            setTimeout(() => this.textContent = '📋 Copy to Clipboard', 2000);
                        });
                    ">
                        📋 Copy to Clipboard
                    </button>
                </div>
                <div class="share-preview">
                    <h4>Preview:</h4>
                    <pre>${orderSummary}</pre>
                </div>
            </div>
        `;

        document.body.appendChild(shareModal);

        // Close modal when clicking outside
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.remove();
            }
        });
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
                    <div className="action-group">
                        <button
                            className="action-btn share"
                            onClick={() => handleShareOrder(order)}
                        >
                            📤 Share Order Details
                        </button>
                        <button
                            className="action-btn primary"
                            onClick={() => handleArrivedAtShop(order._id)}
                        >
                            I've Arrived at Shop
                        </button>
                        <button
                            className="action-btn cancel"
                            onClick={() => handleCancelOrder(order._id)}
                        >
                            ❌ Cancel Order
                        </button>
                    </div>
                );

            case 'shopper_at_shop':
                return (
                    <div className="action-group">
                        <button
                            className="action-btn share"
                            onClick={() => handleShareOrder(order)}
                        >
                            📤 Share Order Details
                        </button>
                        <button
                            className="action-btn primary"
                            onClick={() => handleStartShopping(order._id)}
                        >
                            Start Shopping
                        </button>
                        <button
                            className="action-btn cancel"
                            onClick={() => handleCancelOrder(order._id)}
                        >
                            ❌ Cancel Order
                        </button>
                    </div>
                );

            case 'shopping_in_progress':
                return (
                    <div className="action-group">
                        <button
                            className="action-btn share"
                            onClick={() => handleShareOrder(order)}
                        >
                            📤 Share Order Details
                        </button>
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
                        <button
                            className="action-btn cancel"
                            onClick={() => handleCancelOrder(order._id)}
                        >
                            ❌ Cancel Order
                        </button>
                    </div>
                );

            case 'customer_approved_revision':
                return (
                    <div className="action-group">
                        <button
                            className="action-btn share"
                            onClick={() => handleShareOrder(order)}
                        >
                            📤 Share Order Details
                        </button>
                        <button
                            className="action-btn primary"
                            onClick={() => handleFinalShopping(order._id)}
                        >
                            Start Final Shopping
                        </button>
                    </div>
                );

            case 'final_shopping':
                return (
                    <div className="action-group">
                        <button
                            className="action-btn share"
                            onClick={() => handleShareOrder(order)}
                        >
                            📤 Share Order Details
                        </button>
                        <button
                            className="action-btn primary"
                            onClick={() => handleCompleteOrder(order._id)}
                        >
                            Complete Order & Start Delivery
                        </button>
                    </div>
                );

            case 'out_for_delivery':
                return (
                    <div className="action-group">
                        <button
                            className="action-btn share"
                            onClick={() => handleShareOrder(order)}
                        >
                            📤 Share Order Details
                        </button>
                        <button
                            className="action-btn success"
                            onClick={() => handleDelivered(order._id)}
                        >
                            Mark as Delivered & Collect Payment
                        </button>
                    </div>
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
                                    <div className="availability-control">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={item.isAvailable}
                                                onChange={(e) => handleItemRevision(item.itemId, 'isAvailable', e.target.checked)}
                                            />
                                            Available in Store
                                        </label>
                                    </div>

                                    {item.isAvailable && (
                                        <>
                                            <div className="input-group">
                                                <label>Quantity:</label>
                                                <div className="number-input-container">
                                                    <button
                                                        type="button"
                                                        className="number-btn decrease"
                                                        onClick={() => {
                                                            const newValue = Math.max(1, item.quantity - 1);
                                                            handleItemRevision(item.itemId, 'quantity', newValue);
                                                        }}
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemRevision(item.itemId, 'quantity', parseInt(e.target.value) || 1)}
                                                        className="number-input"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="number-btn increase"
                                                        onClick={() => {
                                                            handleItemRevision(item.itemId, 'quantity', item.quantity + 1);
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="input-group">
                                                <label>Price (₹):</label>
                                                <div className="number-input-container">
                                                    <button
                                                        type="button"
                                                        className="number-btn decrease"
                                                        onClick={() => {
                                                            const newValue = Math.max(0.01, item.price - 0.5);
                                                            handleItemRevision(item.itemId, 'price', parseFloat(newValue.toFixed(2)));
                                                        }}
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={item.price}
                                                        onChange={(e) => handleItemRevision(item.itemId, 'price', parseFloat(e.target.value) || 0.01)}
                                                        className="number-input"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="number-btn increase"
                                                        onClick={() => {
                                                            const newValue = item.price + 0.5;
                                                            handleItemRevision(item.itemId, 'price', parseFloat(newValue.toFixed(2)));
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
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
                    <div className="header-controls">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search by customer name or order number..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="search-input"
                            />
                            <span className="search-icon">🔍</span>
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
            </div>

            {searchTerm && (
                <div className="search-results">
                    <p>Showing {filteredOrders.length} of {orders.length} orders</p>
                </div>
            )}

            {filteredOrders.length === 0 ? (
                <div className="no-orders">
                    <div className="no-orders-icon">📦</div>
                    <h3>{searchTerm ? 'No orders found' : 'No orders assigned'}</h3>
                    <p>{searchTerm ? 'Try adjusting your search terms' : 'Orders will appear here once customers place them and you accept them.'}</p>
                </div>
            ) : (
                <div className="orders-list">
                    {filteredOrders.map(order => (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <div className="order-info">
                                    <h3>Order #{order.orderNumber}</h3>
                                    <span className="order-time">
                                        {new Date(order.createdAt).toLocaleString('en-IN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })}
                                    </span>
                                    {getStatusBadge(order.status)}
                                </div>
                                {/* Debug: Log order data (development only) */}
                                {process.env.NODE_ENV === 'development' && console.log('🔍 Order data for display:', {
                                    orderId: order._id,
                                    status: order.status,
                                    revisedItems: order.revisedItems,
                                    originalTotal: order.orderValue?.originalTotal,
                                    currentTotal: order.orderValue?.total,
                                    totalAmount: order.totalAmount,
                                    revisedOrderValue: order.revisedOrderValue,
                                    fullOrderValue: order.orderValue
                                })}
                                <div className="order-value">
                                    <div className="total-breakdown">
                                        {(order.revisedItems && order.revisedItems.length > 0) ||
                                            (order.orderValue?.originalTotal && order.orderValue?.originalTotal !== order.orderValue?.total) ||
                                            (order.status === 'customer_reviewing_revision' || order.status === 'final_shopping' || order.status === 'out_for_delivery') ||
                                            (order.revisedOrderValue && order.revisedOrderValue.total) ? (
                                            <>
                                                <div className="total-row">
                                                    <span className="total-label">Original:</span>
                                                    <span className="amount original">₹{(order.orderValue?.originalTotal || order.totalAmount || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="total-row">
                                                    <span className="total-label">Revised:</span>
                                                    <span className="amount revised">₹{(order.orderValue?.total || order.revisedOrderValue?.total || order.totalAmount || 0).toFixed(2)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="total-row">
                                                    <span className="total-label">Total:</span>
                                                    <span className="amount no-revision">₹{(order.totalAmount || order.orderValue?.total || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="no-revision-text">No revision</div>
                                            </>
                                        )}
                                    </div>
                                    <span className="earning">Est. Earning: ₹{(order.shopperCommission || 30).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="customer-info">
                                    <h4>Customer</h4>
                                    <p><strong>Name:</strong> {order.customerId?.name || 'N/A'}</p>
                                    <p><strong>Phone:</strong> {order.customerId?.phone || 'N/A'}</p>
                                </div>

                                <div className="delivery-info">
                                    <h4>Delivery Address</h4>
                                    <p>{order.deliveryAddress?.street || 'N/A'}</p>
                                    <p>{order.deliveryAddress?.city || 'N/A'}, {order.deliveryAddress?.zipCode || ''}</p>
                                    {order.deliveryAddress?.instructions && (
                                        <p><strong>Note:</strong> {order.deliveryAddress.instructions}</p>
                                    )}
                                </div>

                                <div className="items-info">
                                    <h4>Items ({order.items?.length || 0})</h4>
                                    <ItemsList items={order.items || []} />
                                </div>

                                <div className="shop-info">
                                    <h4>Shop</h4>
                                    <p><strong>Name:</strong> {order.shopId?.name || order.shop?.name || 'N/A'}</p>
                                    <p><strong>Address:</strong> {(() => {
                                        const addr = order.shopId?.address || order.shop?.address;
                                        if (!addr) return 'N/A';
                                        if (typeof addr === 'string') return addr;
                                        return `${addr.street || ''}, ${addr.city || ''}`.replace(/^, /, '') || 'N/A';
                                    })()}</p>
                                </div>
                            </div>

                            <div className="order-actions">
                                {getStatusActions(order)}
                            </div>

                            {order.revisionNote && (
                                <div className="revision-status">
                                    <p><strong>Revision Note:</strong> {order.revisionNote}</p>
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
