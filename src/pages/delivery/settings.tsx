import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import { FaUser, FaBell, FaGlobe, FaCreditCard, FaLock, FaQuestionCircle, FaAngleRight, FaClipboardList, FaMapMarkedAlt, FaTruck, FaHome } from "react-icons/fa";
import Sidebar from "../../components/ui/sidebar";
import { IoSettings } from "react-icons/io5";

interface UserProfile {
  displayName: string | null;
  email: string | null;
}

const DeliveryPartnerSettingsPage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser({
        displayName: currentUser.displayName || "Delivery Partner",
        email: currentUser.email,
      });
    } else {
      navigate("/delivery-partner/login"); // Redirect to login if not authenticated
    }
  }, [navigate]);

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
    <div className="min-h-screen max-w-7xl mx-auto p-6">
      <Sidebar menuItems={getMenuItems()} />
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Profile & Settings</h1>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 flex items-center justify-center">
            <FaUser className="text-gray-500 text-3xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">{user?.displayName || "John Doe"}</h2>
            <p className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✔</span> Verified Delivery Partner
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
            onClick={() => navigate("/delivery-partner/settings/account")}
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
            onClick={() => navigate("/delivery-partner/settings/notifications")}
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
            onClick={() => navigate("/delivery-partner/paymentMethod")}
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
            onClick={() => navigate("/delivery-partner/settings/privacy")}
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
            onClick={() => navigate("/delivery/help")}
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
  );
};

export default DeliveryPartnerSettingsPage;