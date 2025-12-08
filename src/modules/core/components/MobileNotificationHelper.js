import React, { useState, useEffect } from 'react';

const MobileNotificationHelper = () => {
    const [notificationStatus, setNotificationStatus] = useState('checking');
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

    useEffect(() => {
        checkNotificationSupport();
    }, []);

    const checkNotificationSupport = () => {
        if (!('Notification' in window)) {
            setNotificationStatus('not-supported');
            return;
        }

        const permission = Notification.permission;
        console.log('🔔 Mobile notification permission:', permission);

        switch (permission) {
            case 'granted':
                setNotificationStatus('granted');
                break;
            case 'denied':
                setNotificationStatus('denied');
                break;
            case 'default':
                setNotificationStatus('default');
                setShowPermissionPrompt(true);
                break;
            default:
                setNotificationStatus('unknown');
                break;
        }
    };

    const requestNotificationPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            console.log('🔔 Permission request result:', permission);

            if (permission === 'granted') {
                setNotificationStatus('granted');
                setShowPermissionPrompt(false);

                // Test notification
                new Notification('✅ Notifications Enabled!', {
                    body: 'You will now receive order alerts on your mobile device.',
                    icon: '/logo192.png',
                    tag: 'test-notification'
                });
            } else {
                setNotificationStatus('denied');
                setShowPermissionPrompt(false);
            }
        } catch (error) {
            console.log('❌ Error requesting notification permission:', error);
            setNotificationStatus('error');
        }
    };

    const openNotificationSettings = () => {
        // Try to guide user to browser settings
        alert(`To enable notifications on mobile:\n\n1. Tap the menu (⋮) in your browser\n2. Go to Settings > Site Settings\n3. Find this website and enable Notifications\n4. Refresh the page`);
    };

    if (notificationStatus === 'not-supported') {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                right: '10px',
                background: '#ff6b6b',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 10000,
                textAlign: 'center'
            }}>
                ⚠️ Notifications not supported in this browser
            </div>
        );
    }

    if (showPermissionPrompt) {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                right: '10px',
                background: '#4CAF50',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 10000,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                    🔔 Enable Mobile Notifications
                </div>
                <div style={{ marginBottom: '15px', fontSize: '12px' }}>
                    Get instant alerts for new orders on your mobile device
                </div>
                <button
                    onClick={requestNotificationPermission}
                    style={{
                        background: 'white',
                        color: '#4CAF50',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        marginRight: '10px',
                        cursor: 'pointer'
                    }}
                >
                    Enable Notifications
                </button>
                <button
                    onClick={() => setShowPermissionPrompt(false)}
                    style={{
                        background: 'transparent',
                        color: 'white',
                        border: '1px solid white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Later
                </button>
            </div>
        );
    }

    if (notificationStatus === 'denied') {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                right: '10px',
                background: '#ff9800',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 10000,
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                    ⚠️ Notifications Blocked
                </div>
                <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                    Please enable notifications in your browser settings
                </div>
                <button
                    onClick={openNotificationSettings}
                    style={{
                        background: 'white',
                        color: '#ff9800',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    How to Enable
                </button>
            </div>
        );
    }

    if (notificationStatus === 'granted') {
        return null; // Don't show anything when notifications are enabled
    }

    return null;
};

export default MobileNotificationHelper;
