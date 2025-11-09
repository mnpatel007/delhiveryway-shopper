import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import OrderManagement from './OrderManagement';
import Logo from '../components/Logo';
import UPIReminder from '../components/UPIReminder';
import './Dashboard.css';

// Force CSS to load immediately
const dashboardStyles = `
.dashboard { 
    min-height: 100vh !important; 
    background-color: #f8f9fa !important; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif !important; 
}
.dashboard .order-card.enhanced { 
    background: white !important; 
    border-radius: 12px !important; 
    padding: 25px !important; 
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important; 
    border: 1px solid #e9ecef !important; 
    margin-bottom: 20px !important; 
    display: block !important; 
    width: 100% !important; 
}
`;

// Inject styles immediately
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = dashboardStyles;
    document.head.appendChild(styleElement);
}

const Dashboard = () => {
    const { shopper, logout, updateOnlineStatus, loading } = useAuth();
    const { connected, orders } = useSocket();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeOrders, setActiveOrders] = useState([]);
    const [earnings, setEarnings] = useState({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: 0
    });
    const [earningsLoading, setEarningsLoading] = useState(true);
    const [orderHistory, setOrderHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [upiSetup, setUpiSetup] = useState({ isSetup: false, loading: true });
    const [showUPIReminder, setShowUPIReminder] = useState(true);


    const fetchEarnings = useCallback(async () => {
        try {
            setEarningsLoading(true);
            console.log('Fetching earnings for shopper:', shopper?._id);
            const response = await api.get('/shopper/earnings');
            console.log('Earnings response:', response.data);

            if (response.data.success && response.data.data) {
                setEarnings(response.data.data);
            } else {
                console.log('No earnings data, using fallback');
                // Fallback to shopper stats or zero
                setEarnings({
                    today: 0,
                    thisWeek: 0,
                    thisMonth: 0,
                    total: shopper?.stats?.totalEarnings || 0
                });
            }
        } catch (error) {
            console.error('Error fetching earnings:', error);
            console.error('Error details:', error.response?.data);
            // Set fallback values on error
            setEarnings({
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                total: shopper?.stats?.totalEarnings || 0
            });
        } finally {
            setEarningsLoading(false);
        }
    }, [shopper?._id, shopper?.stats?.totalEarnings]);

    useEffect(() => {
        // Fetch active orders and earnings data immediately
        const initializeData = async () => {
            await Promise.all([
                fetchActiveOrders(),
                fetchEarnings(),
                fetchOrderHistory(),
                fetchUPIStatus()
            ]);
        };

        initializeData();
    }, [fetchEarnings]);

    // Sync socket orders with activeOrders state, but only if they have complete data
    useEffect(() => {
        if (orders && orders.length > 0) {
            // Filter out orders that don't have proper amount data
            const validOrders = orders.filter(order => {
                const hasValidAmount = order.totalAmount > 0 ||
                    order.orderValue?.total > 0 ||
                    order.amount > 0 ||
                    order.finalAmount > 0;
                return hasValidAmount;
            });

            if (validOrders.length > 0) {
                setActiveOrders(validOrders);
            } else {
                // If socket orders don't have valid amounts, fetch from API
                fetchActiveOrders();
            }
        }
    }, [orders]);

    const fetchOrderHistory = async () => {
        try {
            console.log('🔄 Fetching order history...');
            const response = await api.get('/shopper/orders/completed');
            console.log('📦 Order history response:', response.data);
            if (response.data.success) {
                const orders = response.data.data.orders || [];
                console.log('📦 Orders with shop data:', orders.map(o => ({
                    id: o._id,
                    shopId: o.shopId,
                    shopName: o.shopId?.name,
                    date: o.deliveredAt || o.updatedAt
                })));

                // Sort orders by date (most recent first)
                const sortedOrders = orders.sort((a, b) => {
                    const dateA = new Date(a.deliveredAt || a.updatedAt || a.createdAt);
                    const dateB = new Date(b.deliveredAt || b.updatedAt || b.createdAt);
                    return dateB - dateA; // Descending order (newest first)
                });

                console.log('📦 Sorted orders by date:', sortedOrders.map(o => ({
                    id: o._id?.slice(-8),
                    date: new Date(o.deliveredAt || o.updatedAt || o.createdAt).toLocaleDateString()
                })));

                setOrderHistory(sortedOrders);
            }
        } catch (error) {
            console.error('Error fetching order history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchUPIStatus = async () => {
        try {
            const response = await api.get('/shopper/upi/status');
            if (response.data.success) {
                setUpiSetup({
                    isSetup: response.data.data.isSetup,
                    upiId: response.data.data.upiId,
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error fetching UPI status:', error);
            setUpiSetup({ isSetup: false, loading: false });
        }
    };

    const fetchActiveOrders = async () => {
        try {
            console.log('🔄 Fetching available orders...');
            const response = await api.get('/shopper/orders/available');
            if (response.data.success) {
                const orders = response.data.data.orders || [];
                console.log('📦 Raw orders data:', orders);

                // Log each order's amount data for debugging
                orders.forEach((order, index) => {
                    console.log(`📦 Order ${index + 1} amounts:`, {
                        id: order._id,
                        totalAmount: order.totalAmount,
                        orderValue: order.orderValue,
                        amount: order.amount,
                        finalAmount: order.finalAmount,
                        items: order.items?.length || 0
                    });
                });

                setActiveOrders(orders);
                console.log('✅ Available orders set:', orders.length);
            }
        } catch (error) {
            console.error('❌ Error fetching available orders:', error);
            setActiveOrders([]);
        }
    };


    const handleToggleOnlineStatus = async () => {
        const newStatus = !shopper?.isOnline;
        await updateOnlineStatus(newStatus);
    };

    const handleAcceptOrder = async (orderId) => {
        try {
            console.log('Attempting to accept order:', orderId);
            const response = await api.post('/shopper/orders/accept', { orderId }); // Route exists in backend shopperOrderRoutes
            console.log('Accept order response:', response.data);

            if (response.data.success !== false) {
                // Remove the accepted order from available orders
                setActiveOrders(prev => prev.filter(order => order._id !== orderId));
                alert('Order accepted successfully! Check Order Management tab to track progress.');
                // Switch to Order Management tab to show the accepted order
                setActiveTab('manage-orders');
            } else {
                alert('Failed to accept order: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            alert('Failed to accept order: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleViewDetails = (order) => {
        console.log('🔍 Order details for modal:', order);

        const itemsTotal = (order.items || []).reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
        const amount = (
            order.totalAmount ||
            order.orderValue?.total ||
            (itemsTotal + (order.orderValue?.deliveryFee || 0)) ||
            0
        ).toFixed(2);

        const orderId = order.orderNumber || order._id || 'Unknown';
        const customerName = order.customerId?.name || order.customer?.name || 'Unknown Customer';
        const itemCount = order.items?.length || 0;
        const address = order.deliveryAddress?.street ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'Haverest Residency, Vadodara';

        alert(`Order Details:\n\nOrder ID: ${orderId}\nCustomer: ${customerName}\nTotal: ₹${amount}\nItems: ${itemCount}\nDelivery: ${address}`);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (!shopper) {
        return (
            <div className="dashboard-error">
                <h2>Authentication Required</h2>
                <p>Please log in to access the shopper dashboard.</p>
                <button onClick={() => window.location.href = '/login'}>
                    Go to Login
                </button>
            </div>
        );
    }

    const renderDashboard = () => (
        <div className="dashboard-overview">
            <div className="stats-grid">
                <div className="stat-card earnings">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>Today's Earnings</h3>
                        <p className="stat-value">
                            {earningsLoading ? '...' : `₹${earnings.today || 0}`}
                        </p>
                        <span className="stat-change positive">+12% from yesterday</span>
                    </div>
                </div>

                <div className="stat-card orders">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <h3>Available Orders</h3>
                        <p className="stat-value">{activeOrders.length}</p>
                        <span className="stat-change">Ready to accept</span>
                    </div>
                </div>

                <div className="stat-card rating">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-content">
                        <h3>Rating</h3>
                        <p className="stat-value">{shopper?.rating?.average || 5.0}</p>
                        <span className="stat-change">Based on {shopper?.rating?.count || 0} reviews</span>
                    </div>
                </div>

                <div className="stat-card completion">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Completion Rate</h3>
                        <p className="stat-value">98%</p>
                        <span className="stat-change positive">Excellent performance</span>
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                    <button className="action-btn" onClick={() => setActiveTab('orders')}>
                        <span className="action-icon">🛒</span>
                        View Available Orders
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab('earnings')}>
                        <span className="action-icon">📊</span>
                        Earnings Report
                    </button>
                    <button className="action-btn" onClick={() => setActiveTab('profile')}>
                        <span className="action-icon">👤</span>
                        Update Profile
                    </button>
                </div>
            </div>
        </div>
    );

    const renderOrders = () => (
        <div className="orders-section">
            <div className="orders-header">
                <h3>Available Orders</h3>
                <div className="orders-filter">
                    <select>
                        <option>All Orders</option>
                        <option>High Value (₹500+)</option>
                        <option>Nearby (2km)</option>
                        <option>Grocery</option>
                        <option>Pharmacy</option>
                    </select>
                </div>
            </div>

            {activeOrders.length === 0 ? (
                <div className="no-orders">
                    <div className="no-orders-icon">📱</div>
                    <h4>No orders available right now</h4>
                    <p>Make sure you're online to receive orders</p>
                    <p>Orders typically increase during peak hours (11AM-2PM, 6PM-9PM)</p>
                </div>
            ) : (
                <div className="orders-list">
                    {activeOrders.map(order => (
                        <div key={order._id} className="order-card enhanced" style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '25px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e9ecef',
                            marginBottom: '20px',
                            display: 'block',
                            width: '100%'
                        }}>
                            {/* Debug: Log order data (development only) */}
                            {process.env.NODE_ENV === 'development' && console.log('🔍 Order data:', {
                                id: order._id,
                                orderNumber: order.orderNumber,
                                totalAmount: order.totalAmount,
                                orderValue: order.orderValue,
                                shopId: order.shopId,
                                shopName: order.shopId?.name,
                                amount: order.amount,
                                finalAmount: order.finalAmount,
                                shopperCommission: order.shopperCommission,
                                deliveryFee: order.deliveryFee
                            })}
                            <div className="order-header">
                                <div className="order-info">
                                    <h4>Order #{order.orderNumber || order._id?.slice(-8)}</h4>
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
                                </div>
                                <div className="order-value">
                                    {(() => {
                                        // Calculate order amount with better fallback logic
                                        let orderAmount = 0;

                                        if (order.totalAmount && order.totalAmount > 0) {
                                            orderAmount = order.totalAmount;
                                        } else if (order.orderValue?.total && order.orderValue.total > 0) {
                                            orderAmount = order.orderValue.total;
                                        } else if (order.amount && order.amount > 0) {
                                            orderAmount = order.amount;
                                        } else if (order.finalAmount && order.finalAmount > 0) {
                                            orderAmount = order.finalAmount;
                                        } else if (order.items && order.items.length > 0) {
                                            // Calculate from items if no total is available
                                            const itemsTotal = order.items.reduce((sum, item) => {
                                                return sum + ((item.price || 0) * (item.quantity || 1));
                                            }, 0);
                                            const deliveryFee = order.orderValue?.deliveryFee || order.deliveryFee || 30;
                                            orderAmount = itemsTotal + deliveryFee;
                                        } else {
                                            orderAmount = 0;
                                        }

                                        return (
                                            <span className="order-amount">
                                                {orderAmount > 0 ? `₹${orderAmount.toFixed(2)}` : 'Loading...'}
                                            </span>
                                        );
                                    })()}
                                    <span className="estimated-earning">Earn: ₹{(order.shopperCommission || order.orderValue?.deliveryFee || order.deliveryFee || 30).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="shop-info">
                                    <span className="shop-name">🏪 {order.shopId?.name || order.shop?.name || order.shopName || 'Shop'}</span>
                                    <span className="shop-distance">📍 1.2 km away</span>
                                </div>

                                <div className="order-items">
                                    <span>📦 {order.items?.length || 3} items</span>
                                    <span>⏱️ Est. 25 mins</span>
                                </div>

                                <div className="customer-info">
                                    <span>👤 {order.customerId?.name || order.customer?.name || 'Customer'}</span>
                                    <span>📍 {order.deliveryAddress?.street ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : '111 Eastview Gate, Brampton'}</span>
                                </div>
                            </div>

                            <div className="order-actions">
                                <button
                                    className="view-details-btn"
                                    onClick={() => handleViewDetails(order)}
                                >
                                    View Details
                                </button>
                                <button
                                    className="accept-btn"
                                    onClick={() => handleAcceptOrder(order._id)}
                                >
                                    Accept Order
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderEarnings = () => (
        <div className="earnings-section">
            <div className="earnings-summary">
                <div className="earnings-card">
                    <h4>This Month</h4>
                    <p className="earnings-amount">
                        {earningsLoading ? '...' : `₹${earnings.thisMonth || 0}`}
                    </p>
                    <span className="earnings-change positive">+15% from last month</span>
                </div>
                <div className="earnings-card">
                    <h4>This Week</h4>
                    <p className="earnings-amount">
                        {earningsLoading ? '...' : `₹${earnings.thisWeek || 0}`}
                    </p>
                    <span className="earnings-change positive">+8% from last week</span>
                </div>
                <div className="earnings-card">
                    <h4>Today</h4>
                    <p className="earnings-amount">
                        {earningsLoading ? '...' : `₹${earnings.today || 0}`}
                    </p>
                    <span className="earnings-change">Orders completed today</span>
                </div>
            </div>

            <div className="order-history">
                <h4>Order History & Earnings</h4>
                {historyLoading ? (
                    <div className="loading">Loading order history...</div>
                ) : orderHistory.length === 0 ? (
                    <div className="no-history">
                        <p>No completed orders yet</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {orderHistory.map(order => {
                            // Use shopperCommission if available, otherwise deliveryFee
                            const orderAmount = order.totalAmount || order.actualBill?.amount || order.orderValue?.total || 0;
                            const earning = order.shopperCommission || order.orderValue?.deliveryFee || 0;
                            const deliveryAddress = order.deliveryAddress;
                            const addressStr = typeof deliveryAddress === 'string'
                                ? deliveryAddress
                                : deliveryAddress
                                    ? `${deliveryAddress.street || ''}, ${deliveryAddress.city || ''}`.trim().replace(/^,/, '')
                                    : 'N/A';

                            return (
                                <div key={order._id} className="history-item">
                                    <div className="order-info">
                                        <div className="order-id">Order #{order.orderNumber || order._id?.slice(-8)}</div>
                                        <div className="order-date">
                                            {(() => {
                                                const date = new Date(order.deliveredAt || order.updatedAt || order.createdAt);
                                                const now = new Date();
                                                const diffTime = Math.abs(now - date);
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                if (diffDays === 1) {
                                                    return 'Today';
                                                } else if (diffDays === 2) {
                                                    return 'Yesterday';
                                                } else if (diffDays <= 7) {
                                                    return `${diffDays - 1} days ago`;
                                                } else {
                                                    return date.toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    });
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    <div className="order-details">
                                        <div className="customer">👤 {order.customerId?.name || 'Customer'}</div>
                                        <div className="delivery-address">📍 {addressStr}</div>
                                        <div className="shop">🏪 {order.shopId?.name || order.shop?.name || order.shopName || 'Shop'}</div>
                                    </div>
                                    <div className="order-earnings">
                                        {/* Debug: Log order data (development only) */}
                                        {process.env.NODE_ENV === 'development' && console.log('🔍 Dashboard order data:', {
                                            orderId: order._id,
                                            status: order.status,
                                            shopId: order.shopId,
                                            shopName: order.shopId?.name,
                                            shop: order.shop,
                                            revisedItems: order.revisedItems,
                                            originalTotal: order.orderValue?.originalTotal,
                                            currentTotal: order.orderValue?.total,
                                            totalAmount: order.totalAmount,
                                            orderAmount: orderAmount
                                        })}
                                        <div className="order-totals-breakdown">
                                            {(order.revisedItems && order.revisedItems.length > 0) ||
                                                (order.orderValue?.originalTotal && order.orderValue?.originalTotal !== order.orderValue?.total) ||
                                                (order.status === 'customer_reviewing_revision' || order.status === 'final_shopping' || order.status === 'out_for_delivery') ||
                                                (order.revisedOrderValue && order.revisedOrderValue.total) ||
                                                (order.totalAmount && order.totalAmount !== orderAmount) ||
                                                (order.orderValue?.total && order.orderValue?.total !== orderAmount) ? (
                                                <>
                                                    <div className="total-row">
                                                        <span className="total-label">Actual:</span>
                                                        <span className="amount original">₹{(order.totalAmount || order.orderValue?.total || 0).toFixed(2)}</span>
                                                    </div>
                                                    <div className="total-row">
                                                        <span className="total-label">Revision:</span>
                                                        <span className="amount revised">₹{(order.orderValue?.originalTotal || order.revisedOrderValue?.total || order.orderValue?.total || 0).toFixed(2)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="total-row">
                                                        <span className="total-label">Total:</span>
                                                        <span className="amount no-revision">₹{(order.totalAmount || order.orderValue?.total || orderAmount || 0).toFixed(2)}</span>
                                                    </div>
                                                    <div className="no-revision-text">No revision</div>
                                                </>
                                            )}
                                        </div>
                                        <div className="earning-amount">Earned: ₹{earning}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="profile-section">
            <div className="profile-header">
                <div className="profile-avatar">
                    <img src={shopper?.profilePicture || '/default-avatar.png'} alt="Profile" />
                    <button className="edit-avatar">📷</button>
                </div>
                <div className="profile-info">
                    <h3>{shopper?.name}</h3>
                    <p>{shopper?.email}</p>
                    <p>{shopper?.phone}</p>
                    <div className="verification-status">
                        {shopper?.verification?.isVerified ? (
                            <span className="verified">✅ Verified Shopper</span>
                        ) : (
                            <span className="unverified">⏳ Verification Pending</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="profile-stats">
                <div className="stat">
                    <span className="stat-value">{shopper?.stats?.totalOrders || 0}</span>
                    <span className="stat-label">Total Orders</span>
                </div>
                <div className="stat">
                    <span className="stat-value">₹{shopper?.stats?.totalEarnings || 0}</span>
                    <span className="stat-label">Total Earnings</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{shopper?.rating?.average || 5.0}</span>
                    <span className="stat-label">Rating</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{shopper?.stats?.avgDeliveryTime || 25} min</span>
                    <span className="stat-label">Avg Delivery</span>
                </div>
            </div>

            <div className="profile-settings">
                <h4>Settings</h4>
                <div className="settings-grid">
                    <div className="setting-item">
                        <span>🚗 Vehicle Type</span>
                        <select defaultValue={shopper?.preferences?.vehicleType || 'bike'}>
                            <option value="bike">Bike</option>
                            <option value="car">Car</option>
                            <option value="bicycle">Bicycle</option>
                            <option value="walking">Walking</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <span>💰 Max Order Value</span>
                        <input
                            type="number"
                            defaultValue={shopper?.preferences?.maxOrderValue || 5000}
                            placeholder="₹5000"
                        />
                    </div>
                    <div className="setting-item">
                        <span>📍 Working Areas</span>
                        <input
                            type="text"
                            placeholder="Add preferred areas"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard" style={{
            minHeight: '100vh',
            backgroundColor: '#f8f9fa',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif'
        }}>
            <header className="dashboard-header" style={{
                background: 'white',
                padding: '20px',
                borderBottom: '1px solid #e9ecef',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div className="header-left">
                    <Logo size="large" showText={true} />
                    <h1>Personal Shopper Dashboard</h1>
                    <div className="status-indicator">
                        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
                <div className="header-right">
                    <div className="online-toggle">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={shopper?.isOnline}
                                onChange={handleToggleOnlineStatus}
                            />
                            <span className="slider"></span>
                        </label>
                        <span className={shopper?.isOnline ? 'online' : 'offline'}>
                            {shopper?.isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <button className="logout-btn" onClick={logout}>
                        Logout
                    </button>
                </div>
            </header>

            {/* UPI Setup Reminder */}
            {!upiSetup.loading && !upiSetup.isSetup && showUPIReminder && (
                <UPIReminder onDismiss={() => setShowUPIReminder(false)} />
            )}

            <nav className="dashboard-nav">
                <button
                    className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <span className="nav-icon">🏠</span>
                    Dashboard
                </button>
                <button
                    className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                >
                    <span className="nav-icon">📦</span>
                    Available Orders ({activeOrders.length})
                </button>
                <button
                    className={`nav-btn ${activeTab === 'manage-orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('manage-orders')}
                >
                    <span className="nav-icon">🛠️</span>
                    Manage Orders
                </button>
                <button
                    className={`nav-btn ${activeTab === 'earnings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('earnings')}
                >
                    <span className="nav-icon">💰</span>
                    Earnings
                </button>
                <button
                    className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <span className="nav-icon">👤</span>
                    Profile
                </button>
            </nav>

            <main className="dashboard-content">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'manage-orders' && <OrderManagement />}
                {activeTab === 'earnings' && renderEarnings()}
                {activeTab === 'profile' && renderProfile()}
            </main>
        </div>
    );
};

export default Dashboard;