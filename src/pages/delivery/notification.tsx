import { useEffect, useState } from "react";
import { FaTruck, FaMoneyBillWave, FaStar, FaBell, FaClipboardList, FaMapMarkedAlt, FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase"; 
import Sidebar from "../../components/ui/sidebar";
import { IoSettings } from "react-icons/io5";

// useAuth hook with improved error handling
interface AuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
}

const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    let isMounted = true;
    try {
      
      if (!auth || !auth.onAuthStateChanged) {
        throw new Error("Firebase auth is not properly initialized.");
      }

      const unsubscribe = auth.onAuthStateChanged(
        (user: any) => {
          if (isMounted) {
            setAuthState({ user: user || null, loading: false, error: null });
          }
        },
        (error: any) => {
          if (isMounted) {
            setAuthState({ user: null, loading: false, error: error.message || "Failed to authenticate user." });
          }
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (error: any) {
      console.error("Error in useAuth:", error);
      if (isMounted) {
        setAuthState({ user: null, loading: false, error: error.message || "Authentication module failed to load." });
      }
      return () => {};
    }
  }, []);

  return authState;
};

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const NotificationsPage = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  // Static notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "new_delivery",
      message: "New delivery assigned to you!",
      timestamp: new Date(2025, 4, 14, 15, 50), // 03:50 PM IST, May 14, 2025
      read: false,
    },
    {
      id: "2",
      type: "transaction_completed",
      message: "Transaction completed: ₹500 earned.",
      timestamp: new Date(2025, 4, 14, 15, 45), // 03:45 PM IST, May 14, 2025
      read: false,
    },
    {
      id: "3",
      type: "rating_changed",
      message: "Your rating increased to 4.7!",
      timestamp: new Date(2025, 4, 14, 15, 30), // 03:30 PM IST, May 14, 2025
      read: true,
    },
    {
      id: "4",
      type: "new_delivery",
      message: "New delivery from Farmer A to Buyer B!",
      timestamp: new Date(2025, 4, 14, 15, 15), // 03:15 PM IST, May 14, 2025
      read: true,
    },
  ]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_delivery":
        return <FaTruck className="text-green-600 text-xl mr-4" />;
      case "transaction_completed":
        return <FaMoneyBillWave className="text-green-600 text-xl mr-4" />;
      case "rating_changed":
        return <FaStar className="text-green-600 text-xl mr-4" />;
      default:
        return <FaBell className="text-green-600 text-xl mr-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date | null | undefined) => {
    if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      return "Unknown time";
    }
    try {
      return timestamp.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Unknown time";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-green-0 to-green-100">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 font-sans">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-green-0 to-green-100">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center h-full">
            <p className="text-red-600 font-sans">Authentication error: {authError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || typeof user !== "object" || !("uid" in user)) {
    navigate("/login");
    return null;
  }
  const getMenuItems = () => {
    const items = [
      {
        label: "Dashboard",
        onClick: () => navigate("/delivery/homePage"),
        icon: <FaHome className="text-[#2CD14D] text-lg" />,
      },
      {
        label: "My Deliveries",
        onClick: () => navigate("/myDeliveries"),
        icon: <FaTruck className="text-[#2CD14D] text-lg" />,
      },
      {
        label: "Route Map",
        onClick: () => navigate("/delivery/mapPage"),
        icon: <FaMapMarkedAlt className="text-[#2CD14D] text-lg" />,
      },
      {
        label: "Notifications",
        onClick: () => navigate("/delivery/notification"),
        icon: <FaClipboardList className="text-[#2CD14D] text-lg" />,
      },
      {
        label: "Settings",
        onClick: () => navigate("/delivery/settings"),
        icon: <IoSettings className="text-[#2CD14D] text-lg" />,
      },
    ];
 return items;
  };
  return (
    <div className="min-h-screen p-6  max-w-7xl mx-auto">
      <Sidebar  menuItems={getMenuItems()}/>
      

        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
          <FaBell className="text-green-600 mr-2" />
          Notifications
        </h1>

        {/* Notifications Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {/* Mark All as Read Button */}
          {notifications.length > 0 && notifications.some(notif => !notif.read) && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-50 text-sm font-medium"
              >
                Mark All as Read
              </button>
            </div>
          )}

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="text-center text-gray-600">
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="flex items-center">
                  {getNotificationIcon(notification.type)}
                  <div>
                    <h3 className="text-gray-800 font-medium">{notification.message}</h3>
                    <p className="text-sm text-gray-500">{formatTimestamp(notification.timestamp)}</p>
                  </div>
                </div>
                {!notification.read && (
                  <div className="bg-green-600 w-3 h-3 rounded-full"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
  );
};

export default NotificationsPage;