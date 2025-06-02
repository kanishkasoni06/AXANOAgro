importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDccuj7Yiy9tgSKKR00mk9VrazNX-fqimE",
  authDomain: "agrifarm-f3d62.firebaseapp.com",
  projectId: "agrifarm-f3d62",
  storageBucket: "agrifarm-f3d62.firebasestorage.app",
  messagingSenderId: "222244462645",
  appId: "1:222244462645:web:e178658fac7616f49b117c",
  measurementId: "G-DK8GS9GYZ3",
};


firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "You have a new notification.",
    icon: payload.data?.icon || "/images/icons/info.png",
    image: payload.data?.imageUrl || undefined,
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});