import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Dashboard.css';

const Dashboard = () => {
    const { shopper, logout, updateOnlineStatus } = useAuth();
    const { connected, orders, acceptOrder } = useSocket();
    const [activeTab, setActiveTab] = useState('orders');

    const handleToggleOnline = async () => {
        await updateOnlineStatus(!shopper.isOnline);
    };

    const handleAcceptOrder = (orderId) => {
        acceptOrder(orderId);
    };

    const renderOrders = () => (
        <div className="orders-section">
            <h3>Available Orders</h3>
            {orders.length === 0 ? (
                <div className="no-orders">
                    <p>No orders available right now</p>
                    <p>Make sure you're online to receive orders</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <h4>Order #{order._id.slice(-6)}</h4>
                                <span className="order-amount">₹{order.totalAmount}</span>
                            </div>
                            <div className="order-details">
                                <p><strong>Shop:</strong> {order.shop?.name}</p>
                                <p><strong>Items:</strong> {order.items?.length} items</p>
                                <p><strong>Customer:</strong> {order.customer?.name}</p>
                                <p><strong>Address:</strong> {order.deliveryAddress}</p>
                            </div>
                            <button 
                                className="accept-btn"
                                onClick={() => handleAcceptOrder(order._id)}
                            >
                                Accept Order
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderProfile = () => (
        <div className="profile-section">
            <h3>Profile</h3>
            <div className="profile-card">
                <div className="profile-info">
                    <h4>{shopper.name}</h4>
                    <p>{shopper.email}</p>
                    <p>{shopper.phone}</p>
                </div>
                <div className="profile-stats">
                    <div className="stat">
                        <span className="stat-value">{shopper.totalOrders || 0}</span>
                        <span className="stat-label">Total Orders</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">₹{shopper.earnings || 0}</span>
                        <span className="stat-label">Earnings</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{shopper.rating || 5.0}</span>
                        <span className="stat-label">Rating</span>
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
                                checked={shopper.isOnline}
                                onChange={handleToggleOnline}
                            />
                            <span className="slider"></span>
                        </label>
                        <span>{shopper.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <button className="logout-btn" onClick={logout}>
                        Logout
                    </button>
                </div>
            </header>

            <nav className="dashboard-nav">
                <button 
                    className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                >
                    Orders ({orders.length})
                </button>
                <button 
                    className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
            </nav>

            <main className="dashboard-content">
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'profile' && renderProfile()}
            </main>
        </div>
    );
};

export default Dashboard;