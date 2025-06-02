import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaAngleLeft, FaCreditCard, FaMobileAlt, FaUniversity, FaMoneyBillAlt, FaCheckCircle } from 'react-icons/fa';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/authContext';

const paymentMethods = [
  {
    id: 'credit-debit-card',
    title: 'Credit/Debit Card',
    description: 'Pay securely with your Visa, MasterCard, or other cards.',
    icon: <FaCreditCard className="text-green-600 text-2xl" />,
  },
  {
    id: 'upi',
    title: 'UPI',
    description: 'Use Google Pay, PhonePe, or any UPI app to pay instantly.',
    icon: <FaMobileAlt className="text-green-600 text-2xl" />,
  },
  {
    id: 'net-banking',
    title: 'Net Banking',
    description: 'Pay directly from your bank account with secure net banking.',
    icon: <FaUniversity className="text-green-600 text-2xl" />,
  },
  {
    id: 'cash-on-delivery',
    title: 'Cash on Delivery',
    description: 'Pay in cash when your order is delivered.',
    icon: <FaMoneyBillAlt className="text-green-600 text-2xl" />,
  },
];

const TransactionMethodSelection = () => {
    const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handleBackToDashboard = () => {
    switch (user?.role) {
        case 'farmer':
          navigate('/farmer/settings');
          break;
        case 'buyer':
          navigate('/buyer/settings');
          break;
        case 'deliveryPartner':
          navigate('/delivery/Dashboard');
          break;
        default:
          navigate('/');
          console.warn('User role is undefined or invalid:', user?.role);
          break;
      }
  };

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handlePayNow = () => {
    if (!selectedMethod) return;
    console.log('Proceeding with payment method:', selectedMethod); // Placeholder for payment integration
    // Future: Redirect to payment gateway or confirm COD order
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-green-50 to-green-100">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="flex items-center text-gray-600 hover:text-gray-900 font-sans"
          >
            <FaAngleLeft className="mr-2 h-5 w-5" />
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8 font-sans">Select Payment Method</h1>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center mb-6">
            <FaCreditCard className="text-green-600 text-3xl mr-4" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 font-sans">Payment Options</h2>
              <p className="text-sm text-gray-500 font-sans">
                Choose a payment method to proceed with your transaction.
              </p>
            </div>
          </div>

          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                selectedMethod === method.id
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectMethod(method.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {method.icon}
                  <div className="ml-4">
                    <h3 className="text-gray-800 font-medium font-sans">{method.title}</h3>
                    <p className="text-sm text-gray-600 font-sans">{method.description}</p>
                  </div>
                </div>
                {selectedMethod === method.id && (
                  <FaCheckCircle className="text-green-600 text-xl" />
                )}
              </div>
            </div>
          ))}

          <div className="p-4 text-center">
            <Button
              onClick={handlePayNow}
              className={`font-medium py-3 px-8 rounded-lg text-base font-sans ${
                selectedMethod
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedMethod}
            >
              Pay Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionMethodSelection;