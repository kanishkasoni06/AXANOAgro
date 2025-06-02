import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import { FaUser, FaBell, FaGlobe, FaCreditCard, FaLock, FaQuestionCircle,FaAngleRight, FaShoppingCart, FaStore } from "react-icons/fa";
import Sidebar from "../../components/ui/sidebar";
import { BiTrendingUp } from "react-icons/bi";
import { ClipboardList, LayoutDashboard, Settings } from "lucide-react";

interface UserProfile {
  displayName: string | null;
  email: string | null;
}

const BuyerSettingsPage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser({
        displayName: currentUser.displayName || "Buyer",
        email: currentUser.email,
      });
    } else {
      navigate("/buyer/settings"); // Redirect to login if not authenticated
    }
  }, [navigate]);
   const getMenuItems = () => {
    const commonItems = [
      {
        label: "Dashboard",
        onClick: () => navigate("/buyer/homepage"),
        icon: <LayoutDashboard className="text-white" />},
      {
        label: "Marketplace",
        onClick: () => navigate("/marketplace"),
        icon: <FaStore className="text-white" />
      },
      {
        label: "Orders",
        icon: (
          <div className="flex items-center">
            <FaShoppingCart className="text-white" />
            
          </div>
        ),
        onClick: () => navigate("/cart")
      },
      {
        label: "Purchase History",
        onClick: () => navigate("/purchase-history"),
        icon: <ClipboardList className="text-white" />
      },
      {
        label: "Biding Items",
        onClick: () => navigate("/buyer/biding"),
        icon: <BiTrendingUp className="text-white" />
      },
      {
        label: "Settings",
        onClick: () => navigate("/buyer/settings"),
        icon: <Settings className="text-white" />
      }
    ];

    return [
      ...commonItems,
    ];
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <Sidebar menuItems={getMenuItems()} />
      <div className="max-w-7xl mx-auto">
         <div className="flex items-center mb-8">
            
            <h1 className="text-3xl font-bold text-gray-900 font-sans">
              Profile & Settings
            </h1>
          </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 flex items-center justify-center">
            <FaUser className="text-gray-500 text-3xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">{user?.displayName || "Jane Doe"}</h2>
            <p className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✔</span> Verified Buyer
            </p>
            <button
              onClick={() => navigate("/settings/edit-profile")}
              className="text-sm text-blue-600 hover:underline mt-1"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div
            onClick={() => navigate("/settings/account")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaUser className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">Account Settings</h3>
                <p className="text-sm text-gray-500">Personal information</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight/></span>
          </div>

          <div
            onClick={() => navigate("/settings/notifications")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaBell className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">Notifications</h3>
                <p className="text-sm text-gray-500">Manage alerts</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight/></span>
          </div>

          <div
            onClick={() => navigate("/language-selection")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaGlobe className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">Language</h3>
                <p className="text-sm text-gray-500">Change app language</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight/></span>
          </div>

          <div
            onClick={() => navigate("/paymentMethod")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaCreditCard className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">Payment Methods</h3>
                <p className="text-sm text-gray-500">Manage payments</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight/></span>
          </div>

          <div
            onClick={() => navigate("/settings/privacy")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaLock className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">Privacy & Security</h3>
                <p className="text-sm text-gray-500">Security settings</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight/></span>
          </div>

          <div
            onClick={() => navigate("/buyer/help")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaQuestionCircle className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">Help & Support</h3>
                <p className="text-sm text-gray-500">Get assistance</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight/></span>
          </div>

          {/* Logout Button */}
          
        </div>
      </div>
    </div>
  );
};

export default BuyerSettingsPage;