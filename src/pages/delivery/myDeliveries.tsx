import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, getDoc, doc, DocumentData, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import {  FaMapMarkerAlt, FaBox, FaTruck, FaCheckCircle, FaEye, FaPhone, FaMap, FaChevronDown, FaChevronUp,FaClipboardList, FaMapMarkedAlt, FaHome } from 'react-icons/fa';
import { IoSettings } from 'react-icons/io5';
import Sidebar from '../../components/ui/sidebar';

// Interface for delivery details (completed deliveries from bidItems)
interface Delivery {
  orderId: string;
  itemName: string;
  quantity: number;
  pickupPoint: string;
  deliveryPoint: string;
  amountEarned: number;
  paymentReceived: boolean;
  farmerRating: number | null;
  buyerRating: number | null;
}

// Interface for order items (from orders collection)
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

// Interface for coordinates
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Interface for user details (farmer or buyer)
interface UserDetails {
  fullName: string;
  address: string;
  coordinates?: Coordinates;
}

// Interface for available orders (from orders collection)
interface AvailableOrder {
  orderId: string;
  itemName: string;
  quantity: number;
  pickupPoint: string;
  deliveryPoint: string;
  totalAmount: number;
  items: OrderItem[];
  distance: number;
  deliveryAmount: number;
  status: 'ready' | 'accepted'; // Added to indicate order status
}

// Interface for active deliveries (orders accepted by the delivery partner)
interface ActiveDelivery {
  orderId: string;
  itemName: string;
  quantity: number;
  pickupPoint: string;
  deliveryPoint: string;
  items: OrderItem[];
  distance: number;
  deliveryAmount: number;
  status: string;
  farmer: UserDetails;
  buyer: UserDetails;
  trackingStates: {
    onMyWayToFarmer: boolean;
    reachedFarmer: boolean;
    pickedUpOrder: boolean;
    onMyWayToBuyer: boolean;
    reachedBuyer: boolean;
    deliveredOrder: boolean;
  };
  priorityScore: number;
}

// Interface for orders (from orders collection)
interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress?: string;
  status: 'New' | 'Preparing' | 'ready' | 'Picked Up' | 'Out for Delivery' | 'Delivered';
  buyerId: string;
  deliveryDetails?: {
    deliveryPartnerId: string;
    assignedAt: Date;
    deliveryStatus: 'pending' | 'accepted';
    onMyWayToFarmer?: boolean;
    reachedFarmer?: boolean;
    pickedUpOrder?: boolean;
    onMyWayToBuyer?: boolean;
    reachedBuyer?: boolean;
    deliveredOrder?: boolean;
  };
}

interface DeliveryCardProps {
  delivery: Delivery;
}

interface AvailableOrderCardProps {
  order: AvailableOrder;
  onAccept: (orderId: string) => void;
  onViewDetails: (order: AvailableOrder) => void;
}

interface ActiveDeliveryCardProps {
  delivery: ActiveDelivery;
  onUpdateTrackingStatus: (orderId: string, statusKey: keyof ActiveDelivery['trackingStates']) => void;
  onExpand: (orderId: string) => void;
  isExpanded: boolean;
}

// Haversine formula for distance calculation
const haversineDistance = (
  coords1: Coordinates,
  coords2: Coordinates
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Number(distance.toFixed(2));
};

// Mock function to simulate distance calculation (in km) when coordinates are unavailable
const calculateDistance = (_pickupPoint: string): number => {
  return Math.floor(Math.random() * (50 - 5 + 1)) + 5;
};

// Calculate priority score for sorting active orders
const calculatePriorityScore = (delivery: ActiveDelivery): number => {
  const { trackingStates, status } = delivery;
  let score = 0;

  if (!trackingStates.onMyWayToFarmer) score += 100;
  else if (!trackingStates.reachedFarmer) score += 80;
  else if (!trackingStates.pickedUpOrder) score += 60;
  else if (!trackingStates.onMyWayToBuyer) score += 40;
  else if (!trackingStates.reachedBuyer) score += 20;
  else if (!trackingStates.deliveredOrder) score += 10;

  if (status === 'Ready') score += 5;
  if (status === 'Picked Up') score += 3;

  score -= delivery.distance * 0.1;

  return score;
};

// DeliveryCard component for completed deliveries
const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{delivery.itemName}</h3>
        <p className="text-xs text-gray-500 mt-1">Order #{delivery.orderId}</p>
      </div>
      <span className="text-xs font-medium text-white bg-[#2CD14D] px-2 py-1 rounded-full">
        Delivered
      </span>
    </div>
    <div className="mt-3 text-xs text-gray-600 space-y-1">
      <p className="flex items-center">
        <FaMapMarkerAlt className="mr-1 text-gray-400" />
        <span className="font-medium">Pickup:</span> {delivery.pickupPoint}
      </p>
      <p className="flex items-center">
        <FaMapMarkerAlt className="mr-1 text-gray-400" />
        <span className="font-medium">Delivery:</span> {delivery.deliveryPoint}
      </p>
      <p>
        <span className="font-medium">Earned:</span> ₹{delivery.amountEarned} •{' '}
        <span className="font-medium">Payment:</span>{' '}
        <span className={delivery.paymentReceived ? 'text-[#2CD14D]' : 'text-[#EF4F5F]'}>
          {delivery.paymentReceived ? 'Received' : 'Pending'}
        </span>
      </p>
    </div>
  </div>
);

// AvailableOrderCard component for available orders
const AvailableOrderCard: React.FC<AvailableOrderCardProps> = ({ order, onAccept, onViewDetails }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{order.itemName}</h3>
        <p className="text-xs text-gray-500 mt-1">Order #{order.orderId}</p>
      </div>
      <span className={`text-xs font-medium text-white px-2 py-1 rounded-full ${
        order.status === 'ready' ? 'bg-yellow-500' : 'bg-blue-500'
      }`}>
        {order.status}
      </span>
    </div>
    <div className="mt-3 text-xs text-gray-600 space-y-1">
      <p className="flex items-center">
        <FaMapMarkerAlt className="mr-1 text-gray-400" />
        <span className="font-medium">Pickup:</span> {order.pickupPoint}
      </p>
      <p className="flex items-center">
        <FaMapMarkerAlt className="mr-1 text-gray-400" />
        <span className="font-medium">Delivery:</span> {order.deliveryPoint}
      </p>
      <p>
        <span className="font-medium">Distance:</span> {order.distance} km •{' '}
        <span className="font-medium">Amount:</span> ₹{order.deliveryAmount}
      </p>
    </div>
    <div className="flex space-x-2 mt-3">
      <button
        onClick={() => onAccept(order.orderId)}
        className="flex-1 bg-[#2CD14D] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#24B042] flex items-center justify-center transition-all duration-200"
      >
        <FaCheckCircle className="mr-2" />
        Accept Order
      </button>
      <button
        onClick={() => onViewDetails(order)}
        className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
      >
        <FaEye className="mr-2" />
        View Details
      </button>
    </div>
  </div>
);

// ActiveDeliveryCard component for active deliveries
const ActiveDeliveryCard: React.FC<ActiveDeliveryCardProps> = ({ delivery, onUpdateTrackingStatus, onExpand, isExpanded }) => {
  const trackingSteps = [
    {
      key: 'onMyWayToFarmer' as keyof ActiveDelivery['trackingStates'],
      label: 'On the way to farmer',
      enabled: true,
      status: delivery.trackingStates.onMyWayToFarmer,
    },
    {
      key: 'reachedFarmer' as keyof ActiveDelivery['trackingStates'],
      label: 'Reached the farmer',
      enabled: delivery.trackingStates.onMyWayToFarmer,
      status: delivery.trackingStates.reachedFarmer,
    },
    {
      key: 'pickedUpOrder' as keyof ActiveDelivery['trackingStates'],
      label: 'Picked up the order',
      enabled: delivery.trackingStates.reachedFarmer,
      status: delivery.trackingStates.pickedUpOrder,
    },
    {
      key: 'onMyWayToBuyer' as keyof ActiveDelivery['trackingStates'],
      label: 'On the way to buyer',
      enabled: delivery.trackingStates.pickedUpOrder,
      status: delivery.trackingStates.onMyWayToBuyer,
    },
    {
      key: 'reachedBuyer' as keyof ActiveDelivery['trackingStates'],
      label: 'Reached the buyer',
      enabled: delivery.trackingStates.onMyWayToBuyer,
      status: delivery.trackingStates.reachedBuyer,
    },
    {
      key: 'deliveredOrder' as keyof ActiveDelivery['trackingStates'],
      label: 'Delivered the order',
      enabled: delivery.trackingStates.reachedBuyer,
      status: delivery.trackingStates.deliveredOrder,
    },
  ];

  const isCompleted = trackingSteps.every(step => step.status);
  const nextStep = trackingSteps.find(step => !step.status && step.enabled);

  return (
    <div className="bg-white rounded-xl shadow-sm mb-3 border border-gray-100 transition-all hover:shadow-md">
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => onExpand(delivery.orderId)}>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="text-base font-semibold text-gray-800">{delivery.itemName}</h3>
              <span className="ml-2 text-xs font-medium text-white bg-blue-500 px-2 py-1 rounded-full">
                {delivery.status}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-500">
              Priority: {Math.round(delivery.priorityScore)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Order #{delivery.orderId}</p>
          <p className="text-xs text-gray-600 mt-1">
            <span className="font-medium">Distance:</span> {delivery.distance} km •{' '}
            <span className="font-medium">Amount:</span> ₹{delivery.deliveryAmount}
          </p>
          {!isCompleted && nextStep && (
            <p className="text-xs text-[#2CD14D] mt-1 font-medium">Next: {nextStep.label}</p>
          )}
        </div>
        <div className="flex items-center ml-3">
          {isExpanded ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-600 mb-3 space-y-1">
            <p className="flex items-center">
              <FaMapMarkerAlt className="mr-1 text-gray-400" />
              <span className="font-medium">Pickup:</span> {delivery.pickupPoint}
            </p>
            <p className="flex items-center">
              <FaMapMarkerAlt className="mr-1 text-gray-400" />
              <span className="font-medium">Delivery:</span> {delivery.deliveryPoint}
            </p>
          </div>
          <div className="relative">
            {trackingSteps.map((step, index) => (
              <div key={step.key} className="flex items-start mb-3 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.status
                        ? 'bg-[#2CD14D] text-white'
                        : step.enabled
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.status ? <FaCheckCircle size={14} /> : index + 1}
                  </div>
                  {index < trackingSteps.length - 1 && (
                    <div
                      className={`w-0.5 h-6 mt-1 ${
                        step.status ? 'bg-[#2CD14D]' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.status
                        ? 'text-[#2CD14D]'
                        : step.enabled
                        ? 'text-blue-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!isCompleted && nextStep && (
            <button
              onClick={() => onUpdateTrackingStatus(delivery.orderId, nextStep.key)}
              className="w-full bg-[#2CD14D] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#24B042] transition-all duration-200 mt-3"
            >
              Mark as {nextStep.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Main MyDeliveries component
const MyDeliveries: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAcceptOrder = async (orderId: string) => {
    try {
      if (!user) {
        setError('You must be logged in to accept an order.');
        return;
      }
      await updateDoc(doc(db, 'orders', orderId), {
        deliveryDetails: {
          deliveryPartnerId: user.uid,
          assignedAt: new Date(),
          deliveryStatus: 'accepted',
          onMyWayToFarmer: false,
          reachedFarmer: false,
          pickedUpOrder: false,
          onMyWayToBuyer: false,
          reachedBuyer: false,
          deliveredOrder: false,
        },
      });
      console.log(`Order ${orderId} accepted by delivery partner ${user.uid}`);
    } catch (err: any) {
      console.error(`Error accepting order ${orderId}:`, err.code, err.message);
      setError('Failed to accept order. Please try again.');
    }
  };

  const handleUpdateTrackingStatus = async (orderId: string, statusKey: keyof ActiveDelivery['trackingStates']) => {
    if (!user) {
      setError('You must be logged in to update tracking status.');
      return;
    }
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = activeDeliveries.find((d) => d.orderId === orderId);
      if (!order || !order.trackingStates) return;

      const updatedDeliveryDetails = {
        ...order.trackingStates,
        [statusKey]: true,
        deliveryPartnerId: user.uid,
        assignedAt: order.trackingStates['onMyWayToFarmer'] ? order.trackingStates['onMyWayToFarmer'] : new Date(),
        deliveryStatus: 'accepted',
      };

      let updatedStatus = order.status;
      if (statusKey === 'pickedUpOrder') {
        updatedStatus = 'Picked Up';
      } else if (statusKey === 'deliveredOrder') {
        updatedStatus = 'Delivered';
      }

      await updateDoc(orderRef, {
        'deliveryDetails': updatedDeliveryDetails,
        status: updatedStatus,
        ...(statusKey === 'pickedUpOrder' ? { pickedUpAt: new Date() } : {}),
        ...(statusKey === 'deliveredOrder' ? { deliveredAt: new Date() } : {}),
      });

      setActiveDeliveries((prev) =>
        prev.map((d) =>
          d.orderId === orderId
            ? {
                ...d,
                trackingStates: {
                  ...d.trackingStates,
                  [statusKey]: true,
                },
                status: updatedStatus,
              }
            : d
        )
      );
      console.log(`Tracking status ${statusKey} updated for order ${orderId}`);
    } catch (err: any) {
      console.error(`Error updating tracking status for order ${orderId}:`, err.code, err.message);
      setError('Failed to update tracking status. Please try again.');
    }
  };

  const handleViewDetails = (order: AvailableOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleExpandOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  useEffect(() => {
    if (!user) {
      setError('You need to be logged in to view this page');
      setLoading(false);
      return;
    }

    const bidItemsQuery = query(collection(db, 'bidItems'));

    const unsubscribeBidItems = onSnapshot(
      bidItemsQuery,
      async (snapshot) => {
        try {
          const deliveriesData: Delivery[] = [];
          for (const docSnap of snapshot.docs) {
            const bidItem = { id: docSnap.id, ...docSnap.data() } as any;

            const relevantDetail = bidItem.deliveryDetails?.find(
              (detail: { deliveryPartnerId: string; deliveredOrder: boolean }) =>
                detail.deliveryPartnerId === user.uid && detail.deliveredOrder === true
            );

            if (!relevantDetail) continue;

            let farmerAddress = 'No address provided';
            if (bidItem.ownerUserId) {
              try {
                const farmerDoc = await getDoc(doc(db, 'farmer', bidItem.ownerUserId));
                if (farmerDoc.exists()) {
                  const data = farmerDoc.data() as DocumentData;
                  farmerAddress = data.location || 'No address provided';
                }
              } catch (err: any) {
                console.error(`Error fetching farmer ${bidItem.ownerUserId}:`, err.code, err.message);
              }
            }

            let buyerAddress = 'No address provided';
            if (bidItem.acceptedBid?.buyerId) {
              try {
                const buyerDoc = await getDoc(doc(db, 'buyer', bidItem.acceptedBid.buyerId));
                if (buyerDoc.exists()) {
                  const data = buyerDoc.data() as DocumentData;
                  buyerAddress = data.address || 'No address provided';
                }
              } catch (err: any) {
                console.error(`Error fetching buyer ${bidItem.acceptedBid.buyerId}:`, err.code, err.message);
              }
            }

            deliveriesData.push({
              orderId: bidItem.orderId || bidItem.id,
              itemName: bidItem.itemName || 'Unknown Item',
              quantity: bidItem.quantity || 0,
              pickupPoint: farmerAddress,
              deliveryPoint: buyerAddress,
              amountEarned: relevantDetail.amount || bidItem.deliveryAmount || 0,
              paymentReceived: relevantDetail.paymentReceived || false,
              farmerRating: bidItem.farmerRatings?.deliveryPartnerRating != null ? bidItem.farmerRatings.deliveryPartnerRating : null,
              buyerRating: bidItem.ratings?.deliveryPartnerRating != null ? bidItem.ratings.deliveryPartnerRating : null,
            });
          }

          setDeliveries(deliveriesData);
        } catch (err: any) {
          console.error('Error processing bidItems:', err.code, err.message);
          setError('Failed to load completed deliveries. Please try again later.');
        }
      },
      (err: any) => {
        console.error('Error fetching bidItems:', err.code, err.message);
        setError('Failed to load completed deliveries. Please try again later.');
      }
    );

    const ordersQuery = query(collection(db, 'orders'));

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        try {
          const availableOrdersData: AvailableOrder[] = [];
          const activeDeliveriesData: ActiveDelivery[] = [];

          for (const docSnap of snapshot.docs) {
            const order = { id: docSnap.id, ...docSnap.data() } as Order;

            let farmerAddress = 'No address provided';
            let farmerDetails: UserDetails = { fullName: '', address: '' };
            const ownerUserIds = new Set<string>();
            if (order.items && Array.isArray(order.items)) {
              for (const item of order.items) {
                const itemDoc = await getDoc(doc(db, 'items', item.name));
                if (itemDoc.exists()) {
                  const itemData = itemDoc.data() as DocumentData;
                  if (itemData.ownerUserId) ownerUserIds.add(itemData.ownerUserId);
                }
              }
            }

            if (ownerUserIds.size > 0) {
              const farmerId = Array.from(ownerUserIds)[0];
              try {
                const farmerDoc = await getDoc(doc(db, 'farmer', farmerId));
                if (farmerDoc.exists()) {
                  const data = farmerDoc.data() as DocumentData;
                  farmerAddress = data.location || 'No address provided';
                  farmerDetails = {
                    fullName: data.fullName || 'Unknown Farmer',
                    address: farmerAddress,
                    coordinates: data.coordinates,
                  };
                }
              } catch (err: any) {
                console.error(`Error fetching farmer ${farmerId}:`, err.code, err.message);
              }
            }

            let buyerAddress = 'No address provided';
            let buyerDetails: UserDetails = { fullName: '', address: '' };
            if (order.buyerId) {
              try {
                const buyerDoc = await getDoc(doc(db, 'buyer', order.buyerId));
                if (buyerDoc.exists()) {
                  const data = buyerDoc.data() as DocumentData;
                  buyerAddress = data.address || order.deliveryAddress || 'No address provided';
                  buyerDetails = {
                    fullName: data.fullName || 'Unknown Buyer',
                    address: buyerAddress,
                    coordinates: data.coordinates,
                  };
                }
              } catch (err: any) {
                console.error(`Error fetching buyer ${order.buyerId}:`, err.code, err.message);
              }
            }

            let distance = calculateDistance(farmerAddress);
            if (farmerDetails.coordinates && buyerDetails.coordinates) {
              try {
                distance = haversineDistance(farmerDetails.coordinates, buyerDetails.coordinates);
              } catch (err) {
                console.error('Error calculating distance:', err);
              }
            }

            const deliveryAmount = distance * 10;

            const firstItem = order.items && order.items.length > 0 ? order.items[0] : { name: 'Unknown Item', quantity: 0 };

            // Check if the order is available
            if (
              (order.status === 'ready' && !order.deliveryDetails) || // Unassigned orders
              (order.deliveryDetails?.deliveryStatus === 'accepted' && 
               order.deliveryDetails?.deliveryPartnerId !== user.uid && 
               !order.deliveryDetails.deliveredOrder) // Accepted by another partner
            ) {
              availableOrdersData.push({
                orderId: order.id,
                itemName: firstItem.name,
                quantity: firstItem.quantity,
                pickupPoint: farmerAddress,
                deliveryPoint: buyerAddress,
                totalAmount: order.totalAmount || 0,
                items: order.items || [],
                distance,
                deliveryAmount,
                status: order.status === 'ready' ? 'ready' : 'accepted',
              });
            }

            // Check if the order is active for the current delivery partner
            if (
              order.deliveryDetails &&
              order.deliveryDetails.deliveryPartnerId === user.uid &&
              order.status !== 'Delivered'
            ) {
              const activeDelivery: ActiveDelivery = {
                orderId: order.id,
                itemName: firstItem.name,
                quantity: firstItem.quantity,
                pickupPoint: farmerAddress,
                deliveryPoint: buyerAddress,
                items: order.items || [],
                distance,
                deliveryAmount,
                status: order.status,
                farmer: farmerDetails,
                buyer: buyerDetails,
                trackingStates: {
                  onMyWayToFarmer: !!order.deliveryDetails.onMyWayToFarmer,
                  reachedFarmer: !!order.deliveryDetails.reachedFarmer,
                  pickedUpOrder: !!order.deliveryDetails.pickedUpOrder,
                  onMyWayToBuyer: !!order.deliveryDetails.onMyWayToBuyer,
                  reachedBuyer: !!order.deliveryDetails.reachedBuyer,
                  deliveredOrder: !!order.deliveryDetails.deliveredOrder,
                },
                priorityScore: 0,
              };
              activeDelivery.priorityScore = calculatePriorityScore(activeDelivery);
              activeDeliveriesData.push(activeDelivery);
            }
          }

          activeDeliveriesData.sort((a, b) => b.priorityScore - a.priorityScore);

          setAvailableOrders(availableOrdersData);
          setActiveDeliveries(activeDeliveriesData);
          setLoading(false);
        } catch (err: any) {
          console.error('Error processing orders:', err.code, err.message);
          setError('Failed to load orders. Please try again later.');
        }
      },
      (err: any) => {
        console.error('Error fetching orders:', err.code, err.message);
        setError('Failed to load orders. Please try again later.');
      }
    );

    return () => {
      unsubscribeBidItems();
      unsubscribeOrders();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-[#2CD14D] animate-spin" />
          <p className="mt-2 text-sm text-gray-600 font-medium">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">{error}</h2>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#2CD14D] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#24B042] transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
   const getMenuItems = () => {
      const items = [
        {
          label: "Dashboard",
          onClick: () => navigate("/delivery/homePage"),
          icon: <FaHome className="text-[#2CD14D] text-lg" />,
        },
        {
          label: "My Deliveries",
          onClick: () => navigate("/myDeliveries"),
          icon: <FaTruck className="text-[#2CD14D] text-lg" />,
        },
        {
          label: "Route Map",
          onClick: () => navigate("/delivery/MapPage"),
          icon: <FaMapMarkedAlt className="text-[#2CD14D] text-lg" />,
        },
        {
          label: "Notifications",
          onClick: () => navigate("/delivery/notification"),
          icon: <FaClipboardList className="text-[#2CD14D] text-lg" />,
        },
        {
          label: "Settings",
          onClick: () => navigate("/delivery/settings"),
          icon: <IoSettings className="text-[#2CD14D] text-lg" />,
        },
      ];
       return items;
  };
  

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Sidebar menuItems={getMenuItems()} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-800 pb-4">My Deliveries</h1>
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 text-sm font-semibold text-center rounded-lg transition-all duration-200 ${
              activeTab === 'active'
                ? 'bg-[#2CD14D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 text-sm font-semibold text-center rounded-lg transition-all duration-200 ${
              activeTab === 'available'
                ? 'bg-[#2CD14D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Available ({availableOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 text-sm font-semibold text-center rounded-lg transition-all duration-200 ${
              activeTab === 'completed'
                ? 'bg-[#2CD14D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Completed ({deliveries.length})
          </button>
        </div>

        <div>
          {activeTab === 'active' && (
            <div>
              {activeDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-sm font-medium">No active deliveries at the moment.</p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="mt-4 bg-[#2CD14D] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#24B042] transition-all duration-200"
                  >
                    Check Available Orders
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDeliveries.map((delivery) => (
                    <ActiveDeliveryCard
                      key={delivery.orderId}
                      delivery={delivery}
                      onUpdateTrackingStatus={handleUpdateTrackingStatus}
                      onExpand={handleExpandOrder}
                      isExpanded={expandedOrderId === delivery.orderId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'available' && (
            <div>
              {availableOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-sm font-medium">No available orders to deliver at the moment.</p>
                  <button
                    onClick={() => setActiveTab('active')}
                    className="mt-4 bg-[#2CD14D] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#24B042] transition-all duration-200"
                  >
                    Check Active Deliveries
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableOrders.map((order) => (
                    <AvailableOrderCard
                      key={order.orderId}
                      order={order}
                      onAccept={handleAcceptOrder}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              {deliveries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-sm font-medium">No completed deliveries found.</p>
                  <button
                    onClick={() => setActiveTab('active')}
                    className="mt-4 bg-[#2CD14D] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#24B042] transition-all duration-200"
                  >
                    Check Active Deliveries
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((delivery) => (
                    <DeliveryCard key={delivery.orderId} delivery={delivery} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Details</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center">
                <FaBox className="mr-2 text-[#2CD14D]" />
                <p><span className="font-medium">Order ID:</span> {selectedOrder.orderId}</p>
              </div>
              <div className="flex items-center">
                <FaTruck className="mr-2 text-[#2CD14D]" />
                <p><span className="font-medium">Distance:</span> {selectedOrder.distance} km</p>
              </div>
              <div className="flex items-start">
                <FaMapMarkerAlt className="mr-2 text-[#2CD14D] mt-1" />
                <p><span className="font-medium">Pickup Point (Farmer):</span> {selectedOrder.pickupPoint}</p>
              </div>
              <div className="flex items-start">
                <FaMapMarkerAlt className="mr-2 text-[#2CD14D] mt-1" />
                <p><span className="font-medium">Delivery Point (Buyer):</span> {selectedOrder.deliveryPoint}</p>
              </div>
              <div>
                <p className="flex items-center">
                  <FaBox className="mr-2 text-[#2CD14D]" />
                  <span className="font-medium">Order Items:</span>
                </p>
                <ul className="list-disc pl-8 mt-1 text-gray-600">
                  {selectedOrder.items.map((item, index) => (
                    <li key={index}>
                      {item.quantity}x {item.name} - ₹{item.price}
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                <span className="font-medium">Delivery Amount:</span> ₹{selectedOrder.deliveryAmount}
              </p>
              <div className="relative bg-gray-100 h-48 rounded-xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2CD14D] to-[#24B042] opacity-10" />
                <p className="text-gray-500 font-medium">Map View (Placeholder)</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                className="flex-1 bg-[#2CD14D] text-white px-4 py-2 rounded-full font-medium hover:bg-[#24B042] flex items-center justify-center transition-all duration-200"
              >
                <FaPhone className="mr-2" />
                Call Farmer
              </button>
              <button
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-600 flex items-center justify-center transition-all duration-200"
              >
                <FaMap className="mr-2" />
                Navigate
              </button>
            </div>
            <button
              onClick={closeModal}
              className="mt-3 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-full font-medium hover:bg-gray-300 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries;