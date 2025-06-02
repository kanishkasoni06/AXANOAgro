import { useEffect, useState, useRef } from "react";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { FaHome, FaMapMarkedAlt, FaClipboardList, FaTruck, FaCamera, FaMoneyBillWave,  FaFire, FaLightbulb } from "react-icons/fa";
import { IoSettings } from "react-icons/io5";
import Navbar from "../../components/ui/navbar";
import QuickActionsCard from "../../components/ui/quickActionCard";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import Sidebar from "../../components/ui/sidebar";
import DeliveryPartnerDashboard from "./dashboard";

// Assuming useAuth hook (you can replace with your actual implementation)
interface AuthState {
  user: any | null; // Firebase user object or null
  loading: boolean;
  error: string | null;
}

const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      (user: any) => {
        setAuthState({ user, loading: false, error: null });
      },
      (error: any) => {
        setAuthState({ user: null, loading: false, error: error.message });
      }
    );
    return () => unsubscribe();
  }, []);

  return authState;
};

interface UserData {
  fullName: string;
  role: string;
  profileImage?: string | null;
  vehicleNumber?: string | null;
}

interface Activity {
  action: string;
  timestamp: string;
  orderId: string;
}

interface TodayEarningsData {
  totalEarnings: number;
  deliveriesCompleted: number;
}

interface PerformanceStreak {
  streakDays: number;
  lastDeliveryDate: string | null;
}

// Interfaces for Firestore documents
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  items: OrderItem[];
  buyerId: string;
  deliveryDetails: {
    deliveryPartnerId: string;
    assignedAt: any; // Firestore Timestamp
    onMyWayToFarmer?: boolean;
    pickedUpOrder?: boolean;
    deliveredOrder?: boolean;
  };
  status: string;
}

interface Item {
  ownerUserId: string;
}

interface Farmer {
  fullName: string;
}

interface Buyer {
  fullName: string;
}

// Recent Activity Component with Active Deliveries
const RecentActivity = ({ userId }: { userId: string }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("deliveryDetails.deliveryPartnerId", "==", userId),
          where("status", "!=", "Delivered"),
          orderBy("deliveryDetails.assignedAt", "desc"),
          limit(3)
        );
        const snapshot = await getDocs(q);

        const fetchedActivities: Activity[] = [];
        for (const orderDoc of snapshot.docs) {
          const data = orderDoc.data() as Order;
          let buyerName = "Buyer";
          let farmerName = "Farmer";

          // Fetch farmer name
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            const itemDoc = await getDoc(doc(db, "items", data.items[0].name));
            if (itemDoc.exists()) {
              const itemData = itemDoc.data() as Item;
              if (itemData.ownerUserId) {
                const farmerDoc = await getDoc(doc(db, "farmer", itemData.ownerUserId));
                if (farmerDoc.exists()) {
                  const farmerData = farmerDoc.data() as Farmer;
                  farmerName = farmerData.fullName || "Farmer";
                }
              }
            }
          }

          // Fetch buyer name
          if (data.buyerId) {
            const buyerDoc = await getDoc(doc(db, "buyer", data.buyerId));
            if (buyerDoc.exists()) {
              const buyerData = buyerDoc.data() as Buyer;
              buyerName = buyerData.fullName || "Buyer";
            }
          }

          let action = "";
          const deliveryDetails = data.deliveryDetails || {};
          if (deliveryDetails.deliveredOrder) {
            action = `Delivered order to ${buyerName}`;
          } else if (deliveryDetails.pickedUpOrder) {
            action = `Picked up order from ${farmerName}`;
          } else if (deliveryDetails.onMyWayToFarmer) {
            action = `On the way to ${farmerName}`;
          } else {
            action = `Assigned delivery for ${buyerName}`;
          }

          const timestamp = deliveryDetails.assignedAt
            ? deliveryDetails.assignedAt.toDate().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "05:04 PM IST, May 17, 2025";

          fetchedActivities.push({ action, timestamp, orderId: orderDoc.id });
        }

        setActivities(fetchedActivities);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        setActivities([
          { action: "On the way to Farmer A", timestamp: "04:30 PM IST, May 17, 2025", orderId: "order1" },
          { action: "Picked up order from Farmer B", timestamp: "03:45 PM IST, May 17, 2025", orderId: "order2" },
          { action: "Assigned delivery for Buyer C", timestamp: "02:15 PM IST, May 17, 2025", orderId: "order3" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, [userId]);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-lg p-6 my-6 animate-scale-in max-w-5xl mx-auto w-full"><p className="text-gray-600 font-medium text-sm">Loading activities...</p></div>;
  }

  return (
    <div className="bg-gradient-to-b from-[#2CD14D]/10 to-white rounded-2xl shadow-lg p-6 my-6 animate-scale-in w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-sans">
        <FaTruck className="text-[#2CD14D] mr-3 text-2xl" />
        Active Deliveries
      </h2>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600 text-sm font-medium font-sans">No active deliveries right now.</p>
            <button
              onClick={() => navigate("/myDeliveries")}
              className="mt-4 bg-gradient-to-r from-[#2CD14D] to-[#24B042] text-white px-6 py-3 rounded-full text-sm font-semibold font-sans hover:scale-105 hover:shadow-md transition-transform duration-200 active:scale-95"
            >
              Find New Orders
            </button>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start">
                <FaTruck className="text-[#2CD14D] mr-4 mt-1 text-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-700 font-sans">{activity.action}</p>
                  <p className="text-xs text-gray-500 font-sans">{activity.timestamp}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/myDeliveries?orderId=${activity.orderId}`)}
                className="bg-[#2CD14D] text-white px-4 py-1.5 rounded-full text-xs font-semibold font-sans hover:bg-[#24B042] transition-colors duration-200 active:scale-95"
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Today's Earnings Overview Component with Progress Bar
const TodayEarningsOverview = ({ userId }: { userId: string }) => {
  const [earningsData, setEarningsData] = useState<TodayEarningsData>({ totalEarnings: 0, deliveriesCompleted: 0 });
  const [loading, setLoading] = useState(true);
  const dailyGoal = 5; // Goal of 5 deliveries per day
  const bonusThreshold = 5;
  const bonusAmount = 500;

  useEffect(() => {
    const fetchTodayEarnings = async () => {
      try {
        const today = new Date("2025-05-17T00:00:00+05:30"); // May 17, 2025, 00:00 IST
        const tomorrow = new Date("2025-05-18T00:00:00+05:30"); // May 18, 2025, 00:00 IST

        const q = query(
          collection(db, "bidItems"),
          where("deliveryDetails", "array-contains-any", [{ deliveryPartnerId: userId, deliveredOrder: true }])
        );
        const snapshot = await getDocs(q);

        let totalEarnings = 0;
        let deliveriesCompleted = 0;

        snapshot.forEach(doc => {
          const data = doc.data();
          const deliveryDetail = data.deliveryDetails.find((d: any) => d.deliveryPartnerId === userId);
          if (deliveryDetail && deliveryDetail.deliveredOrder && deliveryDetail.deliveredAt) {
            const deliveredAt = deliveryDetail.deliveredAt.toDate();
            if (deliveredAt >= today && deliveredAt < tomorrow) {
              deliveriesCompleted += 1;
              totalEarnings += deliveryDetail.amount || 0;
            }
          }
        });

        setEarningsData({ totalEarnings, deliveriesCompleted });
      } catch (error) {
        console.error("Error fetching today's earnings:", error);
        setEarningsData({ totalEarnings: 1250, deliveriesCompleted: 3 }); // Fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchTodayEarnings();
  }, [userId]);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full"><p className="text-gray-600 font-medium text-sm">Loading earnings...</p></div>;
  }

  const progress = Math.min((earningsData.deliveriesCompleted / dailyGoal) * 100, 100);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center font-sans">
        <FaMoneyBillWave className="text-[#2CD14D] mr-3 text-2xl" />
        Today's Earnings
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 font-sans">
            Earnings: <span className="font-semibold text-gray-900">₹{earningsData.totalEarnings.toLocaleString()}</span>
          </p>
          <p className="text-sm font-medium text-gray-700 font-sans">
            Deliveries: <span className="font-semibold text-gray-900">{earningsData.deliveriesCompleted}/{dailyGoal}</span>
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-[#2CD14D] to-[#24B042] h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-4 bg-[#2CD14D]/10 rounded-lg border border-[#2CD14D]/20">
          <p className="text-sm font-medium text-[#2CD14D] font-sans">
            {earningsData.deliveriesCompleted >= bonusThreshold
              ? `🎉 Congrats! You've earned a ₹${bonusAmount} bonus!`
              : `Complete ${bonusThreshold - earningsData.deliveriesCompleted} more deliveries to earn a ₹${bonusAmount} bonus!`}
          </p>
        </div>
      </div>
    </div>
  );
};

// Performance Streak Component
const PerformanceStreak = ({ userId }: { userId: string }) => {
  const [streakData, setStreakData] = useState<PerformanceStreak>({ streakDays: 0, lastDeliveryDate: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        const q = query(
          collection(db, "bidItems"),
          where("deliveryDetails", "array-contains-any", [{ deliveryPartnerId: userId, deliveredOrder: true }]),
          orderBy("deliveryDetails.deliveredAt", "desc")
        );
        const snapshot = await getDocs(q);

        let streakDays = 0;
        let lastDeliveryDate: string | null = null;
        const today = new Date("2025-05-17T00:00:00+05:30");
        const deliveriesByDate: { [key: string]: boolean } = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          const deliveryDetail = data.deliveryDetails.find((d: any) => d.deliveryPartnerId === userId);
          if (deliveryDetail && deliveryDetail.deliveredOrder && deliveryDetail.deliveredAt) {
            const deliveredAt = deliveryDetail.deliveredAt.toDate();
            const dateKey = deliveredAt.toISOString().split("T")[0];
            deliveriesByDate[dateKey] = true;
            if (!lastDeliveryDate || deliveredAt > new Date(lastDeliveryDate)) {
              lastDeliveryDate = dateKey;
            }
          }
        });

        if (lastDeliveryDate) {
          const lastDate = new Date(lastDeliveryDate);
          let currentDate = new Date(today);
          streakDays = 0;

          while (currentDate >= lastDate) {
            const dateKey = currentDate.toISOString().split("T")[0];
            if (deliveriesByDate[dateKey]) {
              streakDays++;
            } else {
              break;
            }
            currentDate.setDate(currentDate.getDate() - 1);
          }
        }

        setStreakData({ streakDays, lastDeliveryDate });
      } catch (error) {
        console.error("Error fetching streak data:", error);
        setStreakData({ streakDays: 3, lastDeliveryDate: "2025-05-17" }); // Fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [userId]);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full"><p className="text-gray-600 font-medium text-sm">Loading streak...</p></div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center font-sans">
        <FaFire className="text-[#2CD14D] mr-3 text-2xl" />
        Performance Streak
      </h2>
      <div className="text-center">
        <p className="text-4xl font-bold text-[#2CD14D] font-sans">{streakData.streakDays}</p>
        <p className="text-sm text-gray-500 mt-2 font-sans">Day Streak</p>
        <p className="text-sm text-gray-600 mt-2 font-sans">
          {streakData.streakDays > 0
            ? "🔥 Keep it up! Deliver today to maintain your streak!"
            : "Start delivering today to build your streak!"}
        </p>
      </div>
    </div>
  );
};

// Tips & Updates Component (Static for now)
const TipsAndUpdates = () => {
  const tips = [
    "Earn more by delivering during peak hours (12 PM - 2 PM)!",
    "Ensure your vehicle is in top condition for faster deliveries.",
    "Check for new orders regularly to maximize your earnings!"
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 my-6 animate-scale-in  w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-sans">
        <FaLightbulb className="text-[#2CD14D] mr-3 text-2xl" />
        Tips & Updates
      </h2>
      <div className="space-y-4">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start">
            <FaLightbulb className="text-[#2CD14D] mr-4 mt-1 text-lg" />
            <p className="text-sm text-gray-600 font-sans">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const DeliveryHomePage = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "deliveryPartner", user.uid));
        
        if (userDoc.exists()) {
          setUserData({
            fullName: userDoc.data().fullName || "Delivery Partner",
            role: "delivery",
            profileImage: userDoc.data().profileImage || null,
            vehicleNumber: userDoc.data().vehicleNumber || "Not specified",
          });
        }
      } catch (error) {
        console.error("Error fetching delivery data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading]);

  const handleUploadProofClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file for proof upload:", file.name);
    }
  };

  const getMenuItems = () => {
    const items = [
      {
        label: "Dashboard",
        onClick: () => navigate("/delivery/dashboard"),
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

  // Show loading state while auth state or user data is being fetched
  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar menuItems={getMenuItems()} />
        <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
          <p className="text-gray-600 font-sans text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If there's an auth error, display it
  if (authError) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar menuItems={getMenuItems()} />
        <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
          <p className="text-red-600 font-sans text-lg">Authentication error: {authError}</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen ">
      {/* Navbar */}
      <Sidebar menuItems={getMenuItems()} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-6">
          {/* Sticky Greeting Section */}
          <div className="sticky top-0 z-10  pt-6 pb-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-900 font-sans">
                  Hello, {userData?.fullName || "Delivery Partner"}!
                </h2>
                {userData?.vehicleNumber && userData.vehicleNumber !== "Not specified" && (
                  <span className="ml-4 bg-[#2CD14D] text-white px-4 py-1.5 rounded-full text-sm font-semibold font-sans">
                    Vehicle: {userData.vehicleNumber}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 font-sans">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="my-6 w-full">
            <QuickActionsCard 
              actions={[
                {
                  label: "View Active Deliveries", 
                  onClick: () => navigate("/myDeliveries"),
                  icon: <FaTruck className="text-[#2CD14D] text-2xl" /> 
                },
                {
                  label: "Find New Orders",
                  onClick: () => navigate("/myDeliveries"),
                  icon: <FaClipboardList className="text-[#2CD14D] text-2xl" />,
                },
                {
                  label: "Upload Proof",
                  onClick: handleUploadProofClick,
                  icon: <FaCamera className="text-[#2CD14D] text-2xl" />,
                },
                {
                  label: "Optimize Route", 
                  onClick: () => console.log("Optimize Route clicked"),
                  icon: <FaMapMarkedAlt className="text-[#2CD14D] text-2xl" />
                },
              ]}
              cardHeight="h-44"
              iconSize="text-3xl"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <DeliveryPartnerDashboard/>

          {/* Active Deliveries */}
          <RecentActivity userId={user.uid} />

          {/* Today's Earnings and Performance Streak Side by Side */}
          <div className="flex flex-col lg:flex-row gap-6 my-6  w-full">
            <div className="flex-1">
              <TodayEarningsOverview userId={user.uid} />
            </div>
            <div className="flex-1">
              <PerformanceStreak userId={user.uid} />
            </div>
          </div>

          {/* Tips & Updates */}
          <TipsAndUpdates />
        </div>
      </div>
    </div>
  );
};

export default DeliveryHomePage;