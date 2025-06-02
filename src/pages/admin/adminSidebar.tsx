import React, {  useState, useEffect } from "react";
import { BiMenu, BiX } from "react-icons/bi";
import { FaBell,  FaAngleRight,FaShoppingCart, FaGavel, FaUsers,  FaSignOutAlt, FaTruck, FaTractor } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firebase";

interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  subItems?: MenuItem[];
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

const AdminSidebar: React.FC = () => {
  const [isThinView, setIsThinView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const isHomePage = location.pathname === "/";


  // Admin menu items
  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      onClick: () => navigate("/admin"),
      icon: <FaUsers className="text-white" />,
    },
    {
      label: "Users",
      onClick: () => {},
      icon: <FaUsers className="text-white" />,
      subItems: [
        {
          label: "Buyers",
          onClick: () => navigate("/admin/buyers"),
          icon: <FaUsers className="text-white" />,
        },
        {
          label: "Farmers",
          onClick: () => navigate("/admin/farmers"),
          icon: <FaTractor className="text-white" />,
        },
        {
          label: "Delivery Partners",
          onClick: () => navigate("/admin/delivery-partners"),
          icon: <FaTruck className="text-white" />,
        },
      ],
    },
    {
      label: "Orders",
      onClick: () => navigate("/admin/orders"),
      icon: <FaShoppingCart className="text-white" />,
    },
    {
      label: "Bids",
      onClick: () => navigate("/admin/bids"),
      icon: <FaGavel className="text-white" />,
    },
    {
      label: "Notifications",
      onClick: () => navigate("/admin/notifications"),
      icon: <FaBell className="text-white" />,
    },
  ];

  // Fetch notifications (admin sees all notifications)
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notificationsList.push({
          id: doc.id,
          title: data.title || "Untitled",
          body: data.body || "No content",
          category: data.category || "Informative",
          imageUrl: data.imageUrl || null,
          targetGroups: data.targetGroups || [],
          createdAt: data.createdAt?.toDate()
            ? data.createdAt.toDate().toLocaleString()
            : "N/A",
        });
      });
    }, (error) => {
      console.error("Error fetching notifications:", error)
    });

    return () => unsubscribe();
  }, []);

  // Handle admin logout
  const handleLogout = async () => {
    setChecking(true);
    setError(null);

    try {
      // For admin bypass login (admin@gmail.com), just clear AuthContext
      setUser(null);
      localStorage.removeItem('authUser');
      navigate('/');
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Failed to log out. Please try again.');
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
          <span className="text-white font-bold text-xl">AXANO Agro Admin</span>
        )}
        <button
          onClick={toggleView}
          className="text-white hover:text-green-200 focus:outline-none"
          aria-label={isThinView ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isThinView ? <BiMenu className="w-6 h-6" /> : <BiX className="w-6 h-6" />}
        </button>
      </div>

      <div className={`p-4 border-b border-green-700 ${isThinView ? 'flex justify-center' : ''}`}>
        {!isThinView && <h2 className="text-lg font-bold">Welcome</h2>}
        <div className={`mt-2 flex ${isThinView ? 'justify-center' : 'items-center gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center">
            <FaUsers className="w-5 h-5 text-white" />
          </div>
          {!isThinView && (
            <div>
              <p className="font-medium">Admin</p>
              <p className="text-sm text-green-200 capitalize">Administrator</p>
            </div>
          )}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item, index) => (
          <li key={index}>
            <div
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
              {!isThinView && <span className="flex-1">{item.label}</span>}
              {!isThinView && (
                <FaAngleRight className="w-3 h-3 text-green-300 group-hover:text-white" />
              )}
              {isThinView && (
                <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </span>
              )}
            </div>
            {item.subItems && !isThinView && (
              <ul className="pl-8">
                {item.subItems.map((subItem, subIndex) => (
                  <li
                    key={subIndex}
                    className="flex items-center p-2 mx-2 my-1 hover:bg-green-700 rounded-lg cursor-pointer transition-colors group"
                    onClick={subItem.onClick}
                  >
                    {subItem.icon && (
                      <span className="mr-3 text-green-200 group-hover:text-white">
                        {subItem.icon}
                      </span>
                    )}
                    <span className="flex-1">{subItem.label}</span>
                    <FaAngleRight className="w-3 h-3 text-green-200 group-hover:text-white" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className={`p-4 border-t border-green-700 space-y-2 ${isThinView ? 'flex flex-col items-center' : ''}`}>

        {!isHomePage && (
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
              <FaSignOutAlt className="w-5 h-5" />
              {!isThinView && <span className="ml-3">{checking ? 'Logging out...' : 'Logout'}</span>}
              {isThinView && (
                <span className="absolute left-full ml-2 bg-gray-800 text-white text-sm rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {checking ? 'Logging out...' : 'Logout'}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;