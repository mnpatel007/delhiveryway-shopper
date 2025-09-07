import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import OrderManagement from './OrderManagement';
import './Dashboard.css';

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
        // Fetch active orders and earnings data
        fetchActiveOrders();
        fetchEarnings();
        fetchOrderHistory();
    }, [fetchEarnings]);

    // Sync socket orders with activeOrders state
    useEffect(() => {
        if (orders && orders.length > 0) {
            setActiveOrders(orders);
        }
    }, [orders]);

    const fetchOrderHistory = async () => {
        try {
            const response = await api.get('/shopper/orders/completed');
            if (response.data.success) {
                setOrderHistory(response.data.data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching order history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchActiveOrders = async () => {
        try {
            const response = await api.get('/shopper/orders/available');
            if (response.data.success) {
                setActiveOrders(response.data.data.orders || []);
                console.log('Available orders fetched:', response.data.data.orders?.length || 0);
            }
        } catch (error) {
            console.error('Error fetching available orders:', error);
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
            const response = await api.post('/shopper/orders/accept', { orderId });
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
        alert(`Order Details:\n\nOrder ID: ${order._id}\nCustomer: ${order.customerId?.name || 'N/A'}\nTotal: ₹${order.totalAmount}\nItems: ${order.items?.length || 0}\nDelivery: ${order.deliveryAddress?.street ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'N/A'}`);
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
                        <div key={order._id} className="order-card enhanced">
                            <div className="order-header">
                                <div className="order-info">
                                    <h4>Order #{order.orderNumber || order._id?.slice(-8)}</h4>
                                    <span className="order-time">2 mins ago</span>
                                </div>
                                <div className="order-value">
                                    <span className="order-amount">₹{order.totalAmount || order.orderValue?.total || 0}</span>
                                    <span className="estimated-earning">Earn: ₹{order.shopperCommission || order.orderValue?.deliveryFee || 0}</span>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="shop-info">
                                    <span className="shop-name">🏪 {order.shopId?.name || order.shop?.name || 'Local Shop'}</span>
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
                                            {new Date(order.deliveredAt || order.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="order-details">
                                        <div className="customer">👤 {order.customerId?.name || 'Customer'}</div>
                                        <div className="delivery-address">📍 {addressStr}</div>
                                        <div className="shop">🏪 {order.shopId?.name || 'Shop'}</div>
                                    </div>
                                    <div className="order-earnings">
                                        {/* Debug: Log order data */}
                                        {console.log('🔍 Dashboard order data:', {
                                            orderId: order._id,
                                            status: order.status,
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
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-left">
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