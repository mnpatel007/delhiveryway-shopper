import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UPIReminder.css';

const UPIReminder = ({ onDismiss }) => {
    const navigate = useNavigate();

    const handleSetupNow = () => {
        navigate('/upi-setup');
    };

    return (
        <div className="upi-reminder">
            <div className="upi-reminder-content">
                <div className="reminder-icon">🏦</div>
                <div className="reminder-text">
                    <h3>UPI Payment Setup Required</h3>
                    <p>
                        You need to setup your UPI payment method to accept orders from customers.
                        Without UPI setup, you cannot proceed with any orders.
                    </p>
                </div>
                <div className="reminder-actions">
                    <button
                        className="setup-now-btn"
                        onClick={handleSetupNow}
                    >
                        🚀 Setup UPI Now
                    </button>
                    {onDismiss && (
                        <button
                            className="dismiss-btn"
                            onClick={onDismiss}
                        >
                            Later
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UPIReminder;