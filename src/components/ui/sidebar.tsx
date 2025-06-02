import React, { useRef, useState, useEffect } from "react";
import { BiUser, BiLogOut, BiMenu, BiX } from "react-icons/bi";
import { FaBell, FaTimes, FaAngleRight, FaInfoCircle, FaTag, FaLightbulb, FaRobot } from "react-icons/fa";
import { auth, db } from "../../firebase/firebase";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { doc, getDoc, collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useTranslation } from "react-i18next";

interface UserData {
  fullName: string;
  role: string;
  profileImage?: string | null;
}

interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  imageUrl: string | null;
  targetGroups: string[];
  createdAt: string;
}

interface SidebarProps {
  menuItems: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems }) => {
  const { t } = useTranslation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThinView, setIsThinView] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const location = useLocation();

  const isHomePage = location.pathname === "/";

  // Map user role to target group
  const roleToTargetGroup: { [key: string]: string } = {
    farmer: "Farmers",
    buyer: "Buyers",
    deliveryPartner: "Delivery Partners",
  };

  // Category icons
  const categoryIcons: { [key: string]: typeof FaInfoCircle } = {
    Informative: FaInfoCircle,
    "New Offer": FaTag,
    Ideas: FaLightbulb,
    "AI Advice": FaRobot,
  };

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const storedUser = localStorage.getItem('authUser');
        let parsedUser = storedUser ? JSON.parse(storedUser) : null;

        if (parsedUser?.fullName) {
          setUserDetails({
            fullName: parsedUser.fullName,
            role: parsedUser.role || null,
            profileImage: parsedUser.profileImage || null,
          });
          setLoading(false);
          return;
        }

        let userDoc;
        if (user.role === 'farmer') {
          userDoc = await getDoc(doc(db, "farmer", user.uid));
        } else if (user.role === 'buyer') {
          userDoc = await getDoc(doc(db, "buyer", user.uid));
        } else if (user.role === 'deliveryPartner') {
          userDoc = await getDoc(doc(db, "deliveryPartner", user.uid));
        }

        if (userDoc && userDoc.exists()) {
          const data = userDoc.data();
          const updatedUser = {
            ...parsedUser,
            fullName: data.fullName || "User",
            profileImage: data.profileImage || null,
          };
          setUserDetails({
            fullName: data.fullName || "User",
            role: user.role || "",
            profileImage: data.profileImage || null,
          });
          localStorage.setItem('authUser', JSON.stringify(updatedUser));
        } else {
          setUserDetails({
            fullName: "User",
            role: user.role || "",
            profileImage: null,
          });
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        setUserDetails({
          fullName: "User",
          role: user.role || "",
          profileImage: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user, t]);

  // Fetch notifications
  useEffect(() => {
    if (!user || !user.role) {
      setNotificationsLoading(false);
      return;
    }

    const targetGroup = roleToTargetGroup[user.role];
    if (!targetGroup) {
      console.warn(`Invalid user role: ${user.role}`);
      setNotificationsLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const targetGroups = data.targetGroups || [];
        if (targetGroups.includes(targetGroup) || targetGroups.includes("All Users")) {
          notificationsList.push({
            id: doc.id,
            title: data.title || t('untitledNotification'),
            body: data.body || t('noContentNotification'),
            category: data.category || "Informative",
            imageUrl: data.imageUrl || null,
            targetGroups: targetGroups,
            createdAt: data.createdAt?.toDate()
              ? data.createdAt.toDate().toLocaleString()
              : t('na'),
          });
        }
      });
      setNotifications(notificationsList);
      setNotificationsLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setNotificationsLoading(false);
    });

    return () => unsubscribe();
  }, [user, t]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  const handleLogout = async () => {
    setChecking(true);
    setError(null);

    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(t('failedToLogout'));
    } finally {
      setChecking(false);
    }
  };

  const toggleView = () => {
    setIsThinView(!isThinView);
  };

  return (
    <div
      className={`h-screen ${isThinView ? 'w-16' : 'w-64'} bg-[#16A34A] text-white flex flex-col fixed top-0 left-0 transition-all duration-300 ease-in-out z-50`}
    >
      <div className="p-4 border-b border-green-700 flex items-center justify-between">
        {!isThinView && (
          <span className="text-white font-bold text-xl">{t('appName')}</span>
        )}
        <button
          onClick={toggleView}
          className="text-white hover:text-green-200 focus:outline-none"
          aria-label={isThinView ? t('expandSidebar') : t('collapseSidebar')}
        >
          {isThinView ? <BiMenu className="w-6 h-6" /> : <BiX className="w-6 h-6" />}
        </button>
      </div>

      <div className={`p-4 border-b border-green-700 ${isThinView ? 'flex justify-center' : ''}`}>
        {!isThinView && <h2 className="text-lg font-bold">{t('welcome')}</h2>}
        {loading ? (
          <div className="animate-pulse space-y-2 mt-2">
            <div className="h-4 bg-green-500 rounded w-3/4"></div>
            {!isThinView && <div className="h-3 bg-green-500 rounded w-1/2"></div>}
          </div>
        ) : user && userDetails ? (
          <div className={`mt-2 flex ${isThinView ? 'justify-center' : 'items-center gap-3'}`}>
            {userDetails.profileImage ? (
              <img
                src={userDetails.profileImage}
                alt={t('profile')}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center">
                <BiUser className="w-5 h-5 text-white" />
              </div>
            )}
            {!isThinView && (
              <div>
                <p className="font-medium">{userDetails.fullName}</p>
                <p className="text-sm text-green-200 capitalize">
                  {userDetails.role === "deliveryPartner" ? t('deliveryPartner') : t(userDetails.role)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className={isThinView ? 'flex justify-center' : ''}>
            {isThinView ? (
              <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center">
                <BiUser className="w-5 h-5 text-white" />
              </div>
            ) : (
              <p className="text-sm text-green-200 mt-2">{t('guestUser')}</p>
            )}
          </div>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item, index) => (
          <li
            key={index}
            className={`flex items-center p-3 mx-2 my-1 hover:bg-green-700 rounded-lg cursor-pointer transition-colors group relative ${
              isThinView ? 'justify-center' : ''
            }`}
            onClick={item.onClick}
          >
            {item.icon && (
              <span className="mr-3 text-green-200 group-hover:text-white">
                {item.icon}
              </span>
            )}
            {!isThinView && <span className="flex-1">{t(item.label)}</span>}
            {!isThinView && (
              <FaAngleRight className="w-3 h-3 text-green-300 group-hover:text-white" />
            )}
            {isThinView && (
              <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {t(item.label)}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className={`p-4 border-t border-green-700 space-y-2 ${isThinView ? 'flex flex-col items-center' : ''}`}>
        {!isHomePage && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`flex items-center ${isThinView ? 'justify-center' : 'w-full'} p-3 hover:bg-green-700 rounded-lg transition-colors relative group`}
            >
              <FaBell className="w-5 h-5 text-green-200" />
              {!isThinView && <span className="ml-3">{t('notifications')}</span>}
              {isThinView && (
                <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('notifications')}
                </span>
              )}
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {isNotificationOpen && (
              <div className={`absolute ${isThinView ? 'left-16' : 'left-0'} bottom-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{t('notifications')}</h3>
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="mb-4 p-3 bg-gray-50 rounded-lg flex items-start space-x-3"
                      >
                        <div>{<>{categoryIcons[notif.category] ?? categoryIcons["Informative"]}</>}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-800">{notif.title}</h4>
                          <p className="text-sm text-gray-600">{notif.body}</p>
                          {notif.imageUrl && (
                            <img
                              src={notif.imageUrl}
                              alt={t('notification')}
                              className="mt-2 h-16 w-16 object-cover rounded"
                            />
                          )}
                          <p className="text-xs text-gray-400 mt-1">{notif.createdAt}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">{t('noNewNotifications')}</p>
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-gray-200 text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    {t('viewAllNotifications')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isHomePage ? (
          <div className={`space-y-2 ${isThinView ? 'flex flex-col items-center' : ''}`}>
            <button
              onClick={() => navigate("/login")}
              className={`flex items-center ${isThinView ? 'justify-center' : 'w-full'} p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors relative group`}
            >
              <BiUser className="w-5 h-5" />
              {!isThinView && <span className="ml-3">{t('login')}</span>}
              {isThinView && (
                <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('login')}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/role-selection")}
              className={`flex items-center ${isThinView ? 'justify-center' : 'w-full'} p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors relative group`}
            >
              <BiUser className="w-5 h-5" />
              {!isThinView && <span className="ml-3">{t('register')}</span>}
              {isThinView && (
                <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('register')}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className={`space-y-2 ${isThinView ? 'flex flex-col items-center' : ''}`}>
            {error && !isThinView && (
              <div className="bg-red-100 text-red-700 p-2 rounded text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={checking}
              className={`flex items-center ${isThinView ? 'justify-center' : 'w-full'} p-3 rounded-lg transition-colors ${
                checking ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              } relative group`}
            >
              <BiLogOut className="w-5 h-5" />
              {!isThinView && <span className="ml-3">{checking ? t('loggingOut') : t('logout')}</span>}
              {isThinView && (
                <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {checking ? t('loggingOut') : t('logout')}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;