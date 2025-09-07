import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [orders, setOrders] = useState([]);
    const { shopper, updateOnlineStatus } = useAuth();

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    useEffect(() => {
        if (shopper) {
            const newSocket = io(SOCKET_URL, {
                transports: ['websocket', 'polling']
            });

            newSocket.on('connect', () => {
                console.log('🟢 Personal Shopper connected to socket');
                setConnected(true);

                // Register as personal shopper
                newSocket.emit('registerPersonalShopper', shopper.id);
            });

            newSocket.on('disconnect', () => {
                console.log('🔴 Personal Shopper disconnected from socket');
                setConnected(false);
            });

            // Listen for new orders
            newSocket.on('newOrderAvailable', (orderData) => {
                console.log('📦 New order available:', orderData);
                setOrders(prev => [orderData, ...prev]);

                // Play notification sound
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.log('Audio play failed:', e));
            });

            // Listen for order updates
            newSocket.on('orderUpdate', (orderData) => {
                console.log('📝 Order update:', orderData);
                setOrders(prev =>
                    prev.map(order =>
                        order._id === orderData._id ? orderData : order
                    )
                );
            });

            // Listen for revision approval
            newSocket.on('revisionApproved', (data) => {
                console.log('✅ Revision approved:', data);
                console.log('Current orders before update:', orders);

                // Play notification sound
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log('Audio play failed:', e));
                } catch (error) {
                    console.log('Audio creation failed:', error);
                }

                // Show notification
                if (window.Notification && Notification.permission === 'granted') {
                    new Notification('Revision Approved', {
                        body: `Order #${data.orderNumber} revision approved. New total: ₹${data.newTotal}`,
                        icon: '/logo192.png'
                    });
                } else {
                    alert(`Revision approved for Order #${data.orderNumber}. New total: ₹${data.newTotal}`);
                }

                // Update the order in the orders list
                setOrders(prev => {
                    console.log('Updating orders, looking for orderId:', data.orderId);
                    const updated = prev.map(order => {
                        console.log('Checking order:', order._id, 'against:', data.orderId);
                        // Handle both string and ObjectId comparisons
                        const orderIdMatch = order._id === data.orderId ||
                            order._id.toString() === data.orderId.toString() ||
                            order._id === data.orderId.toString() ||
                            order._id.toString() === data.orderId;

                        if (orderIdMatch) {
                            console.log('Found matching order, updating total from', order.totalAmount, 'to', data.newTotal);
                            return { ...order, totalAmount: data.newTotal, orderValue: { ...order.orderValue, total: data.newTotal } };
                        }
                        return order;
                    });
                    console.log('Updated orders:', updated);
                    return updated;
                });
            });

            // Listen for admin status updates
            newSocket.on('adminStatusUpdate', (data) => {
                console.log('👨‍💼 Admin status update:', data);

                if (data.forceStatus !== undefined) {
                    // Admin is forcing a status change - update auth context
                    updateOnlineStatus(data.isOnline);
                    setConnected(data.isOnline);

                    // Show notification to shopper
                    if (window.Notification && Notification.permission === 'granted') {
                        new Notification('Admin Status Update', {
                            body: data.message,
                            icon: '/logo192.png'
                        });
                    } else {
                        // Fallback alert if notifications not available
                        alert(data.message);
                    }

                    // If admin set to offline, disconnect socket
                    if (!data.isOnline) {
                        console.log('🔴 Admin forced offline - disconnecting socket');
                        newSocket.disconnect();
                    }
                }
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [shopper, SOCKET_URL]);

    const acceptOrder = (orderId) => {
        if (socket) {
            socket.emit('acceptOrder', { orderId, shopperId: shopper.id });
        }
    };

    const updateOrderStatus = (orderId, status, data = {}) => {
        if (socket) {
            socket.emit('updateOrderStatus', {
                orderId,
                status,
                shopperId: shopper.id,
                ...data
            });
        }
    };

    const value = {
        socket,
        connected,
        orders,
        acceptOrder,
        updateOrderStatus
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};