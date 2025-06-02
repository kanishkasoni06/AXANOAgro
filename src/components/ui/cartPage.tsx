import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import {  FaShoppingCart, FaStore } from 'react-icons/fa';
import { OrderConfirmationModal } from '../modals/orderConfirmationModal';
import { useState } from 'react';
import Sidebar from './sidebar';
import { BiTrendingUp } from 'react-icons/bi';
import { ClipboardList, LayoutDashboard, Settings } from 'lucide-react';

const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalAmount,
  } = useCart();
  const navigate = useNavigate();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

 

  const handleCheckout = () => {
    setIsConfirmationOpen(true);
  };

  const handleOrderSuccess = (orderId: string) => {
    navigate(`/thank-you?orderId=${orderId}`);
  };
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Sidebar menuItems={getMenuItems()} />
      {/* Back button with icon */}
       <div className="flex items-center">
            
            <h1 className="text-3xl font-bold text-gray-900 font-sans">
              Cart
            </h1>
          </div>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 mb-4">Your cart is empty</h2>
          <Button 
            onClick={() => navigate('/marketplace')}
            className="bg-green-600 hover:bg-green-700"
          >
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="divide-y divide-gray-200">
                {cartItems.map(item => (
                  <div key={item.id} className="p-6 flex flex-col sm:flex-row">
                    <div className="flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                      <img
                        className="h-24 w-24 rounded-md object-cover"
                        src={item.imageUrl}
                        alt={item.name}
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <h3 className="text-lg font-medium text-gray-800">{item.name}</h3>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center">
                        <p className="text-gray-600">₹{item.price.toFixed(2)} per kg</p>
                      </div>
                      <div className="mt-4 flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="mx-4">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button
                          variant="ghost"
                          className="ml-auto text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Order Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">Free</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-semibold text-green-600">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
                <Button
                  className="w-full mt-6 bg-green-600 hover:bg-green-700"
                  onClick={handleCheckout}
                >
                  Place Order
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-2 border-red-500 text-red-500 hover:bg-red-50"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <OrderConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        totalAmount={totalAmount}
        cartItems={cartItems.map(item => ({
          ...item,
          price: item.price.toString(),
        }))}
        onConfirm={handleOrderSuccess}
      />
    </div>
  );
};

export default CartPage;