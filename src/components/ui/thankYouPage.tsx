import { CheckCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from './button';

export const ThankYouPage = () => {
  const { orders } = useCart();
  const { orderId } = useParams();
  const navigate = useNavigate();

  const order = orders.find(o => o.id === orderId);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      <div className="bg-white rounded-xl shadow-md p-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Thank You for Your Order!</h1>
        
        {order && (
          <>
            <p className="text-lg text-gray-600 mb-2">
              Order #{order.id} has been placed successfully.
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Total: ₹{order.totalAmount.toFixed(2)}
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={() => navigate("/purchase-history")}
            className="bg-green-600 hover:bg-green-700"
          >
            View Order Status
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/marketplace")}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};