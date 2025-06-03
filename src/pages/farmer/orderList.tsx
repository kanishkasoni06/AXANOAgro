import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/authContext';
import { FaClock, FaCheckCircle, FaMapMarkerAlt, FaUser, FaInfoCircle, FaTimes, FaDollarSign } from 'react-icons/fa';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface DeliveryPartner {
  name: string;
  amount?: number;
  pickupTime?: string;
}

interface DeliveryBid {
  deliveryPartnerId: string;
  amount: number;
  assignedAt: any;
  partnerName?: string;
}

interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalBill: number;
  paymentMethod: 'PAID' | 'CASH';
  status: 'active' | 'accepted' | 'preparing' | 'ready' | 'pickedUp' | 'Delivered';
  placedTime: string;
  acceptedTime?: string;
  readyTime?: string;
  pickedUpTime?: string;
  deliveredTime?: string;
  deliveryPartner?: DeliveryPartner;
  deliveryAddress?: string;
  prepTime?: number;
  deliveryDetails?: {
    deliveryPartnerId: string;
    amount?: number;
    acceptedForDelivery?: boolean;
    pickedUpOrder?: boolean;
    onMyWayToBuyer?: boolean;
    reachedBuyer?: boolean;
    deliveredOrder?: boolean;
    assignedAt?: any;
  };
  deliveryBids?: DeliveryBid[];
  placedDate?: Date;
  acceptedDate?: Date;
  readyDate?: Date;
  pickedUpDate?: Date;
  deliveredDate?: Date;
}

interface User {
  fullName: string;
}

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'preparing' | 'ready' | 'pickedUp'>('preparing');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [isBidsModalOpen, setIsBidsModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editPrepTime, setEditPrepTime] = useState<{ [orderId: string]: boolean }>({});
  const [prepTimeInputs, setPrepTimeInputs] = useState<{ [orderId: string]: number }>({});
  const [timers, setTimers] = useState<{ [orderId: string]: number }>({});
  const [showAddress, setShowAddress] = useState<{ [orderId: string]: boolean }>({});

  const { user } = useAuth();

  // Modal focus management
  const detailsModalRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const trackingModalRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const deliveryModalRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const bidsModalRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const focusModal = useCallback((modalRef: React.RefObject<HTMLDivElement>) => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  // Helper function to safely parse dates
  const parseDate = (value: any): Date | undefined => {
    try {
      if (value instanceof Timestamp) {
        return value.toDate();
      } else if (typeof value === 'string') {
        const parsedDate = new Date(value);
        return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
      } else if (value instanceof Date) {
        return value;
      } else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
        return new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
      } else {
        console.warn('Unexpected date format:', value);
        return undefined;
      }
    } catch (err) {
      console.error('Error parsing date:', err, value);
      return undefined;
    }
  };

  const handleUpdatePrepTime = async (orderId: string) => {
    const prepTime = prepTimeInputs[orderId];
    if (!prepTime || prepTime <= 0) {
      alert('Please enter a valid preparation time in minutes.');
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'preparing',
        prepTime,
      });
      setTimers((prev) => ({ ...prev, [orderId]: prepTime * 60 }));
      setEditPrepTime((prev) => ({ ...prev, [orderId]: false }));
    } catch (err) {
      console.error('Error updating preparation time:', err);
      setError('Failed to update preparation time. Please try again.');
    }
  };

  const handleReadyOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'ready',
        readyAt: new Date(),
        prepTime: 0,
      });
      setTimers((prev) => ({ ...prev, [orderId]: 0 }));
    } catch (err) {
      console.error('Error marking order as ready:', err);
      setError('Failed to mark order as ready. Please try again.');
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsTrackingModalOpen(true);
  };

  const handleViewDeliveryPartner = (order: Order) => {
    setSelectedOrder(order);
    setIsDeliveryModalOpen(true);
  };

  const handleViewBids = (order: Order) => {
    setSelectedOrder(order);
    setIsBidsModalOpen(true);
  };

  const handleAcceptBid = async (orderId: string, bid: DeliveryBid) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        deliveryDetails: {
          deliveryPartnerId: bid.deliveryPartnerId,
          amount: bid.amount,
          acceptedForDelivery: true,
          pickedUpOrder: false,
          onMyWayToBuyer: false,
          onMyWayToFarmer: true,
          reachedBuyer: false,
          reachedFarmer: false,
          deliveredOrder: false,
          assignedAt: Timestamp.fromDate(new Date()),
          lockedAt: Timestamp.fromDate(new Date()),
        },
      });
      setIsBidsModalOpen(false);
      alert('Bid accepted successfully!');
    } catch (err: any) {
      console.error('Error accepting bid:', err.message);
      setError('Failed to accept bid. Please try again.');
    }
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
  };

  const closeTrackingModal = () => {
    setIsTrackingModalOpen(false);
    setSelectedOrder(null);
  };

  const closeDeliveryModal = () => {
    setIsDeliveryModalOpen(false);
    setSelectedOrder(null);
  };

  const closeBidsModal = () => {
    setIsBidsModalOpen(false);
    setSelectedOrder(null);
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', '');
  };

  const getStatusPriority = (status: Order['status']): number => {
    const priorities: { [key in Order['status']]: number } = {
      Delivered: 5,
      pickedUp: 4,
      ready: 3,
      preparing: 2,
      accepted: 1,
      active: 0,
    };
    return priorities[status];
  };

  const getRelevantTimestamp = (order: Order): Date => {
    if (order.status === 'Delivered' && order.deliveredDate) return order.deliveredDate;
    if (order.status === 'pickedUp' && order.pickedUpDate) return order.pickedUpDate;
    if (order.status === 'ready' && order.readyDate) return order.readyDate;
    if (order.status === 'preparing' && order.acceptedDate) return order.acceptedDate;
    return order.placedDate || new Date();
  };

  useEffect(() => {
    if (!user) {
      setError('Please log in to view your orders.');
      setLoading(false);
      return;
    }

    if (user.role !== 'farmer') {
      setError('Access denied: This page is for farmers only.');
      setLoading(false);
      return;
    }

    const farmerUid = user.uid;
    setLoading(true);
    setError(null);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', '!=', 'active')
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const filteredOrders = await Promise.all(
          ordersData.map(async (order) => {
            if (!('items' in order) || !Array.isArray(order.items)) {
              return null;
            }
            const itemIds = order.items.map((item: any) => item.id);
            let isFarmerOrder = false;

            for (const itemId of itemIds) {
              try {
                const itemDoc = await getDoc(doc(db, 'items', itemId));
                if (itemDoc.exists() && itemDoc.data().ownerUserId === farmerUid) {
                  isFarmerOrder = true;
                  break;
                }
              } catch (err) {
                console.error(`Error fetching item ${itemId}:`, err);
              }
            }

            if (!isFarmerOrder) return null;

            return order;
          })
        );

        const validOrders = filteredOrders.filter((order): order is any => order !== null);

        const buyerIds = validOrders
          .filter((order) => order.buyerId)
          .map((order) => order.buyerId);

        const buyerNamesMap: { [key: string]: string } = {};
        const buyerPromises = buyerIds.map(async (buyerId: string) => {
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

        const deliveryPartnerPromises = validOrders
          .filter((order) => order.deliveryBids && Array.isArray(order.deliveryBids))
          .flatMap((order) =>
            order.deliveryBids.map(async (bid: DeliveryBid) => {
              try {
                const dpDoc = await getDoc(doc(db, 'deliveryPartner', bid.deliveryPartnerId));
                if (dpDoc.exists()) {
                  const dpData = dpDoc.data();
                  bid.partnerName = dpData.fullName || bid.deliveryPartnerId;
                } else {
                  bid.partnerName = bid.deliveryPartnerId;
                }
              } catch (err) {
                console.error(`Error fetching delivery partner ${bid.deliveryPartnerId}:`, err);
                bid.partnerName = bid.deliveryPartnerId;
              }
            })
          );
        await Promise.all(deliveryPartnerPromises);

        const ordersRaw = await Promise.all(
          validOrders.map(async (order) => {
            let status: Order['status'] = order.status as Order['status'];
            let pickedUpTime: string | undefined;
            let deliveredTime: string | undefined;
            let pickedUpDate: Date | undefined;
            let deliveredDate: Date | undefined;

            const delivery = order.deliveryDetails;
            if (delivery) {
              const assignedAtDate = parseDate(delivery.assignedAt);
              if (status === 'ready' && delivery.pickedUpOrder) {
                status = 'pickedUp';
                pickedUpDate = parseDate(order.pickedUpAt) || assignedAtDate;
                pickedUpTime = pickedUpDate ? formatDateTime(pickedUpDate) : undefined;
              } else if (status === 'pickedUp' && delivery.onMyWayToBuyer && !delivery.reachedBuyer) {
                status = 'pickedUp';
              } else if ((status === 'pickedUp' || status === 'ready') && delivery.deliveredOrder) {
                status = 'Delivered';
                deliveredDate = assignedAtDate;
                deliveredTime = assignedAtDate ? formatDateTime(assignedAtDate) : undefined;
                if (delivery.pickedUpOrder && !pickedUpTime) {
                  pickedUpDate = assignedAtDate ? new Date(assignedAtDate.getTime() - 30 * 60 * 1000) : undefined;
                  pickedUpTime = pickedUpDate ? formatDateTime(pickedUpDate) : undefined;
                }
              }
            }

            let deliveryPartner: DeliveryPartner | undefined = undefined;
            if (delivery && delivery.deliveryPartnerId) {
              try {
                const deliveryPartnerDoc = await getDoc(doc(db, 'deliveryPartner', delivery.deliveryPartnerId));
                const deliveryPartnerData = deliveryPartnerDoc.exists() ? deliveryPartnerDoc.data() : {};
                deliveryPartner = {
                  name: deliveryPartnerData.fullName || delivery.deliveryPartnerId,
                  amount: delivery.amount || 0,
                  pickupTime: delivery.pickedUpOrder && pickedUpTime ? pickedUpTime : undefined,
                };
              } catch (err) {
                console.error(`Error fetching delivery partner for order ${order.id}:`, err);
              }
            }

            return {
              id: order.id,
              customerName: buyerNamesMap[order.buyerId] || order.buyerId,
              items: order.items.map((item: any) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                imageUrl: item.imageUrl,
              })),
              totalBill: order.totalAmount,
              paymentMethod: 'PAID' as 'PAID' | 'CASH',
              status,
              placedDate: parseDate(order.createdAt) || new Date(),
              placedTime: formatDateTime(parseDate(order.createdAt) || new Date()),
              acceptedDate: parseDate(order.acceptedAt),
              acceptedTime: parseDate(order.acceptedAt) ? formatDateTime(parseDate(order.acceptedAt)!) : undefined,
              readyDate: parseDate(order.readyAt),
              readyTime: parseDate(order.readyAt) ? formatDateTime(parseDate(order.readyAt)!) : undefined,
              pickedUpDate,
              pickedUpTime,
              deliveredDate,
              deliveredTime,
              deliveryPartner,
              deliveryAddress: order.deliveryAddress,
              prepTime: order.prepTime,
              deliveryDetails: delivery,
              deliveryBids: order.deliveryBids || [],
            };
          })
        );

        const orders: Order[] = ordersRaw.filter((order) => order !== null) as Order[];

        orders.sort((a, b) => {
          const aPriority = getStatusPriority(a.status);
          const bPriority = getStatusPriority(b.status);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          const aTime = getRelevantTimestamp(a).getTime();
          const bTime = getRelevantTimestamp(b).getTime();
          return aTime - bTime;
        });

        setOrders(orders);
        setLoading(false);

        const initialTimers: { [orderId: string]: number } = {};
        orders.forEach((order) => {
          if (order.status === 'preparing' && order.prepTime && order.prepTime > 0) {
            const elapsedSeconds = order.acceptedDate
              ? Math.floor((new Date().getTime() - order.acceptedDate.getTime()) / 1000)
              : 0;
            const remainingSeconds = Math.max((order.prepTime * 60) - elapsedSeconds, 0);
            initialTimers[order.id] = remainingSeconds;
          }
        });
        setTimers(initialTimers);
      },
      (err) => {
        setError('Error fetching orders. Please try again later.');
        setLoading(false);
        console.error('Orders fetch error:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        const updatedTimers = { ...prevTimers };
        const updates: Promise<void>[] = [];

        Object.keys(updatedTimers).forEach((orderId) => {
          if (updatedTimers[orderId] > 0) {
            updatedTimers[orderId] -= 1;
            if (updatedTimers[orderId] <= 0) {
              const order = orders.find((o) => o.id === orderId);
              if (order && order.status === 'preparing') {
                updates.push(
                  updateDoc(doc(db, 'orders', orderId), {
                    status: 'ready',
                    readyAt: new Date(),
                    prepTime: 0,
                  })
                );
              }
            }
          }
        });

        Promise.all(updates).catch((err) => {
          console.error('Error auto-updating order to ready:', err);
          setError('Failed to auto-update order status.');
        });

        return updatedTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  useEffect(() => {
    if (isDetailsModalOpen) focusModal(detailsModalRef);
    if (isTrackingModalOpen) focusModal(trackingModalRef);
    if (isDeliveryModalOpen) focusModal(deliveryModalRef);
    if (isBidsModalOpen) focusModal(bidsModalRef);
  }, [isDetailsModalOpen, isTrackingModalOpen, isDeliveryModalOpen, isBidsModalOpen, focusModal]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500 text-lg">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600 text-lg">
        Loading...
      </div>
    );
  }

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'preparing') {
      return order.status==='accepted' || order.status === 'preparing' && order.acceptedTime;
    }
    if (activeTab === 'ready') {
      return order.status === 'ready';
    }
    if (activeTab === 'pickedUp') {
      return ['pickedUp', 'Delivered'].includes(order.status);
    }
    return false;
  });

  const getProgressPercentage = (status: Order['status']): number => {
    switch (status) {
      case 'active':
        return 0;
      case 'accepted':
        return 20;
      case 'preparing':
        return 40;
      case 'ready':
        return 60;
      case 'pickedUp':
        return 80;
      case 'Delivered':
        return 100;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: Order['status']): string => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'pickedUp':
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {(['preparing', 'ready', 'pickedUp'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                activeTab === tab
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
               {tab === 'preparing'
          ? orders.filter((o) => ['accepted', 'preparing'].includes(o.status)).length
          : tab === 'pickedUp'
          ? orders.filter((o) => ['pickedUp', 'Delivered'].includes(o.status)).length
          : orders.filter((o) => o.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredOrders.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No orders found for this status.
            </div>
          )}
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                    {order.customerName}'s Order
                  </h2>
                  <p className="text-sm text-gray-500">ID: {order.id}</p>
                </div>
                <div className="text-left sm:text-right">
                  {order.items.map((item) => (
                    <div key={item.id} className="text-sm text-gray-600">
                      <span className="text-red-500 font-medium">{item.quantity}x </span>
                      {item.name} <span className="font-semibold">₹{item.price}</span>
                    </div>
                  ))}
                  <div className="mt-2 font-semibold text-gray-800">
                    Total: ₹{order.totalBill}{' '}
                    <span className={order.paymentMethod === 'PAID' ? 'text-green-600 text-xs' : 'text-gray-600 text-xs'}>
                      ({order.paymentMethod})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                  <span>Order Progress</span>
                  <span className="text-green-600 font-medium">{getProgressPercentage(order.status)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(order.status)}%` }}
                  ></div>
                </div>
                <div className="flex flex-wrap justify-between text-xs text-gray-500 mt-2 gap-2">
                  <span>Placed: {order.placedTime}</span>
                  {order.acceptedTime && <span>Accepted: {order.acceptedTime}</span>}
                  {order.readyTime && <span>Ready: {order.readyTime}</span>}
                  {order.pickedUpTime && <span>Picked Up: {order.pickedUpTime}</span>}
                  {order.deliveredTime && <span>Delivered: {order.deliveredTime}</span>}
                </div>
              </div>

              {activeTab === 'preparing' && (
                <div className="mb-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Time Remaining: {timers[order.id] !== undefined ? formatTimeRemaining(timers[order.id]) : 'N/A'}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                    {order.status === 'accepted'  && (
                    <>
                      {!editPrepTime[order.id] ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          
                          <button
                            onClick={() => setEditPrepTime((prev) => ({ ...prev, [order.id]: true }))}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-yellow-600 transition-colors text-sm min-w-[120px]"
                          >
                            Update Prep Time
                          </button>
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaClock className="mr-2" />
                            Track Order
                          </button>
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaInfoCircle className="mr-2" />
                            View Details
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="number"
                            placeholder="Prep time (mins)"
                            className="p-2 border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            value={prepTimeInputs[order.id] || order.prepTime || ''}
                            onChange={(e) =>
                              setPrepTimeInputs((prev) => ({
                                ...prev,
                                [order.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                            aria-label="Preparation time in minutes"
                          />
                          <button
                            onClick={() => handleUpdatePrepTime(order.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm min-w-[80px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditPrepTime((prev) => ({ ...prev, [order.id]: false }))}
                            className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-500 transition-colors text-sm min-w-[80px]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {order.status === 'preparing'  && (
                    <>
                      {!editPrepTime[order.id] ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleReadyOrder(order.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm min-w-[120px]"
                          >
                            Mark as Ready
                          </button>
                          
                          <button
                            onClick={() => setEditPrepTime((prev) => ({ ...prev, [order.id]: true }))}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-yellow-600 transition-colors text-sm min-w-[120px]"
                          >
                            Update Prep Time
                          </button>
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaClock className="mr-2" />
                            Track Order
                          </button>
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaInfoCircle className="mr-2" />
                            View Details
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="number"
                            placeholder="Prep time (mins)"
                            className="p-2 border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            value={prepTimeInputs[order.id] || order.prepTime || ''}
                            onChange={(e) =>
                              setPrepTimeInputs((prev) => ({
                                ...prev,
                                [order.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                            aria-label="Preparation time in minutes"
                          />
                          <button
                            onClick={() => handleUpdatePrepTime(order.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm min-w-[80px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditPrepTime((prev) => ({ ...prev, [order.id]: false }))}
                            className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-500 transition-colors text-sm min-w-[80px]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {order.status === 'ready' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {order.deliveryDetails?.deliveryPartnerId ? (
                        <>
                          <button
                            onClick={() => handleViewDeliveryPartner(order)}
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-purple-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaUser className="mr-2" />
                            View Delivery Partner
                          </button>
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaClock className="mr-2" />
                            Track Order
                          </button>
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaInfoCircle className="mr-2" />
                            View Details
                          </button>
                        </>
                      ) : (
                        <>
                          {order.deliveryBids && order.deliveryBids.length > 0 ? (
                            <button
                              onClick={() => handleViewBids(order)}
                              className="bg-teal-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-teal-600 transition-colors flex items-center text-sm min-w-[120px]"
                            >
                              <FaDollarSign className="mr-2" />
                              View Bids ({order.deliveryBids.length})
                            </button>
                          ) : (
                            <div className="text-sm text-yellow-600 self-start sm:self-center">
                              Finding a Delivery Partner...
                            </div>
                          )}
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaClock className="mr-2" />
                            Track Order
                          </button>
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm min-w-[120px]"
                          >
                            <FaInfoCircle className="mr-2" />
                            View Details
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {['pickedUp', 'Delivered'].includes(order.status) && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="text-sm text-gray-600 self-start sm:self-center">
                        {order.status === 'pickedUp' && 'Picked Up by Delivery Partner'}
                        {order.status === 'Delivered' && 'Delivered'}
                      </div>
                      <button
                        onClick={() => handleTrackOrder(order)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm min-w-[120px]"
                      >
                        <FaClock className="mr-2" />
                        Track Order
                      </button>
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm min-w-[120px]"
                      >
                        <FaInfoCircle className="mr-2" />
                        View Details
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAddress((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}
                    className="text-gray-600 flex items-center text-sm hover:text-gray-800"
                    aria-expanded={showAddress[order.id]}
                    aria-controls={`address-${order.id}`}
                  >
                    <FaMapMarkerAlt className="w-4 h-4 mr-1" />
                    {showAddress[order.id] ? 'Hide Address' : 'Show Address'}
                  </button>
                  {showAddress[order.id] && order.deliveryAddress && (
                    <div id={`address-${order.id}`} className="text-sm text-gray-600">
                      <div className="font-semibold">Delivery Address:</div>
                      <div>{order.deliveryAddress}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Details Modal */}
        {isDetailsModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              ref={detailsModalRef}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto focus:outline-none"
              tabIndex={-1}
              role="dialog"
              aria-labelledby="details-modal-title"
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeDetailsModal();
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 id="details-modal-title" className="text-xl font-semibold text-gray-800">
                  Order Details
                </h2>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  aria-label="Close details modal"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 text-gray-600">
                <p>
                  <strong className="font-semibold">Order ID:</strong> {selectedOrder.id}
                </p>
                <p>
                  <strong className="font-semibold">Customer Name:</strong> {selectedOrder.customerName}
                </p>
                <p>
                  <strong className="font-semibold">Items:</strong>
                </p>
                <ul className="list-disc pl-5">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}x {item.name} - ₹{item.price}
                    </li>
                  ))}
                </ul>
                <p>
                  <strong className="font-semibold">Total Bill:</strong> ₹{selectedOrder.totalBill} ({selectedOrder.paymentMethod})
                </p>
                <p>
                  <strong className="font-semibold">Delivery Address:</strong> {selectedOrder.deliveryAddress || 'N/A'}
                </p>
                <p>
                  <strong className="font-semibold">Placed At:</strong> {selectedOrder.placedTime}
                </p>
                {selectedOrder.acceptedTime && (
                  <p>
                    <strong className="font-semibold">Accepted At:</strong> {selectedOrder.acceptedTime}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetailsModal}
                className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Tracking Modal */}
        {isTrackingModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              ref={trackingModalRef}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto focus:outline-none"
              tabIndex={-1}
              role="dialog"
              aria-labelledby="tracking-modal-title"
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeTrackingModal();
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 id="tracking-modal-title" className="text-xl font-semibold text-gray-800">
                  Track Order - ID: {selectedOrder.id}
                </h2>
                <button
                  onClick={closeTrackingModal}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  aria-label="Close tracking modal"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6">
                {[
                  { status: 'Placed', time: selectedOrder.placedTime, active: true },
                  { status: 'Accepted', time: selectedOrder.acceptedTime, active: !!selectedOrder.acceptedTime },
                  { status: 'Ready', time: selectedOrder.readyTime, active: !!selectedOrder.readyTime },
                  {
                    status: 'Picked Up',
                    time: selectedOrder.pickedUpTime,
                    active: !!selectedOrder.pickedUpTime || selectedOrder.deliveryDetails?.pickedUpOrder,
                  },
                  {
                    status: 'Delivered',
                    time: selectedOrder.deliveredTime,
                    active: !!selectedOrder.deliveredTime || selectedOrder.deliveryDetails?.deliveredOrder,
                  },
                ].map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex flex-col items-center">
                      <FaCheckCircle
                        className={`w-6 h-6 ${step.active ? 'text-green-600' : 'text-gray-300'}`}
                      />
                      {index < 4 && (
                        <div
                          className={`w-0.5 h-12 mt-1 ${step.active ? 'bg-green-600' : 'bg-gray-300'}`}
                        ></div>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className={`font-semibold ${step.active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.status}
                      </p>
                      {step.active && step.time && (
                        <p className="text-sm text-gray-600">{step.time}</p>
                      )}
                      {!step.active && (
                        <p className="text-sm text-gray-400">Pending</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={closeTrackingModal}
                className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Delivery Partner Modal */}
        {isDeliveryModalOpen && selectedOrder && selectedOrder.deliveryPartner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              ref={deliveryModalRef}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto focus:outline-none"
              tabIndex={-1}
              role="dialog"
              aria-labelledby="delivery-modal-title"
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeDeliveryModal();
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 id="delivery-modal-title" className="text-xl font-semibold text-gray-800">
                  Delivery Partner Details
                </h2>
                <button
                  onClick={closeDeliveryModal}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  aria-label="Close delivery modal"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 text-gray-600">
                <p>
                  <strong className="font-semibold">Name:</strong> {selectedOrder.deliveryPartner.name}
                </p>
                <p>
                  <strong className="font-semibold">Amount:</strong> ₹{selectedOrder.deliveryPartner.amount || 'N/A'}
                </p>
                <p>
                  <strong className="font-semibold">Pickup Time:</strong> {selectedOrder.deliveryPartner.pickupTime || 'Not yet picked up'}
                </p>
              </div>
              <button
                onClick={closeDeliveryModal}
                className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Bids Modal */}
        {isBidsModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              ref={bidsModalRef}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto focus:outline-none"
              tabIndex={0}
              role="dialog"
              aria-labelledby="bids-modal-title"
              onKeyUp={(e) => {
                if (e.key === 'Escape') closeBidsModal();
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 id="bids-modal-title" className="text-xl font-semibold text-gray-800">
                  Delivery Bids for Order ID: {selectedOrder.id}
                </h2>
                <button
                  onClick={closeBidsModal}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  aria-label="Close bids modal"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {selectedOrder.deliveryBids && selectedOrder?.deliveryBids.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedOrder.deliveryBids.map((bid) => (
                      <li
                        key={bid.deliveryPartnerId}
                        className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{bid.partnerName || 'Unknown Partner'}</p>
                          <p className="text-sm text-gray-600">Bid Amount: ₹{bid.amount}</p>
                          <p className="text-sm text-gray-500">
                            Bid Placed: {parseDate(bid.assignedAt)?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAcceptBid(selectedOrder.id, bid)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          disabled={!!selectedOrder.deliveryDetails?.deliveryPartnerId}
                        >
                          Accept
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-600">No bids available yet.</p>
                )}
                <button
                  onClick={closeBidsModal}
                  className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersList;