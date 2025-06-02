import { FaHandshake } from "react-icons/fa";
import TemperatureDetail from "../../components/ui/temperatureDetails";
import MarketAnalysis from "../../components/ui/marketAnalysis";
// import Navbar from "../../components/ui/navbar";
import { LayoutDashboard, Leaf, ListCheckIcon, LucideSprout, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GovernmentSchemeUpdates from "./governmentSchemes";
import TrainingResources from "./trainingResources";
import FarmerDashboard from "./dashboard";
import Sidebar from "../../components/ui/sidebar";
import { useTranslation } from "react-i18next";
// import NotificationComponent from "../../components/ui/notificationComponent";

const FarmerHomePage = () => {
  const navigate = useNavigate();
    const { t } = useTranslation();

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
    <div className="flex flex-col min-h-screen bg-gray-50">
       {/* <div className="px-auto mx-auto sm:px-6 lg:px-8 py-12 max-w-7xl">
          <NotificationComponent userType="Farmers" />
          </div> */}
      <Sidebar menuItems={getMenuItems()} />
      <FarmerDashboard />
      
      {/* Main Content */}
      <div>
        <div className="mx-auto sm:px-6 lg:px-8 py-12 max-w-7xl">
          {/* Temperature and Market Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <TemperatureDetail />
            <MarketAnalysis />
            <GovernmentSchemeUpdates />
            <TrainingResources />
          </div>

          {/* Market Prices Section */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Current Market Prices</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Trend</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Premium Wheat</td>
                    <td className="px-6 py-4 whitespace-nowrap">23 farmers</td>
                    <td className="px-6 py-4 whitespace-nowrap">5.7 tons</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">+9%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Organic Tomatoes</td>
                    <td className="px-6 py-4 whitespace-nowrap">15 farmers</td>
                    <td className="px-6 py-4 whitespace-nowrap">2.3 tons</td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">-4%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Basmati Rice</td>
                    <td className="px-6 py-4 whitespace-nowrap">42 farmers</td>
                    <td className="px-6 py-4 whitespace-nowrap">8.1 tons</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">+12%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FarmerHomePage;