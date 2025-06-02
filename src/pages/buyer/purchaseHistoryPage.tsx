import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { OrderStatusBadge } from '../../components/ui/orderStatusBadge';
import { FaAngleLeft, FaShoppingCart, FaStore } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { ClipboardList, LayoutDashboard, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import TrackOrderModal from '../../components/ui/TrackOrderModal';
import Sidebar from '../../components/ui/sidebar';
import { BiTrendingUp } from 'react-icons/bi';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface TrackingDetails {
  deliveryPartnerId?: string;
  amount?: number;
  acceptedForDelivery?: boolean;
  onMyWayToFarmer?: boolean;
  reachedFarmer?: boolean;
  pickedUpOrder?: boolean;
  onMyWayToBuyer?: boolean;
  reachedBuyer?: boolean;
  deliveredOrder?: boolean;
}

interface DeliveryPartner {
  name: string;
  amount?: number;
  pickupTime?: string;
}

interface Order {
  id: string;
  buyerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'New' | 'Preparing' | 'Ready' | 'Picked Up' | 'Out for Delivery' | 'Delivered';
  createdAt: any;
  acceptedAt?: any;
  readyAt?: any;
  pickedUpAt?: any;
  deliveredAt?: any;
  trackingDetails?: TrackingDetails;
  source: 'order' | 'bidItem';
  deliveryAddress?: string;
  deliveryPartner?: DeliveryPartner;
}

interface BidItem {
  id: string;
  itemName: string;
  quantity: number;
  acceptedBid: { buyerId: string; bidAmount: number; deliveryAmount?: number; acceptedAt: any };
  deliveryDetails?: Array<{
    amount: number;
    deliveryPartnerId: string;
    lockedAt: any;
    acceptedForDelivery?: boolean;
    onMyWayToFarmer?: boolean;
    reachedFarmer?: boolean;
    pickedUpOrder?: boolean;
    onMyWayToBuyer?: boolean;
    reachedBuyer?: boolean;
    deliveredOrder?: boolean;
  }>;
}

interface User {
  fullName: string;
}

const PurchaseHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          setError("You need to be logged in to view orders");
          setLoading(false);
          return;
        }

        const userId = user.uid;

        if (!userId) {
          setError("User ID not found");
          setLoading(false);
          return;
        }

        // Fetch regular orders
        const ordersQuery = query(
          collection(db, 'orders'),
          where('buyerId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => {
          const data = doc.data();
          let status: 'New' | 'Preparing' | 'Ready' | 'Picked Up' | 'Out for Delivery' | 'Delivered' = 'New';
          const tracking = data.trackingDetails || {};
          if (tracking.deliveredOrder || data.status === 'Delivered') {
            status = 'Delivered';
          } else if (tracking.onMyWayToBuyer || data.status === 'Out for Delivery') {
            status = 'Out for Delivery';
          } else if (tracking.pickedUpOrder || data.status === 'Picked Up') {
            status = 'Picked Up';
          } else if (data.status === 'Ready') {
            status = 'Ready';
          } else if (data.status === 'Preparing') {
            status = 'Preparing';
          } else if (data.status === 'pending') {
            status = 'New';
          }

          return {
            id: doc.id,
            buyerName: data.buyerId || user.email || 'You',
            items: data.items
              ? data.items.map((item: any) => ({
                  name: item.name || 'Unknown Item',
                  price: item.price || 0,
                  quantity: item.quantity || 1,
                  imageUrl: item.imageUrl || 'https://via.placeholder.com/150',
                }))
              : [],
            totalAmount: data.totalAmount || 0,
            status,
            createdAt: data.createdAt,
            acceptedAt: data.acceptedAt,
            readyAt: data.readyAt,
            pickedUpAt: data.pickedUpAt,
            deliveredAt: data.deliveredAt,
            trackingDetails: data.trackingDetails || {},
            source: 'order' as const,
            deliveryAddress: data.deliveryAddress,
            deliveryPartner: undefined,
          };
        }) as Order[];

        // Fetch bid items
        const bidItemsQuery = query(
          collection(db, 'bidItems'),
          where('acceptedBid.buyerId', '==', userId),
          orderBy('acceptedBid.acceptedAt', 'desc')
        );
        const bidItemsSnapshot = await getDocs(bidItemsQuery);
        const bidItemsData = bidItemsSnapshot.docs.map(doc => {
          const bidItem = doc.data() as BidItem;
          const delivery = (bidItem.deliveryDetails?.find(detail => detail.acceptedForDelivery) ??
            {}) as NonNullable<BidItem['deliveryDetails']>[number];
          let status: 'New' | 'Preparing' | 'Ready' | 'Picked Up' | 'Out for Delivery' | 'Delivered' = 'New';
          let pickedUpAt: any;
          let deliveredAt: any;

          if (delivery && delivery.deliveredOrder) {
            status = 'Delivered';
            deliveredAt = delivery.lockedAt || undefined;
          } else if (delivery && delivery.onMyWayToBuyer && !delivery.reachedBuyer) {
            status = 'Out for Delivery';
            if (delivery.pickedUpOrder) {
              pickedUpAt = delivery.lockedAt || undefined;
            }
          } else if (delivery && delivery.pickedUpOrder) {
            status = 'Picked Up';
            pickedUpAt = delivery.lockedAt || undefined;
          } else if (delivery && delivery.reachedFarmer) {
            status = 'Ready';
          } else if (delivery && delivery.acceptedForDelivery) {
            status = 'Preparing';
          }

          return {
            id: doc.id,
            buyerName: user.email || 'You',
            items: [
              {
                name: bidItem.itemName || 'Unknown Item',
                price: (bidItem.acceptedBid?.bidAmount || 0) / (bidItem.quantity || 1),
                quantity: bidItem.quantity || 1,
                imageUrl: 'https://via.placeholder.com/150',
              },
            ],
            totalAmount: (bidItem.acceptedBid?.bidAmount || 0) + (bidItem.acceptedBid?.deliveryAmount || 0),
            status,
            createdAt: bidItem.acceptedBid?.acceptedAt,
            acceptedAt: bidItem.acceptedBid?.acceptedAt,
            readyAt: delivery.reachedFarmer ? (delivery.lockedAt || undefined) : undefined,
            pickedUpAt,
            deliveredAt,
            trackingDetails: delivery,
            source: 'bidItem' as const,
            deliveryAddress: undefined,
            deliveryPartner: undefined,
          };
        }) as Order[];

        // Fetch buyer names
        const allBuyerIds = [...new Set([...ordersData, ...bidItemsData].map(order => order.buyerName))];
        const buyerNamesMap: { [key: string]: string } = {};
        const buyerPromises = allBuyerIds.map(async (buyerId: string) => {
          try {
            const buyerDoc = await getDoc(doc(db, 'buyer', buyerId));
            if (buyerDoc.exists()) {
              const buyerData = buyerDoc.data() as User;
              buyerNamesMap[buyerId] = buyerData.fullName || buyerId;
            } else {
              buyerNamesMap[buyerId] = buyerId;
            }
          } catch (err) {
            console.error(`Error fetching buyer ${buyerId}:`, err);
            buyerNamesMap[buyerId] = buyerId;
          }
        });
        await Promise.all(buyerPromises);

        // Fetch delivery partner details
        const updatedOrders: Order[] = await Promise.all([...ordersData, ...bidItemsData].map(async (order) => {
          let deliveryPartner: DeliveryPartner | undefined = undefined;
          const delivery = order.trackingDetails;

          if (delivery?.deliveryPartnerId) {
            try {
              const deliveryPartnerDoc = await getDoc(doc(db, 'deliveryPartners', delivery.deliveryPartnerId));
              const deliveryPartnerData = deliveryPartnerDoc.exists() ? deliveryPartnerDoc.data() : {};
              deliveryPartner = {
                name: deliveryPartnerData.fullName || delivery.deliveryPartnerId,
                amount: delivery.amount || 0,
                pickupTime: delivery.pickedUpOrder && order.pickedUpAt ? formatDate(order.pickedUpAt) : undefined,
              };
            } catch (err) {
              console.error(`Error fetching delivery partner for order ${order.id}:`, err);
            }
          }

          return {
            ...order,
            buyerName: buyerNamesMap[order.buyerName] || order.buyerName,
            deliveryPartner,
          };
        }));

        // Sort orders by createdAt
        const combinedOrders = updatedOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setOrders(combinedOrders);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load purchase history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleBackToDashboard = () => {
    navigate('/buyer/homePage');
  };

  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleRateOrder = (orderId: string) => {
    navigate(`/buyer/rateOrder/${orderId}`);
  };

  const closeModal = () => {
    setSelectedOrder(null);
  };

  const formatDate = (timestamp: any) => {
    try {
      return timestamp?.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date not available';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="flex items-center text-gray-600 hover:text-gray-900 font-sans"
          >
            <FaAngleLeft className="mr-2 h-5 w-5" />
          </Button>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="flex items-center text-gray-600 hover:text-gray-900 font-sans"
          >
            <FaAngleLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 font-sans">{error}</h2>
        </div>
      </div>
    );
  }
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
      <Sidebar menuItems={getMenuItems()}/>
       <div className="flex items-center mb-8">
           
            <h1 className="text-3xl font-bold text-gray-900 font-sans">
              Purchase History
            </h1>
          </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-xl font-medium text-gray-600 mb-4 font-sans">
            No orders found for {user?.email || 'you'}
          </h2>
          <Button
            onClick={() => navigate("/marketplace")}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
          >
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => {
            const isDelivered = order.status === 'Delivered';
            const orderName = order.source === 'bidItem' 
              ? `Bid Item: ${order.items[0]?.name || 'Unknown Item'}` 
              : `Order #${order.id.substring(0, 8)}`;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 font-serif">
                      {orderName}
                    </h3>
                    <p className="text-sm text-gray-600 font-sans">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-sm text-gray-600 font-sans mt-1">
                        Delivered to: {order.deliveryAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <OrderStatusBadge
                      status={
                        order.status === 'New' ? 'pending' :
                        order.status === 'Preparing' ? 'processing' :
                        order.status === 'Ready' ? 'processing' :
                        order.status === 'Picked Up' ? 'shipped' :
                        order.status === 'Out for Delivery' ? 'shipped' :
                        order.status === 'Delivered' ? 'delivered' :
                        'pending'
                      }
                    />
                    {isDelivered ? (
                      <Button
                        onClick={() => handleRateOrder(order.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1 px-3 rounded-lg text-sm font-sans"
                      >
                        Rate Order
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleTrackOrder(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg text-sm font-sans"
                      >
                        Track Order
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  {order.items.map((item, index) => (
                    <div
                      key={`${order.id}-${index}`}
                      className="flex py-4 first:pt-0 last:pb-0 items-center hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <img
                        className="h-16 w-16 rounded-lg object-cover border border-gray-100"
                        src={item.imageUrl || 'https://via.placeholder.com/150'}
                        alt={item.name}
                      />
                      <div className="ml-4 flex-1">
                        <h4 className="text-base font-medium text-gray-800 font-sans">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600 font-sans">
                          {item.quantity} × ₹{item.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-base font-medium text-gray-800 font-sans">
                        ₹{(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6 flex justify-between items-center">
                  <p className="text-base font-medium text-gray-800 font-sans">Total</p>
                  <p className="text-lg font-bold text-green-600 font-sans">
                    ₹{order.totalAmount.toFixed(2)}
                  </p>
                </div>

                {order.deliveryPartner && (
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-600 font-sans">
                      <strong>Delivery Partner:</strong> {order.deliveryPartner.name}
                    </p>
                    {order.deliveryPartner.amount !== undefined && (
                      <p className="text-sm text-gray-600 font-sans">
                        <strong>Delivery Fee:</strong> ₹{order.deliveryPartner.amount.toFixed(2)}
                      </p>
                    )}
                    {order.deliveryPartner.pickupTime && (
                      <p className="text-sm text-gray-600 font-sans">
                        <strong>Picked Up:</strong> {order.deliveryPartner.pickupTime}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && selectedOrder.items.length > 0 && (
        <TrackOrderModal
          order={{
            id: selectedOrder.id,
            name: selectedOrder.items[0]?.name || 'Order',
            trackingDetails: selectedOrder.trackingDetails || {},
          }}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default PurchaseHistoryPage;