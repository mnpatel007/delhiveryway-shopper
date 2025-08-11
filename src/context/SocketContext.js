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
    const { shopper } = useAuth();

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