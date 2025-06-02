import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/authContext';
import { FaSearch, FaClock, FaCheckCircle, FaMapMarkerAlt, FaUser, FaInfoCircle, FaHandshake } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import OrdersList from './orderList';
import { LayoutDashboard, Leaf, ListCheckIcon, LucideSprout, Settings } from 'lucide-react';
import Sidebar from '../../components/ui/sidebar';
import { useTranslation } from 'react-i18next';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface DeliveryPartner {
  name: string;
  amount?: number;
  pickupTime?: string;
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
    lockedAt?: any;
  };
  placedDate?: Date;
  acceptedDate?: Date;
  readyDate?: Date;
  pickedUpDate?: Date;
  deliveredDate?: Date;
}

interface User {
  fullName: string;
}

interface BidItem {
  id: string;
  itemName: string;
  quantity: number;
  basePrice: number;
  acceptedBid?: {
    buyerId: string;
    bidAmount: number;
    deliveryAmount?: number;
    acceptedAt?: any;
  };
  deliveryDetails?: any[];
  status: string;
  ownerUserId: string;
  createdAt: any;
  deliveryAddress?: string;
}

const Orders: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'preparing' | 'ready' | 'pickedUp'>('preparing');
  const [sourceTab, setSourceTab] = useState<'bidOrders' | 'orders'>('bidOrders');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editPrepTime, setEditPrepTime] = useState<{ [orderId: string]: boolean }>({});
  const [prepTimeInputs, setPrepTimeInputs] = useState<{ [orderId: string]: number }>({});
  const [timers, setTimers] = useState<{ [orderId: string]: number }>({});
  const [showAddress, setShowAddress] = useState<{ [orderId: string]: boolean }>({});
  const { user } = useAuth();

  const handleUpdatePrepTime = async (orderId: string) => {
    const prepTime = prepTimeInputs[orderId];
    if (!prepTime || prepTime <= 0) {
      alert(t('invalidPrepTime'));
      return;
    }

    try {
      await updateDoc(doc(db, 'bidItems', orderId), {
        prepTime,
      });
      setTimers((prev) => ({ ...prev, [orderId]: prepTime * 60 }));
      setEditPrepTime((prev) => ({ ...prev, [orderId]: false }));
    } catch (err) {
      console.error('Error updating preparation time:', err);
      setError(t('failedToUpdatePrepTime'));
    }
  };

  const handleReadyOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'bidItems', orderId), {
        status: 'ready',
        readyAt: new Date(),
        prepTime: 0,
      });
      setTimers((prev) => ({ ...prev, [orderId]: 0 }));
    } catch (err) {
      console.error('Error marking order as ready:', err);
      setError(t('failedToMarkReady'));
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
    const priorities: { [key: string]: number } = {
      [t('delivered')]: 5,
      [t('pickedUp')]: 4,
      [t('ready')]: 3,
      [t('preparing')]: 2,
      [t('accepted')]: 1,
      [t('active')]: 0,
    };
    return priorities[status] || 0;
  };

  const getRelevantTimestamp = (order: Order): Date => {
    if (order.status === t('delivered') && order.deliveredDate) return order.deliveredDate;
    if (order.status === t('pickedUp') && order.pickedUpDate) return order.pickedUpDate;
    if (order.status === t('ready') && order.readyDate) return order.readyDate;
    if (order.status === t('preparing') && order.acceptedDate) return order.acceptedDate;
    return order.placedDate || new Date();
  };

  useEffect(() => {
    if (!user) {
      setError(t('pleaseLogin'));
      setLoading(false);
      return;
    }

    if (user.role !== 'farmer') {
      setError(t('accessDenied'));
      setLoading(false);
      return;
    }

    const farmerUserId = user.uid;
    setLoading(true);
    setError(null);

    const bidItemsQuery = query(
      collection(db, 'bidItems'),
      where('ownerUserId', '==', farmerUserId),
      where('status', '!=', t('active'))
    );

    const unsubscribe = onSnapshot(
      bidItemsQuery,
      async (snapshot) => {
        const bidItemsData: BidItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as BidItem));

        const buyerIds = bidItemsData
          .filter((item) => item.acceptedBid && item.acceptedBid.buyerId)
          .map((item) => item.acceptedBid!.buyerId);

        // Fetch buyer names
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

        const ordersRaw = await Promise.all(
          bidItemsData.map(async (bidItem) => {
            if (!bidItem.acceptedBid) return null;

            let status: Order['status'] = bidItem.status as Order['status'];
            let pickedUpTime: string | undefined;
            let deliveredTime: string | undefined;
            let pickedUpDate: Date | undefined;
            let deliveredDate: Date | undefined;

            const delivery = bidItem.deliveryDetails && bidItem.deliveryDetails[0];
            if (delivery) {
              const lockedAtDate = delivery.lockedAt ? delivery.lockedAt.toDate() : undefined;
              if (status === t('ready') && delivery.pickedUpOrder) {
                status = t('pickedUp') as Order['status'];
                pickedUpDate = lockedAtDate;
                pickedUpTime = lockedAtDate ? formatDateTime(lockedAtDate) : undefined;
              } else if (status === t('pickedUp') && delivery.onMyWayToBuyer && !delivery.reachedBuyer) {
                status = t('pickedUp') as Order['status'];
              } else if ((status === t('pickedUp') || status === t('ready')) && delivery.deliveredOrder) {
                status = t('delivered') as Order['status'];
                deliveredDate = lockedAtDate;
                deliveredTime = lockedAtDate ? formatDateTime(lockedAtDate) : undefined;
                if (delivery.pickedUpOrder && !pickedUpTime) {
                  pickedUpDate = lockedAtDate ? new Date(lockedAtDate.getTime() - 30 * 60 * 1000) : undefined;
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
                console.error(`Error fetching delivery partner for bidItem ${bidItem.id}:`, err);
              }
            }

            return {
              id: bidItem.id,
              customerName: buyerNamesMap[bidItem.acceptedBid.buyerId] || bidItem.acceptedBid.buyerId,
              items: [{
                name: bidItem.itemName,
                quantity: bidItem.quantity,
                price: bidItem.acceptedBid.bidAmount,
              }],
              totalBill: bidItem.acceptedBid.bidAmount + (bidItem.acceptedBid.deliveryAmount || 0),
              paymentMethod: 'PAID' as 'PAID' | 'CASH',
              status,
              placedDate: bidItem.createdAt ? bidItem.createdAt.toDate() : new Date(),
              placedTime: bidItem.createdAt ? formatDateTime(bidItem.createdAt.toDate()) : formatDateTime(new Date()),
              acceptedDate: bidItem.acceptedBid?.acceptedAt ? bidItem.acceptedBid.acceptedAt.toDate() : undefined,
              acceptedTime: bidItem.acceptedBid?.acceptedAt ? formatDateTime(bidItem.acceptedBid.acceptedAt.toDate()) : undefined,
              pickedUpDate,
              pickedUpTime,
              deliveredDate,
              deliveredTime,
              deliveryPartner,
              deliveryAddress: bidItem.deliveryAddress,
              deliveryDetails: delivery,
            };
          })
        );
        const orders: Order[] = ordersRaw.filter(order => order !== null) as Order[];

        // Sort orders
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

        // Initialize timers for preparing orders
        const initialTimers: { [orderId: string]: number } = {};
        orders.forEach((order) => {
          if (order.status === t('preparing') && order.prepTime && order.prepTime > 0) {
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
        setError(t('errorFetchingBidOrders'));
        setLoading(false);
        console.error('Bid items fetch error:', err);
      }
    );

    return () => unsubscribe();
  }, [user, t]);

  // Timer countdown logic
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
              if (order && order.status === t('preparing')) {
                updates.push(
                  updateDoc(doc(db, 'bidItems', orderId), {
                    status: t('ready'),
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
          setError(t('failedToAutoUpdateStatus'));
        });

        return updatedTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orders, t]);

  if (error) {
    return (
      <div className="flex min-h-screen justify-center items-center text-red-500 text-lg">
        {error}
      </div>
    );
  }

  if (loading && sourceTab === 'bidOrders') {
    return (
      <div className="flex min-h-screen justify-center items-center text-gray-600 text-lg">
        {t('loading')}
      </div>
    );
  }

  const filteredOrders = orders
    .filter((order) => {
      if (activeTab === 'preparing') {
        return order.status === t('preparing') && order.acceptedTime;
      }
      if (activeTab === 'ready') {
        return order.status === t('ready');
      }
      if (activeTab === 'pickedUp') {
        return [t('pickedUp'), t('delivered')].includes(order.status);
      }
      return false;
    })
    .filter((order) =>
      searchQuery
        ? order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : true
    );

  const getProgressPercentage = (status: Order['status']): number => {
    switch (status) {
      case t('active'):
        return 0;
      case t('accepted'):
        return 20;
      case t('preparing'):
        return 40;
      case t('ready'):
        return 60;
      case t('pickedUp'):
        return 80;
      case t('delivered'):
        return 100;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: Order['status']): string => {
    switch (status) {
      case t('accepted'):
        return 'bg-green-100 text-green-800';
      case t('preparing'):
        return 'bg-orange-100 text-orange-800';
      case t('ready'):
        return 'bg-yellow-100 text-yellow-800';
      case t('pickedUp'):
        return 'bg-blue-100 text-blue-800';
      case t('delivered'):
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}${t('minutes')} ${secs}${t('seconds')}`;
  };

  const getMenuItems = () => {
    return [
      {
        label: t('dashboard'),
        onClick: () => navigate("/farmer/homePage"),
        icon: <LayoutDashboard className="text-white" />
      },
      {
        label: t('addProduct'),
        onClick: () => navigate("/farmer/add-product"),
        icon: <LucideSprout className="text-white" />
      },
      {
        label: t('orders'),
        onClick: () => navigate("/farmer/orders"),
        icon: <ListCheckIcon className="text-white" />
      },
      {
        label: t('biding'),
        onClick: () => navigate("/farmer/biding"),
        icon: <FaHandshake className="text-white" />
      },
      {
        label: t('advisory'),
        onClick: () => navigate("/farmer/advisory"),
        icon: <Leaf className="text-white" />
      },
      {
        label: t('settings'),
        onClick: () => navigate("/farmer/settings"),
        icon: <Settings className="text-white" />
      },
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar menuItems={getMenuItems()} />

      {/* Main Content */}
      <div className="pt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{t('orders')}</h1>
        </header>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full sm:w-1/2">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Source Tabs */}
        <div className="flex flex-wrap gap-4 border-b border-gray-200">
          {(['bidOrders', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSourceTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition-all duration-200 ${
                sourceTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {/* Conditional Rendering of Order Lists */}
        {sourceTab === 'bidOrders' ? (
          <>
            {/* Tabs for Bid Orders */}
            <div className="flex flex-wrap gap-4 mb-8 border-b mt-3 border-gray-200">
              {(['preparing', 'ready', 'pickedUp'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab
                      ? 'border-b-2 border-green-500 text-green-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {t(`${tab}Orders`)}
                  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {tab === 'pickedUp'
                      ? orders.filter((o) =>
                          [t('pickedUp'), t('delivered')].includes(o.status)
                        ).length
                      : orders.filter((o) => o.status === t(tab)).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Bid Orders List */}
            <div className="grid gap-6">
              {filteredOrders.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  {t('noBidOrders')}
                </div>
              )}
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xl font-semibold text-gray-800">
                        {order.customerName} {t('orderPossessive')}
                      </div>
                      <div className="text-sm text-gray-500">{t('id')}: {order.id}</div>
                    </div>
                    <div className="text-right">
                      {order.items.map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <span className="text-red-500 font-medium">{item.quantity}x </span>
                          {item.name}{' '}
                          <span className="font-semibold">₹{item.price}</span>
                        </div>
                      ))}
                      <div className="mt-2 font-semibold text-gray-800">
                        {t('total')}: ₹{order.totalBill}{' '}
                        <span
                          className={
                            order.paymentMethod === 'PAID'
                              ? 'text-green-600 text-xs'
                              : 'text-gray-600 text-xs'
                          }
                        >
                          ({order.paymentMethod})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{t('orderProgress')}</span>
                      <span className="text-green-600 font-medium">
                        {getProgressPercentage(order.status)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(order.status)}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-wrap justify-between text-xs text-gray-500 mt-2 gap-2">
                      <span>{t('placed')}: {order.placedTime}</span>
                      {order.acceptedTime && <span>{t('accepted')}: {order.acceptedTime}</span>}
                      {order.readyTime && <span>{t('ready')}: {order.readyTime}</span>}
                      {order.pickedUpTime && <span>{t('pickedUp')}: {order.pickedUpTime}</span>}
                      {order.deliveredTime && <span>{t('delivered')}: {order.deliveredTime}</span>}
                    </div>
                  </div>

                  {activeTab === 'preparing' && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{t('timeRemaining')}: {timers[order.id] !== undefined ? formatTimeRemaining(timers[order.id]) : t('na')}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap gap-3">
                      {order.status === t('preparing') && (
                        <>
                          {!editPrepTime[order.id] ? (
                            <>
                              <button
                                onClick={() => handleReadyOrder(order.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm"
                              >
                                {t('markAsReady')}
                              </button>
                              <button
                                onClick={() =>
                                  setEditPrepTime((prev) => ({ ...prev, [order.id]: true }))
                                }
                                className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-yellow-600 transition-colors text-sm"
                              >
                                {t('updatePrepTime')}
                              </button>
                              <button
                                onClick={() => handleTrackOrder(order)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm"
                              >
                                <FaClock className="mr-2" />
                                {t('trackOrder')}
                              </button>
                              <button
                                onClick={() => handleViewDetails(order)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm"
                              >
                                <FaInfoCircle className="mr-2" />
                                {t('viewDetails')}
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                placeholder={t('prepTimePlaceholder')}
                                className="p-2 border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={prepTimeInputs[order.id] || order.prepTime || ''}
                                onChange={(e) =>
                                  setPrepTimeInputs((prev) => ({
                                    ...prev,
                                    [order.id]: parseInt(e.target.value) || 0,
                                  }))
                                }
                              />
                              <button
                                onClick={() => handleUpdatePrepTime(order.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm"
                              >
                                {t('save')}
                              </button>
                              <button
                                onClick={() =>
                                  setEditPrepTime((prev) => ({ ...prev, [order.id]: false }))
                                }
                                className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-500 transition-colors text-sm"
                              >
                                {t('cancel')}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      {order.status === t('ready') && (
                        <>
                          {order.deliveryDetails?.deliveryPartnerId ? (
                            <>
                              <button
                                onClick={() => handleViewDeliveryPartner(order)}
                                className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-purple-600 transition-colors flex items-center text-sm"
                              >
                                <FaUser className="mr-2" />
                                {t('viewDeliveryPartner')}
                              </button>
                              <button
                                onClick={() => handleTrackOrder(order)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm"
                              >
                                <FaClock className="mr-2" />
                                {t('trackOrder')}
                              </button>
                              <button
                                onClick={() => handleViewDetails(order)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm"
                              >
                                <FaInfoCircle className="mr-2" />
                                {t('viewDetails')}
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="text-sm text-yellow-600">
                                {t('findingDriver')}
                              </div>
                              <button
                                onClick={() => handleViewDetails(order)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm"
                              >
                                <FaInfoCircle className="mr-2" />
                                {t('viewDetails')}
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {[t('pickedUp'), t('delivered')].includes(order.status) && (
                        <>
                          <div className="text-sm text-gray-600">
                            {order.status === t('pickedUp') && t('pickedUpByDriver')}
                            {order.status === t('delivered') && t('delivered')}
                          </div>
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center text-sm"
                          >
                            <FaClock className="mr-2" />
                            {t('trackOrder')}
                          </button>
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-600 transition-colors flex items-center text-sm"
                          >
                            <FaInfoCircle className="mr-2" />
                            {t('viewDetails')}
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() =>
                          setShowAddress((prev) => ({
                            ...prev,
                            [order.id]: !prev[order.id],
                          }))
                        }
                        className="text-gray-600 flex items-center text-sm hover:text-gray-800"
                      >
                        <FaMapMarkerAlt className="w-4 h-4 mr-1" />
                        {showAddress[order.id] ? t('hideAddress') : t('showAddress')}
                      </button>
                      {showAddress[order.id] && order.deliveryAddress && (
                        <div className="text-sm text-gray-600 mt-2">
                          <div className="font-semibold">{t('deliveryAddress')}:</div>
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
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {t('orderDetails')}
                  </h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      <strong className="font-semibold">{t('orderId')}:</strong>{' '}
                      {selectedOrder.id}
                    </p>
                    <p>
                      <strong className="font-semibold">{t('customerName')}:</strong>{' '}
                      {selectedOrder.customerName}
                    </p>
                    <p>
                      <strong className="font-semibold">{t('items')}:</strong>
                    </p>
                    <ul className="list-disc pl-5">
                      {selectedOrder.items.map((item, index) => (
                        <li key={index}>
                          {item.quantity}x {item.name} - ₹{item.price}
                        </li>
                      ))}
                    </ul>
                    <p>
                      <strong className="font-semibold">{t('totalBill')}:</strong> ₹
                      {selectedOrder.totalBill} ({selectedOrder.paymentMethod})
                    </p>
                    <p>
                      <strong className="font-semibold">{t('deliveryAddress')}:</strong>{' '}
                      {selectedOrder.deliveryAddress || t('na')}
                    </p>
                    <p>
                      <strong className="font-semibold">{t('placedAt')}:</strong>{' '}
                      {selectedOrder.placedTime}
                    </p>
                    {selectedOrder.acceptedTime && (
                      <p>
                        <strong className="font-semibold">{t('acceptedAt')}:</strong>{' '}
                        {selectedOrder.acceptedTime}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeDetailsModal}
                    className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            )}

            {/* Tracking Modal */}
            {isTrackingModalOpen && selectedOrder && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {t('trackOrder')} - {t('id')}: {selectedOrder.id}
                  </h2>
                  <div className="space-y-6">
                    {[
                      { status: t('placed'), time: selectedOrder.placedTime, active: true },
                      { status: t('accepted'), time: selectedOrder.acceptedTime, active: !!selectedOrder.acceptedTime },
                      { status: t('ready'), time: selectedOrder.readyTime, active: !!selectedOrder.readyTime },
                      {
                        status: t('pickedUp'),
                        time: selectedOrder.pickedUpTime,
                        active: !!selectedOrder.pickedUpTime || selectedOrder.deliveryDetails?.pickedUpOrder,
                      },
                      {
                        status: t('delivered'),
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
                            <p className="text-sm text-gray-400">{t('pending')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={closeTrackingModal}
                    className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            )}

            {/* Delivery Partner Modal */}
            {isDeliveryModalOpen && selectedOrder && selectedOrder.deliveryPartner && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {t('deliveryPartnerDetails')}
                  </h2>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      <strong className="font-semibold">{t('name')}:</strong>{' '}
                      {selectedOrder.deliveryPartner.name}
                    </p>
                    <p>
                      <strong className="font-semibold">{t('amount')}:</strong> ₹
                      {selectedOrder.deliveryPartner.amount || t('na')}
                    </p>
                    <p>
                      <strong className="font-semibold">{t('pickupTime')}:</strong>{' '}
                      {selectedOrder.deliveryPartner.pickupTime || t('notYetPickedUp')}
                    </p>
                  </div>
                  <button
                    onClick={closeDeliveryModal}
                    className="mt-6 w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="pt-4">
            <OrdersList />
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;