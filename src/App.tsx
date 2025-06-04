import { Routes, Route } from 'react-router-dom'
import './i18n';
import Home from './pages/Home'
import Intro from './pages/Intro'
import Intro2 from './pages/Intro2'
import Intro3 from './pages/Intro3'
import LanguageSelection from './pages/LanguageSelection'
import RoleSelection from './pages/RoleSelection'
import FarmerProfilePage from './pages/farmer/Profile'
import BuyerProfilePage from './pages/buyer/Profile'
import DeliveryProfilePage from './pages/delivery/Profile'
import { CartProvider } from './context/CartContext'
import CartPage from './components/ui/cartPage'
import MarketPlace from './pages/buyer/marketPlace'
import { ThankYouPage } from './components/ui/thankYouPage'
import PurchaseHistoryPage from './pages/buyer/purchaseHistoryPage'
import AddProductForm from './pages/farmer/addProduct'
import FarmerSettings from './pages/farmer/settingsPage'
import AdvisoryPage from './pages/farmer/advisory'
import LoginPage from './loginPage'
import { AuthProvider, useAuth } from './context/authContext'
import FarmerBiddingPage from './pages/farmer/bidingPage'
import BuyerBiddingPage from './pages/buyer/bidingPage'
import BuyerSettingsPage from './pages/buyer/settingsPage'
import TermsAndConditionsPage from './components/ui/terms&conditions'
import KYCVerificationPage from './KYCVerification'
import EditProfilePage from './pages/editProfile'
import HelpAndSupport from './pages/farmer/help&support'
import BuyerHelpAndSupport from './pages/buyer/help&support'
import TransactionMethodSelection from './pages/paymentMethod'
import RateOrderPage from './pages/buyer/rateOrders'
import MyDeliveries from './pages/delivery/myDeliveries'
import DeliveryPartnerSettingsPage from './pages/delivery/settings'
import DeliveryPartnerHelpAndSupport from './pages/delivery/help&Support'
import NotificationsPage from './pages/delivery/notification'
import BuyerHomePage from './pages/buyer/buyerHomePage'
import FarmerHomePage from './pages/farmer/farmerHomePage'
import DeliveryDashboard from './pages/delivery/homePage'
import BuyerDashboard from './pages/buyer/dashboard'
import Orders from './pages/farmer/OrdersPage'
import DeliveryPartnerDashboard from './pages/delivery/dashboard'
import MapPage from './pages/delivery/mapPage';
import AdminDashboard from './pages/admin/dashboard';
import AdminBids from './pages/admin/AdminBids';
import AdminBuyers from './pages/admin/AdminBuyers';
import AdminFarmers from './pages/admin/AdminFarmers';
import AdminDeliveryPartners from './pages/admin/AdminDeliveryPartners';
import AdminOrders from './pages/admin/AdminOrders';
import AdminNotification from './pages/admin/AdminNotifications';
// import NotificationComponent from './components/ui/notificationComponent';
import { useEffect } from 'react';
import { db, requestNotificationPermission } from './firebase/firebase';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { doc, getDoc } from 'firebase/firestore';
import ProductDetailsPage from './pages/farmer/ProductDetailsPage';


function App() {
  const LanguageInitializer = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  useEffect(() => { requestNotificationPermission()},[]);
  useEffect(() => {
    const initializeLanguage = async () => {
      // First, check localStorage
      const storedLanguage = localStorage.getItem('preferredLanguage');
      if (storedLanguage && storedLanguage !== i18n.language) {
        i18n.changeLanguage(storedLanguage);
      }

      // For logged-in users, check Firestore
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'farmer', user.uid));
          const preferredLanguage = userDoc.data()?.preferredLanguage;
          if (preferredLanguage && preferredLanguage !== i18n.language) {
            i18n.changeLanguage(preferredLanguage);
            localStorage.setItem('preferredLanguage', preferredLanguage);
            localStorage.setItem('i18nextLng', preferredLanguage);
          }
        } catch (error) {
          console.error('Error fetching user language from Firestore:', error);
        }
      }
    };
    initializeLanguage();
  }, [user]);

  return <>{children}</>;
};
  return (
    <I18nextProvider i18n={i18n}>
    <AuthProvider>
    <CartProvider>
      <LanguageInitializer>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/intro" element={<Intro />} />
      <Route path="/intro2" element={<Intro2 />} />
      <Route path="/intro3" element={<Intro3 />} />
      <Route path="/language-selection" element={<LanguageSelection />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/farmer/Profile" element={<FarmerProfilePage/>} />
      <Route path="/buyer/Profile" element={<BuyerProfilePage/>} />
      <Route path="/delivery/Profile" element={<DeliveryProfilePage/>} />
      <Route path="/farmer/homePage" element={<FarmerHomePage/>} />
      <Route path="/delivery/homePage" element={<DeliveryDashboard/>} />
      <Route path="/delivery/dashboard" element={<DeliveryPartnerDashboard/>} />
      <Route path="/buyer/homePage" element={<BuyerHomePage/>} />
      <Route path="/buyer/dashboard" element={<BuyerDashboard/>} />
      <Route path="/cart" element={<CartPage/>} />
      <Route path="/marketplace" element={<MarketPlace/>} />
      <Route path="/thank-you" element={<ThankYouPage />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
      <Route path="/purchase-history" element={<PurchaseHistoryPage />} />
      <Route path="/farmer/orders" element={<Orders />} /> 
      <Route path="/farmer/add-product" element={<AddProductForm/>} />
      <Route path="/farmer/product/:productId" element={<ProductDetailsPage/>}/>
      <Route path="/farmer/settings" element={<FarmerSettings/>} />
      <Route path="/buyer/settings" element={<BuyerSettingsPage/>} />
      <Route path='/farmer/advisory' element={<AdvisoryPage/> } />
      <Route path="/login" element={<LoginPage />} /> 
      <Route path="/farmer/biding" element={<FarmerBiddingPage/>} />
      <Route path='/buyer/biding' element={<BuyerBiddingPage/>} />
      <Route path='KYCVerification' element={<KYCVerificationPage/>} />
      <Route path="/settings/edit-profile" element={<EditProfilePage />} />
      <Route path='/farmer/help' element={<HelpAndSupport/>} />
      <Route path='/buyer/help' element={<BuyerHelpAndSupport/>} />
      <Route path="/paymentMethod" element={<TransactionMethodSelection />} />
      <Route path='/buyer/rateOrder/:orderId' element={<RateOrderPage/>} />
      <Route path="/myDeliveries" element={<MyDeliveries />} />
      <Route path="/delivery/settings" element={<DeliveryPartnerSettingsPage/>} />
      <Route path="/delivery/help" element={<DeliveryPartnerHelpAndSupport/>} />
      <Route path="/delivery/notification" element={<NotificationsPage/>} />
      <Route path="/delivery/mapPage" element={<MapPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/orders" element={<AdminOrders />} />
      <Route path="/admin/bids" element={<AdminBids />} />
      <Route path="/admin/buyers" element={<AdminBuyers />} />
    <Route path="/admin/farmers" element={<AdminFarmers/>} />
      <Route path="/admin/delivery-partners" element={<AdminDeliveryPartners />} />
      <Route path='/admin/notifications' element={<AdminNotification />} />
      </Routes>
      </LanguageInitializer>
    </CartProvider>
    </AuthProvider>
    </I18nextProvider>
  )
}

export default App
