
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { FaAngleLeft } from 'react-icons/fa';
import CommonFooter from './footer';
import { useAuth } from '../../context/authContext';


const TermsAndConditionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigate = () => {
    switch (user?.role) {
      case 'buyer':
        navigate('/buyer/Dashboard');
        break;
      case 'farmer':
        navigate('/farmer/Dashboard');
        break;
      case 'deliveryPartner':
        navigate('/deliveryPartner/Dashboard');
        break;
      default:
        navigate('/');
        console.warn('User role is undefined or invalid:', user?.role);
        break;
    }
  };


  return (
    <div className="w-full bg-gradient-to-b from-green-0 to-green-100  text-black min-h-screen ">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in py-12">
        {/* Navigation */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={handleNavigate}
            className="flex items-center text-gray-600 hover:text-gray-900 font-sans"
          >
            <FaAngleLeft className="h-5 w-5 mr-2" />
          </Button>
        </div>

        {/* Content */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-8 text-center font-serif">
          Terms and Conditions
        </h1>
        <div className="text-gray-700 font-sans text-base md:text-lg leading-relaxed space-y-8">
          <p className="text-center">
            Welcome to our agricultural marketplace. These Terms and Conditions govern your use of our platform, including all features related to bidding, purchasing, and interacting with farmers. By accessing or using our services, you agree to be bound by these terms.
          </p>

          <ol className="list-decimal list-inside space-y-6">
            <li>
              <span className="font-medium text-gray-800">Acceptance of Terms</span>
              <p>
                By creating an account or using our platform, you acknowledge that you have read, understood, and agree to these Terms and Conditions, as well as our Privacy Policy. If you do not agree, you may not use our services.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-800">Use of Platform</span>
              <p>
                To access features such as bidding or purchasing, you must register an account with accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted through your account. Prohibited activities include, but are not limited to, fraudulent bidding, impersonation, or any actions that interfere with the platform's operations.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-800">Bidding and Purchasing</span>
              <p>
                Our platform enables users to bid on or directly purchase agricultural products from farmers. Bids are binding upon acceptance by the farmer, and direct purchases are finalized upon payment. You agree to honor all transactions initiated through your account. Farmers are responsible for providing accurate product descriptions, including quality, quantity, and availability.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-800">Payments</span>
              <p>
                Payments for bids and purchases are processed through our secure payment gateway. Buyers must complete payments promptly upon transaction confirmation. Farmers will receive payouts after delivery, in accordance with our payment schedule. Refunds may be issued for non-delivery or significant product discrepancies, subject to our dispute resolution process.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-800">Dispute Resolution</span>
              <p>
                In the event of a dispute (e.g., regarding product quality or delivery), buyers and farmers should attempt to resolve the issue directly. If resolution is not possible, you may contact our support team for mediation. We reserve the right to make final decisions on disputes based on evidence provided. All disputes are governed by the laws of [Your Jurisdiction].
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-800">Liability</span>
              <p>
                Our platform serves as an intermediary and is not responsible for the quality, safety, or legality of products listed by farmers. We are not liable for any damages, losses, or disputes arising from transactions. Users are solely responsible for their actions and compliance with applicable laws and regulations.
              </p>
            </li>
            <li>
              <span className="font-medium text-gray-800">Changes to Terms</span>
              <p>
                We may update these Terms and Conditions at our discretion. Changes will be communicated via email or through the platform. Continued use of our services after updates constitutes acceptance of the revised terms.
              </p>
            </li>
          </ol>

          <p className="text-center">
            For any questions or concerns regarding these terms, please contact our support team at [support@example.com]. Last updated: May 8, 2025.
          </p>
        </div>
      </div>
      <CommonFooter />
    </div>
  );
};

export default TermsAndConditionsPage;