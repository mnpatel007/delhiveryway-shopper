import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [shopper, setShopper] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('shopperToken');
            const shopperData = localStorage.getItem('shopperData');
            
            if (token && shopperData) {
                try {
                    // Set default authorization header
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    // Parse and set shopper data
                    const parsedShopper = JSON.parse(shopperData);
                    setShopper(parsedShopper);
                } catch (error) {
                    console.error('Error parsing shopper data:', error);
                    // Clear invalid data
                    localStorage.removeItem('shopperToken');
                    localStorage.removeItem('shopperData');
                }
            }
            setLoading(false);
        };
        
        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/shopper/auth/login`, {
                email,
                password
            });

            const { token, shopper: shopperData } = response.data;
            
            localStorage.setItem('shopperToken', token);
            localStorage.setItem('shopperData', JSON.stringify(shopperData));
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setShopper(shopperData);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Login failed' 
            };
        }
    };

    const register = async (name, email, password, phone) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/shopper/auth/register`, {
                name,
                email,
                password,
                phone
            });

            const { token, shopper: shopperData } = response.data;
            
            localStorage.setItem('shopperToken', token);
            localStorage.setItem('shopperData', JSON.stringify(shopperData));
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setShopper(shopperData);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Registration failed' 
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('shopperToken');
        localStorage.removeItem('shopperData');
        delete axios.defaults.headers.common['Authorization'];
        setShopper(null);
    };

    const updateOnlineStatus = async (isOnline) => {
        try {
            await axios.put(`${API_BASE_URL}/shopper/auth/status`, { isOnline });
            const updatedShopper = { ...shopper, isOnline };
            setShopper(updatedShopper);
            localStorage.setItem('shopperData', JSON.stringify(updatedShopper));
        } catch (error) {
            console.error('Failed to update online status:', error);
        }
    };

    const value = {
        shopper,
        login,
        register,
        logout,
        updateOnlineStatus,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};