import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import {  FaInfoCircle, FaTag, FaLightbulb, FaRobot } from "react-icons/fa";

interface NotificationComponentProps {
  userType: string;
}

interface Notification {
  title: string;
  body: string;
  category: string;
  imageUrl: string;
  icon: string;
}

const NotificationComponent: React.FC<NotificationComponentProps> = ({ userType }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    Informative: FaInfoCircle,
    "New Offer": FaTag,
    Ideas: FaLightbulb,
    "AI Advice": FaRobot,
  };

  const requestPermissionAndRegisterToken = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission denied. Please allow notifications in your browser settings.");
        return;
      }

      const messagingInstance = getMessaging();
      let serviceWorkerRegistration;

      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope',
        });
        console.log("Service worker registered:", serviceWorkerRegistration);
      } catch (swError) {
        throw new Error(
          `Failed to register service worker: ${
            swError && typeof swError === "object" && "message" in swError
              ? (swError as { message: string }).message
              : String(swError)
          }`
        );
      }

      // Get FCM token
      const token = await getToken(messagingInstance, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration,
      }).catch((err) => {
        throw new Error(`FCM token generation failed: ${err.message}`);
      });

      if (!token) {
        setError("Failed to generate FCM token. Please try again.");
        return;
      }

      if (!user || !user.uid) {
        setError("User not authenticated. Please log in.");
        return;
      }

      // Send token to backend
      const response = await fetch("http://localhost:3000/api/send-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userId: user.uid,
          userType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to store token in backend.");
      }

      setIsEnabled(true);
      localStorage.setItem(`notificationsEnabled_${user.uid}`, "true");
      setError(null);
      console.log("FCM token registered successfully:", token);
    } catch (err: any) {
      console.error("Error in requestPermissionAndRegisterToken:", err);
      setError(`Failed to enable notifications: ${err.message}`);
    }
  };

  const disableNotifications = () => {
    setIsEnabled(false);
    if (user && user.uid) {
      localStorage.removeItem(`notificationsEnabled_${user.uid}`);
    }
    setError(null);
  };

  useEffect(() => {
    if (!user || !user.uid) return;

    // Check if notifications are enabled
    const enabled = localStorage.getItem(`notificationsEnabled_${user.uid}`) === "true";
    if (enabled) {
      requestPermissionAndRegisterToken();
    }

    // Handle foreground notifications
    const messagingInstance = getMessaging();
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log("Foreground notification received:", payload);
      const data = payload.data || {};
      const notification: Notification = {
        title: data.title || "No Title",
        body: data.body || "",
        category: data.category || "Informative",
        imageUrl: data.imageUrl || "",
        icon: data.icon || "/images/icons/info.png",
      };
      setNotifications((prev) => [notification, ...prev]);

      // Show browser notification
      try {
        new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          // image: notification.imageUrl || undefined,
        });
      } catch (err) {
        console.warn("Failed to show browser notification:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
        <button
          onClick={isEnabled ? disableNotifications : requestPermissionAndRegisterToken}
          className={`px-4 py-2 rounded-md text-white ${
            isEnabled ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isEnabled ? "Disable Notifications" : "Enable Notifications"}
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notif, index) => (
            <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
              <div className="mr-3">
                <>
                  {categoryIcons[notif.category] ?? categoryIcons["Informative"]}
                </>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{notif.title}</h3>
                <p className="text-sm text-gray-600">{notif.body}</p>
                {notif.imageUrl && (
                  <img
                    src={notif.imageUrl}
                    alt="Notification"
                    className="mt-2 h-16 w-16 object-cover rounded"
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No notifications yet.</p>
        )}
      </div>
    </div>
  );
};

export default NotificationComponent;