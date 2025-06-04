import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { FaShoppingCart, FaStore } from 'react-icons/fa';
import { OrderConfirmationModal } from '../modals/orderConfirmationModal';
import { useState, useEffect } from 'react';
import Sidebar from './sidebar';
import { BiTrendingUp } from 'react-icons/bi';
import { ClipboardList, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

interface DisplayCartItem {
  id: string;
  quantity: number;
  name: string;
  farmerName: string;
  category: string;
  imageUrl: string;
}

const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalAmount,
    loading,
  } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [displayItems, setDisplayItems] = useState<DisplayCartItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch additional details for cart items
  useEffect(() => {
    const fetchItemDetails = async () => {
      if (cartItems.length === 0) {
        setDisplayItems([]);
        return;
      }

      setLoadingItems(true);
      try {
        const enrichedItems: DisplayCartItem[] = [];
        for (const item of cartItems) {
          // Fetch item details from 'items' collection
          const itemDocRef = doc(db, 'items', item.id);
          const itemDoc = await getDoc(itemDocRef);
          if (!itemDoc.exists()) continue;

          const itemData = itemDoc.data();
          const name = itemData.itemName || `Item ${item.id}`;
          const category = itemData.itemType || 'N/A';
          const imageUrl = itemData.imageUrls?.[0] || 'https://via.placeholder.com/150';

          // Fetch farmer details from 'farmer' collection
          let farmerName = 'Unknown Farmer';
          if (itemData.ownerUserId) {
            const farmerDocRef = doc(db, 'farmer', itemData.ownerUserId);
            const farmerDoc = await getDoc(farmerDocRef);
            if (farmerDoc.exists()) {
              farmerName = farmerDoc.data().fullName || 'Unknown Farmer';
            }
          }

          enrichedItems.push({
            id: item.id,
            quantity: item.quantity,
            name,
            farmerName,
            category,
            imageUrl,
          });
        }
        setDisplayItems(enrichedItems);
      } catch (error) {
        console.error('Error fetching item details:', error);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItemDetails();
  }, [cartItems]);

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsConfirmationOpen(true);
  };

  const handleOrderSuccess = (orderId: string) => {
    navigate(`/thank-you?orderId=${orderId}`);
  };

  const getMenuItems = () => {
    const commonItems = [
      {
        id: "dashboard",
        label: "Dashboard",
        onClick: () => navigate("/buyer/homepage"),
        icon: <LayoutDashboard className="text-white" />,
      },
      {
        id: "marketplace",
        label: "Marketplace",
        onClick: () => navigate("/marketplace"),
        icon: <FaStore className="text-white" />,
      },
      {
        id: "orders",
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
        onClick: () => navigate("/cart"),
      },
      {
        id: "purchase-history",
        label: "Purchase History",
        onClick: () => navigate("/purchase-history"),
        icon: <ClipboardList className="text-white" />,
      },
      {
        id: "biding-items",
        label: "Biding Items",
        onClick: () => navigate("/buyer/biding"),
        icon: <BiTrendingUp className="text-white" />,
      },
      {
        id: "settings",
        label: "Settings",
        onClick: () => navigate("/buyer/settings"),
        icon: <Settings className="text-white" />,
      },
    ];

    return [...commonItems];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Sidebar menuItems={getMenuItems()} />
      <div className="flex items-center">
        <h1 className="text-3xl font-bold text-gray-900 font-sans">Cart</h1>
      </div>

      {loading || loadingItems ? (
        <div className="text-center py-12">
          <p className="text-xl font-medium text-gray-600">Loading cart...</p>
        </div>
      ) : cartItems.length === 0 ? (
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
                {displayItems.map(item => (
                  <div key={item.id} className="p-6 flex flex-col sm:flex-row items-center">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg mr-4 mb-4 sm:mb-0"
                    />
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">{item.name}</h3>
                          <p className="text-sm text-gray-600">Farmer: {item.farmerName}</p>
                          <p className="text-sm text-gray-600">Category: {item.category}</p>
                        </div>
                        <p className="text-lg font-semibold text-green-600">
                          Quantity: {item.quantity}
                        </p>
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
        cartItems={displayItems.map(item => ({
          id: item.id,
          name: item.name,
          price: "0", // Placeholder price since it's not fetched
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        }))}
        onConfirm={handleOrderSuccess}
      />
    </div>
  );
};

export default CartPage;