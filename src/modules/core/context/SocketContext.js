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
            if ('Notification' in window) {
                console.log('🔔 Current notification permission:', Notification.permission);

                if (Notification.permission === 'default') {
                    console.log('🔔 Requesting notification permission...');
                    Notification.requestPermission().then(permission => {
                        console.log('🔔 Notification permission result:', permission);
                        if (permission === 'granted') {
                            console.log('✅ Notifications enabled!');
                        } else {
                            console.log('❌ Notifications denied');
                        }
                    }).catch(err => {
                        console.log('❌ Error requesting notification permission:', err);
                    });
                } else if (Notification.permission === 'denied') {
                    console.log('❌ Notifications are blocked. Please enable them in browser settings.');
                } else {
                    console.log('✅ Notifications already granted');
                }
            } else {
                console.log('❌ Notifications not supported in this browser');
            }
        } catch (error) {
            console.log('❌ Error checking notification support:', error);
        }
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

            // Start tracking location
            if ('geolocation' in navigator) {
                console.log('📍 Requesting location access...');
                const watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude, heading, speed } = position.coords;
                        console.log('📍 Location updated:', latitude, longitude);

                        // Emit location update to server
                        newSocket.emit('shopperLocationUpdate', {
                            shopperId: shopper.id,
                            location: {
                                latitude,
                                longitude,
                                heading,
                                speed,
                                timestamp: new Date()
                            }
                        });
                    },
                    (error) => {
                        console.error('❌ Location tracking error:', error.message);
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 10000,
                        timeout: 5000
                    }
                );

                // Cleanup location watch on disconnect/unmount
                newSocket.on('disconnect', () => {
                    console.log('🔴 Personal Shopper disconnected from socket');
                    setConnected(false);
                    navigator.geolocation.clearWatch(watchId);
                });
            } else {
                console.error('❌ Geolocation not supported');
            }

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

                // Enhanced mobile notification handling
                const showNotification = () => {
                    if (window.Notification && Notification.permission === 'granted') {
                        try {
                            const notification = new Notification(title, {
                                body,
                                icon: '/delhiveryway-logo.jpg',
                                badge: '/delhiveryway-logo.jpg',
                                tag: 'new-order', // Replace previous notifications
                                requireInteraction: true, // Keep notification visible until user interacts
                                vibrate: [200, 100, 200], // Vibration pattern for mobile
                                silent: false // Ensure sound plays
                            });

                            // Handle notification click
                            notification.onclick = () => {
                                window.focus();
                                notification.close();
                            };

                            console.log('✅ Browser notification shown');
                        } catch (error) {
                            console.log('❌ Error showing browser notification:', error);
                            showFallbackAlert();
                        }
                    } else {
                        console.log('❌ Notifications not available or denied');
                        showFallbackAlert();
                    }
                };

                const showFallbackAlert = () => {
                    // Multiple fallback methods for mobile
                    console.log('📱 Showing fallback alert for mobile');

                    // Method 1: Multiple alerts for mobile (more aggressive)
                    alert(`📦 NEW ORDER ALERT!\n\n${body}\n\nDon't miss this opportunity!`);

                    // Method 2: Show alert again after 2 seconds for mobile
                    setTimeout(() => {
                        alert(`🚨 URGENT: NEW ORDER AVAILABLE!\n\n${body}\n\nClick OK to view order!`);
                    }, 2000);

                    // Method 3: Console log for debugging
                    console.log(`📦 NEW ORDER: ${body}`);

                    // Method 4: Try to show a custom notification element (more prominent)
                    try {
                        const notificationElement = document.createElement('div');
                        notificationElement.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            background: #ff4444;
                            color: white;
                            padding: 20px;
                            z-index: 99999;
                            font-weight: bold;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                            text-align: center;
                            font-size: 16px;
                            border-bottom: 3px solid #cc0000;
                        `;
                        notificationElement.innerHTML = `📦 NEW ORDER AVAILABLE!<br/>${body}<br/><small>Tap to view</small>`;
                        document.body.appendChild(notificationElement);

                        // Make it clickable to focus window
                        notificationElement.onclick = () => {
                            window.focus();
                            if (notificationElement.parentNode) {
                                notificationElement.parentNode.removeChild(notificationElement);
                            }
                        };

                        // Auto-remove after 15 seconds
                        setTimeout(() => {
                            if (notificationElement.parentNode) {
                                notificationElement.parentNode.removeChild(notificationElement);
                            }
                        }, 15000);
                    } catch (error) {
                        console.log('❌ Error showing custom notification:', error);
                    }
                };

                // For mobile, always show fallback alerts regardless of notification permission
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                if (isMobile) {
                    console.log('📱 Mobile device detected - using aggressive notification method');
                    showFallbackAlert();
                } else {
                    // Try browser notification first, then fallback
                    showNotification();
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
                    new Notification(title, { body, icon: '/delhiveryway-logo.jpg' });
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
                        icon: '/delhiveryway-logo.jpg',
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
                            icon: '/delhiveryway-logo.jpg'
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
                        icon: '/delhiveryway-logo.jpg'
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
                        icon: '/delhiveryway-logo.jpg'
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
                        icon: '/delhiveryway-logo.jpg'
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
