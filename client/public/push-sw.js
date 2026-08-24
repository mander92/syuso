self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = {
            body: event.data?.text() || '',
        };
    }

    const title = payload.title || 'SYUSO Seguridad';
    const options = {
        body: payload.body || 'Tienes un nuevo aviso.',
        icon: payload.icon || '/syusoLogo.jpg',
        badge: '/syusoLogo.jpg',
        tag: payload.tag || 'syuso-notification',
        renotify: true,
        timestamp: payload.timestamp || Date.now(),
        vibrate: [120, 80, 120],
        data: {
            url: payload.url || '/account',
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification?.data?.url || '/account';
    const absoluteUrl = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                const existingClient = clients.find((client) =>
                    client.url.startsWith(self.location.origin)
                );
                if (existingClient) {
                    existingClient.focus();
                    return existingClient.navigate(absoluteUrl);
                }
                return self.clients.openWindow(absoluteUrl);
            })
    );
});
