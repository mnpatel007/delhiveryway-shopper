import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './UPISetup.css';

const UPISetup = () => {
    const [upiId, setUpiId] = useState('');
    const [isSetup, setIsSetup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUPIStatus();
    }, []);

    const fetchUPIStatus = async () => {
        try {
            const response = await api.get('/shopper/upi/status');
            if (response.data.success) {
                setIsSetup(response.data.data.isSetup);
                setUpiId(response.data.data.upiId || '');
            }
        } catch (error) {
            console.error('Error fetching UPI status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!upiId.trim()) {
            setError('Please enter your UPI ID');
            return;
        }

        // Basic UPI ID validation
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
        if (!upiRegex.test(upiId)) {
            setError('Invalid UPI ID format. Please enter a valid UPI ID like yourname@paytm');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/shopper/upi/setup', {
                upiId: upiId.trim()
            });

            if (response.data.success) {
                setSuccess(response.data.message);
                setIsSetup(true);
                // Refresh the page after 2 seconds to update the shopper's status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setError(response.data.message || 'Failed to setup UPI');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to setup UPI payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = () => {
        setIsSetup(false);
        setError('');
        setSuccess('');
    };

    if (loading) {
        return (
            <div className="upi-setup-container">
                <div className="loading">Loading UPI setup...</div>
            </div>
        );
    }

    return (
        <div className="upi-setup-container">
            <div className="upi-setup-card">
                <div className="upi-setup-header">
                    <h2>🏦 UPI Payment Setup</h2>
                    <p>Setup your UPI ID to receive payments from customers</p>
                </div>

                {isSetup ? (
                    <div className="upi-setup-complete">
                        <div className="success-icon">✅</div>
                        <h3>UPI Payment Setup Complete!</h3>
                        <div className="current-upi">
                            <label>Your UPI ID:</label>
                            <div className="upi-display">
                                <span>{upiId}</span>
                            </div>
                        </div>
                        <p className="setup-success">
                            You can now accept orders and receive payments from customers.
                        </p>
                        <button
                            className="update-btn"
                            onClick={handleUpdate}
                        >
                            Update UPI ID
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="upi-setup-form">
                        <div className="upi-info">
                            <h3>What is UPI?</h3>
                            <p>
                                UPI (Unified Payments Interface) allows customers to pay you instantly
                                using apps like PhonePe, Google Pay, Paytm, etc.
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="upiId">Enter your UPI ID:</label>
                            <input
                                type="text"
                                id="upiId"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="yourname@paytm"
                                className="upi-input"
                                required
                            />
                            <small className="input-help">
                                Example: john@phonepe, mary@paytm, user@googlepay
                            </small>
                        </div>

                        <div className="upi-examples">
                            <h4>Common UPI ID formats:</h4>
                            <ul>
                                <li><strong>PhonePe:</strong> yourname@ybl</li>
                                <li><strong>Google Pay:</strong> yourname@okaxis</li>
                                <li><strong>Paytm:</strong> yourname@paytm</li>
                                <li><strong>BHIM:</strong> yourname@upi</li>
                            </ul>
                        </div>

                        {error && (
                            <div className="error-message">
                                ❌ {error}
                            </div>
                        )}

                        {success && (
                            <div className="success-message">
                                ✅ {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="setup-btn"
                            disabled={submitting}
                        >
                            {submitting ? 'Setting up...' : '🚀 Setup UPI Payment'}
                        </button>

                        <div className="security-note">
                            <p>
                                🔒 <strong>Security Note:</strong> Your UPI ID will only be shared with
                                customers when they need to make payments for their orders.
                            </p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UPISetup;