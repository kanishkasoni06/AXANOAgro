import { FaShoppingCart, FaStore } from "react-icons/fa";
import TemperatureDetail from "../../components/ui/temperatureDetails";
import MarketAnalysis from "../../components/ui/marketAnalysis";
import { ClipboardList, LayoutDashboard, Settings } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import { BiTrendingUp } from "react-icons/bi";
import PremiumProducts from "./premiumProducts";
import LoanAndInsurance from "./loan&Insurance";
import Sidebar from "../../components/ui/sidebar";
import BuyerDashboard from "./dashboard";

const BuyerHomePage = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();

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
            {totalItems > 0 && (
              <span className="ml-2 bg-white text-green-600 text-xs font-bold px-2 py-1 rounded-full">
                {totalItems}
              </span>
            )}
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
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <Sidebar menuItems={getMenuItems()} />
      <div className="mx-auto max-w-7xl">
      <BuyerDashboard />
      {/* Main Content */}
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Temperature, Market Analysis, Loan & Insurance, Premium Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <TemperatureDetail />
            <MarketAnalysis />
            <LoanAndInsurance />
            <PremiumProducts />
          </div>
          </div>
        </div>
      </div>
    
  );
};

export default BuyerHomePage;