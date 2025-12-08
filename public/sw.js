// Service Worker for Mobile Notifications
self.addEventListener('push', function (event) {
    console.log('Push event received:', event);

    const options = {
        body: event.data ? event.data.text() : 'New order available!',
        icon: '/delhiveryway-logo.jpg',
        badge: '/delhiveryway-logo.jpg',
        vibrate: [200, 100, 200],
        tag: 'new-order',
        requireInteraction: true,
        actions: [
            {
                action: 'accept',
                title: 'Accept Order',
                icon: '/delhiveryway-logo.jpg'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/delhiveryway-logo.jpg'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('New Order Available', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'accept') {
        // Open the app and focus on orders
        event.waitUntil(
            clients.openWindow('/dashboard')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default click - open the app
        event.waitUntil(
            clients.openWindow('/dashboard')
        );
    }
});

self.addEventListener('notificationclose', function (event) {
    console.log('Notification closed:', event);
});






