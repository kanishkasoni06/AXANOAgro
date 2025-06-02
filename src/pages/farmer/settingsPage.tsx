import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { auth } from "../../firebase/firebase";
import { FaUser, FaBell, FaGlobe, FaCreditCard, FaLock, FaQuestionCircle, FaAngleRight, FaHandshake } from "react-icons/fa";
import Sidebar from "../../components/ui/sidebar";
import { LayoutDashboard, Leaf, ListCheckIcon, LucideSprout, Settings } from "lucide-react";

interface UserProfile {
  displayName: string | null;
  email: string | null;
}

const FarmerSettings = () => {
  const { t } = useTranslation(); // Hook for translations
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser({
        displayName: currentUser.displayName || t('defaultFarmerName'), // Use translation for fallback name
        email: currentUser.email,
      });
    } else {
      navigate("/farmer/settings"); // Redirect to login if not authenticated
    }
  }, [navigate, t]);

  const getMenuItems = () => {
    return [
      {
        label: t('dashboard'),
        onClick: () => navigate("/farmer/homePage"),
        icon: <LayoutDashboard className="text-white" />
      },
      {
        label: t('addProduct'),
        onClick: () => navigate("/farmer/add-product"),
        icon: <LucideSprout className="text-white" />
      },
      {
        label: t('orders'),
        onClick: () => navigate("/farmer/orders"),
        icon: <ListCheckIcon className="text-white" />
      },
      {
        label: t('biding'),
        onClick: () => navigate("/farmer/biding"),
        icon: <FaHandshake className="text-white" />
      },
      {
        label: t('advisory'),
        onClick: () => navigate("/farmer/advisory"),
        icon: <Leaf className="text-white" />
      },
      {
        label: t('settings'),
        onClick: () => navigate("/farmer/settings"),
        icon: <Settings className="text-white" />
      },
    ];
  };

  return (
    <div className="min-h-screen pt-12 bg-gray-50">
      <Sidebar menuItems={getMenuItems()} />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-800">{t('profileAndSettings')}</h1>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 flex items-center justify-center">
            <FaUser className="text-gray-500 text-3xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">{user?.displayName || t('defaultFarmerName')}</h2>
            <p className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✔</span> {t('verifiedFarmer')}
            </p>
            <button
              onClick={() => navigate("/settings/edit-profile")}
              className="text-sm text-blue-600 hover:underline mt-1"
            >
              {t('editProfile')}
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
                <h3 className="text-gray-800 font-medium">{t('accountSettings')}</h3>
                <p className="text-sm text-gray-500">{t('accountSettingsDesc')}</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight /></span>
          </div>

          <div
            onClick={() => navigate("/settings/notifications")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaBell className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">{t('notifications')}</h3>
                <p className="text-sm text-gray-500">{t('notificationsDesc')}</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight /></span>
          </div>

          <div
            onClick={() => navigate("/language-selection", { state: { fromSettings: true } })}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaGlobe className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">{t('language')}</h3>
                <p className="text-sm text-gray-500">{t('languageDesc')}</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight /></span>
          </div>

          <div
            onClick={() => navigate("/paymentMethod")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaCreditCard className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">{t('paymentMethods')}</h3>
                <p className="text-sm text-gray-500">{t('paymentMethodsDesc')}</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight /></span>
          </div>

          <div
            onClick={() => navigate("/settings/privacy")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaLock className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">{t('privacyAndSecurity')}</h3>
                <p className="text-sm text-gray-500">{t('privacyAndSecurityDesc')}</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight /></span>
          </div>

          <div
            onClick={() => navigate("/farmer/help")}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <div className="flex items-center">
              <FaQuestionCircle className="text-green-600 text-xl mr-4" />
              <div>
                <h3 className="text-gray-800 font-medium">{t('helpAndSupport')}</h3>
                <p className="text-sm text-gray-500">{t('helpAndSupportDesc')}</p>
              </div>
            </div>
            <span className="text-gray-400"><FaAngleRight /></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerSettings;