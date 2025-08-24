import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import OrderManagement from './OrderManagement';
import './Dashboard.css';

const Dashboard = () => {
    const { shopper, logout, updateOnlineStatus, loading } = useAuth();
    const { connected, orders, acceptOrder } = useSocket();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeOrders, setActiveOrders] = useState([]);
    const [earnings, setEarnings] = useState({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: 0
    });

    useEffect(() => {
        // Fetch active orders and earnings data
        fetchActiveOrders();
        fetchEarnings();
    }, []);

    const fetchActiveOrders = async () => {
        // Mock data for now
        setActiveOrders([]);
    };

    const fetchEarnings = async () => {
        // Mock data for now
        setEarnings({
            today: 250,
            thisWeek: 1200,
            thisMonth: 4500,
            total: shopper?.stats?.totalEarnings || 0
        });
    };

    const handleToggleOnlineStatus = async () => {
        const newStatus = !shopper?.isOnline;
        await updateOnlineStatus(newStatus);
    };

    const handleAcceptOrder = (orderId) => {
        acceptOrder(orderId);
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
                        <p className="stat-value">₹{earnings.today}</p>
                        <span className="stat-change positive">+12% from yesterday</span>
                    </div>
                </div>
                
                <div className="stat-card orders">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <h3>Active Orders</h3>
                        <p className="stat-value">{activeOrders.length}</p>
                        <span className="stat-change">Currently in progress</span>
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
            
            {orders.length === 0 ? (
                <div className="no-orders">
                    <div className="no-orders-icon">📱</div>
                    <h4>No orders available right now</h4>
                    <p>Make sure you're online to receive orders</p>
                    <p>Orders typically increase during peak hours (11AM-2PM, 6PM-9PM)</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order._id} className="order-card enhanced">
                            <div className="order-header">
                                <div className="order-info">
                                    <h4>Order #{order._id?.slice(-6)}</h4>
                                    <span className="order-time">2 mins ago</span>
                                </div>
                                <div className="order-value">
                                    <span className="order-amount">₹{order.totalAmount}</span>
                                    <span className="estimated-earning">Earn: ₹{Math.round(order.totalAmount * 0.1)}</span>
                                </div>
                            </div>
                            
                            <div className="order-details">
                                <div className="shop-info">
                                    <span className="shop-name">🏪 {order.shop?.name || 'Local Shop'}</span>
                                    <span className="shop-distance">📍 1.2 km away</span>
                                </div>
                                
                                <div className="order-items">
                                    <span>📦 {order.items?.length || 3} items</span>
                                    <span>⏱️ Est. 25 mins</span>
                                </div>
                                
                                <div className="customer-info">
                                    <span>👤 {order.customer?.name || 'Customer'}</span>
                                    <span>📍 {order.deliveryAddress || 'Delivery address'}</span>
                                </div>
                            </div>
                            
                            <div className="order-actions">
                                <button className="view-details-btn">View Details</button>
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
                    <p className="earnings-amount">₹{earnings.thisMonth}</p>
                    <span className="earnings-change positive">+15% from last month</span>
                </div>
                <div className="earnings-card">
                    <h4>This Week</h4>
                    <p className="earnings-amount">₹{earnings.thisWeek}</p>
                    <span className="earnings-change positive">+8% from last week</span>
                </div>
                <div className="earnings-card">
                    <h4>Today</h4>
                    <p className="earnings-amount">₹{earnings.today}</p>
                    <span className="earnings-change">3 orders completed</span>
                </div>
            </div>
            
            <div className="earnings-chart">
                <h4>Weekly Performance</h4>
                <div className="chart-placeholder">
                    <p>📈 Earnings chart will be displayed here</p>
                    <p>Peak days: Friday, Saturday, Sunday</p>
                </div>
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
                    Available Orders ({orders.length})
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