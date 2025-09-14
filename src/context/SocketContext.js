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

    // Ask for browser notification permission on first mount
    useEffect(() => {
        try {
            if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission().catch(() => {});
            }
        } catch (_) {}
    }, []);

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

                // Play notification sound (urgent for new orders)
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.8; // Louder for new orders
                    audio.play().catch(e => console.log('Audio play failed:', e));
                    
                    // Play again after 2 seconds for urgency
                    setTimeout(() => {
                        const audio2 = new Audio('/notification.mp3');
                        audio2.volume = 0.8;
                        audio2.play().catch(e => console.log('Second audio play failed:', e));
                    }, 2000);
                } catch (e) { console.log('Audio not available'); }

                // Show browser notification or fallback alert
                const title = 'New Order Available';
                const body = `Order #${orderData.orderNumber || orderData.orderId?.toString().slice(-6) || ''} • Earn: ₹${orderData.estimatedEarnings || orderData.deliveryFee || ''}`;
                if (window.Notification && Notification.permission === 'granted') {
                    const notification = new Notification(title, { 
                        body, 
                        icon: '/logo192.png',
                        requireInteraction: true // Keep notification visible until user interacts
                    });
                    
                    // Also show an alert after 5 seconds if user hasn't interacted
                    setTimeout(() => {
                        if (!notification.clicked) {
                            alert(`📦 NEW ORDER ALERT!\n\n${body}\n\nDon't miss this opportunity!`);
                        }
                    }, 5000);
                } else {
                    alert(`📦 NEW ORDER ALERT!\n\n${body}\n\nDon't miss this opportunity!`);
                }
            });

            // Listen for order updates
            newSocket.on('orderUpdate', (orderData) => {
                console.log('📝 Order update:', orderData);
                setOrders(prev =>
                    prev.map(order =>
                        order._id === orderData._id ? orderData : order
                    )
                );

                // Notify shopper
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log('Audio play failed:', e));
                } catch (e) { }
                const title = 'Order Update';
                const body = orderData.message || `Order ${orderData.orderNumber || ''} updated`;
                if (window.Notification && Notification.permission === 'granted') {
                    new Notification(title, { body, icon: '/logo192.png' });
                } else {
                    alert(`${title}: ${body}`);
                }
            });

            // Listen for revision approval
            newSocket.on('revisionApproved', (data) => {
                console.log('✅ Revision approved:', data);
                console.log('Current orders before update:', orders);

                // Play notification sound (urgent for revision approval)
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.8;
                    audio.play().catch(e => console.log('Audio play failed:', e));
                    
                    // Play a second notification sound for emphasis
                    setTimeout(() => {
                        const audio2 = new Audio('/notification.mp3');
                        audio2.volume = 0.6;
                        audio2.play().catch(e => console.log('Second audio play failed:', e));
                    }, 1500);
                } catch (error) {
                    console.log('Audio creation failed:', error);
                }

                // Show notification
                const displayTotal = data.newTotal || data.orderData?.totalAmount || 'Updated';

                if (window.Notification && Notification.permission === 'granted') {
                    new Notification('✅ Revision Approved!', {
                        body: `Order #${data.orderNumber} revision approved. New total: ₹${displayTotal}. Proceed with final shopping!`,
                        icon: '/logo192.png',
                        requireInteraction: true
                    });
                } else {
                    alert(`✅ REVISION APPROVED!\n\nOrder #${data.orderNumber}\nNew total: ₹${displayTotal}\n\nYou can now proceed with final shopping!`);
                }
                
                // Show additional prominent alert
                setTimeout(() => {
                    alert(`🎉 Great news! Customer approved your revision for Order #${data.orderNumber}!\n\nNew total: ₹${displayTotal}\n\nProceed with final shopping now.`);
                }, 2000);

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
                            console.log('Order data received:', data.orderData);

                            // Use the orderData if available, otherwise use the newTotal
                            const updatedOrder = {
                                ...order,
                                totalAmount: data.orderData?.totalAmount || data.newTotal,
                                orderValue: {
                                    ...order.orderValue,
                                    total: data.orderData?.orderValue?.total || data.newTotal
                                },
                                status: 'final_shopping',
                                timeline: [
                                    ...(order.timeline || []),
                                    {
                                        status: 'final_shopping',
                                        timestamp: new Date(),
                                        note: 'Customer approved the revised order - proceeding with final shopping',
                                        updatedBy: 'customer'
                                    }
                                ]
                            };

                            console.log('Updated order:', updatedOrder);
                            return updatedOrder;
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

            // Listen for order status updates
            newSocket.on('orderStatusUpdate', (data) => {
                console.log('📋 Order status update:', data);

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
                    new Notification('Order Status Update', {
                        body: data.message || `Order status updated to: ${data.status}`,
                        icon: '/logo192.png'
                    });
                } else {
                    alert(data.message || `Order status updated to: ${data.status}`);
                }

                // Update the order in the orders list
                setOrders(prev =>
                    prev.map(order =>
                        order._id === data.orderId ? { ...order, status: data.status } : order
                    )
                );
            });

            // Listen for order cancellations
            newSocket.on('orderCancelled', (data) => {
                console.log('❌ Order cancelled:', data);

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
                    new Notification('Order Cancelled', {
                        body: data.message || 'An order has been cancelled',
                        icon: '/logo192.png'
                    });
                } else {
                    alert(data.message || 'An order has been cancelled');
                }

                // Remove the order from the orders list
                setOrders(prev => prev.filter(order => order._id !== data.orderId));
            });

            // Listen for revision rejections
            newSocket.on('revisionRejected', (data) => {
                console.log('❌ Revision rejected:', data);

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
                    new Notification('Revision Rejected', {
                        body: data.message || 'Customer rejected your revision',
                        icon: '/logo192.png'
                    });
                } else {
                    alert(data.message || 'Customer rejected your revision');
                }

                // Update the order status
                setOrders(prev =>
                    prev.map(order =>
                        order._id === data.orderId ? { ...order, status: 'shopping_in_progress' } : order
                    )
                );
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [shopper, SOCKET_URL, orders, updateOnlineStatus]);

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