import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, DocumentData, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { Button } from '../../components/ui/button';

interface BidItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  quantity: number;
  acceptedBid: { buyerId: string; bidAmount: number; acceptedAt: any };
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

interface UserDetails {
  fullName: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
}

interface DeliveryItem {
  bidItem: BidItem;
  farmer: UserDetails;
  buyer: UserDetails;
  distance: number;
  minAmount: number;
  adjustedAmount: number;
  isLocked: boolean;
  acceptedForDelivery: boolean;
  trackingStates: {
    onMyWayToFarmer: boolean;
    reachedFarmer: boolean;
    pickedUpOrder: boolean;
    onMyWayToBuyer: boolean;
    reachedBuyer: boolean;
    deliveredOrder: boolean;
  };
}

// Haversine formula for distance calculation
const haversineDistance = (
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
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

  return Number(distance.toFixed(2)); // Round to 2 decimal places
};

const DeliveryPartnerSection = () => {
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('You need to be logged in to view delivery items.');
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'bidItems'), where('acceptedBid', '!=', null));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const items: DeliveryItem[] = [];
        for (const docSnap of snapshot.docs) {
          const bidItem = { id: docSnap.id, ...docSnap.data() } as BidItem;

          if (!bidItem.ownerUserId || !bidItem.acceptedBid?.buyerId) {
            console.warn(`Skipping bidItem ${bidItem.id}: Missing ownerUserId or buyerId`);
            continue;
          }

          let farmerData: UserDetails = { fullName: '', address: '' };
          try {
            const farmerDoc = await getDoc(doc(db, 'farmer', bidItem.ownerUserId));
            if (farmerDoc.exists()) {
              const data = farmerDoc.data() as DocumentData;
              farmerData = {
                fullName: data.fullName || 'Unknown Farmer',
                address: data.location || 'No address provided',
                coordinates: data.coordinates,
              };
            }
          } catch (err) {
            console.error(`Error fetching farmer ${bidItem.ownerUserId}:`, err);
          }

          let buyerData: UserDetails = { fullName: '', address: '' };
          try {
            const buyerDoc = await getDoc(doc(db, 'buyer', bidItem.acceptedBid.buyerId));
            if (buyerDoc.exists()) {
              const data = buyerDoc.data() as DocumentData;
              buyerData = {
                fullName: data.fullName || 'Unknown Buyer',
                address: data.address || 'No address provided',
                coordinates: data.coordinates,
              };
            }
          } catch (err) {
            console.error(`Error fetching buyer ${bidItem.acceptedBid.buyerId}:`, err);
          }

          let distance = 10;
          if (farmerData.coordinates && buyerData.coordinates) {
            try {
              distance = haversineDistance(farmerData.coordinates, buyerData.coordinates);
            } catch (err) {
              console.error('Error calculating distance:', err);
            }
          }

          const minAmount = distance * 10;

          const deliveryDetail = bidItem.deliveryDetails?.find(
            (detail) => detail.deliveryPartnerId === user.uid
          );
          const isLocked = !!deliveryDetail;
          const adjustedAmount = deliveryDetail ? deliveryDetail.amount : minAmount;

          const acceptedForDelivery = !!deliveryDetail?.acceptedForDelivery;
          const trackingStates = {
            onMyWayToFarmer: !!deliveryDetail?.onMyWayToFarmer,
            reachedFarmer: !!deliveryDetail?.reachedFarmer,
            pickedUpOrder: !!deliveryDetail?.pickedUpOrder,
            onMyWayToBuyer: !!deliveryDetail?.onMyWayToBuyer,
            reachedBuyer: !!deliveryDetail?.reachedBuyer,
            deliveredOrder: !!deliveryDetail?.deliveredOrder,
          };

          items.push({
            bidItem,
            farmer: farmerData,
            buyer: buyerData,
            distance,
            minAmount,
            adjustedAmount,
            isLocked,
            acceptedForDelivery,
            trackingStates,
          });
        }
        setDeliveryItems(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching delivery items:', err);
        setError('Failed to load delivery items. Please try again later.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleIncreaseAmount = (itemId: string) => {
    setDeliveryItems((prevItems) =>
      prevItems.map((item) => {
        if (item.bidItem.id === itemId && !item.isLocked) {
          const newAmount = item.adjustedAmount + 10;
          const maxAmount = item.minAmount * 2;
          return {
            ...item,
            adjustedAmount: Math.min(newAmount, maxAmount),
          };
        }
        return item;
      })
    );
  };

  const handleDecreaseAmount = (itemId: string) => {
    setDeliveryItems((prevItems) =>
      prevItems.map((item) => {
        if (item.bidItem.id === itemId && !item.isLocked) {
          const newAmount = item.adjustedAmount - 10;
          return {
            ...item,
            adjustedAmount: newAmount,
          };
        }
        return item;
      })
    );
  };

  const handleLockAmount = async (itemId: string, adjustedAmount: number) => {
    if (!user) {
      alert('You must be logged in to lock an amount.');
      return;
    }
    try {
      const itemRef = doc(db, 'bidItems', itemId);
      await updateDoc(itemRef, {
        deliveryDetails: arrayUnion({
          amount: adjustedAmount,
          deliveryPartnerId: user.uid,
          lockedAt: Timestamp.now(),
        }),
      });
      setDeliveryItems((prevItems) =>
        prevItems.map((item) =>
          item.bidItem.id === itemId ? { ...item, isLocked: true } : item
        )
      );
      alert(`Delivery amount locked at ₹${adjustedAmount}`);
    } catch (err) {
      console.error('Error locking delivery amount:', err);
      alert('Failed to lock delivery amount. Please try again.');
    }
  };

  const handleUpdateTrackingStatus = async (itemId: string, statusKey: keyof DeliveryItem['trackingStates']) => {
    if (!user) {
      alert('You must be logged in to update tracking status.');
      return;
    }
    try {
      const itemRef = doc(db, 'bidItems', itemId);
      const item = deliveryItems.find((item) => item.bidItem.id === itemId);
      if (!item || !item.bidItem.deliveryDetails) return;

      const updatedDeliveryDetails = item.bidItem.deliveryDetails.map((detail) =>
        detail.deliveryPartnerId === user.uid
          ? { ...detail, [statusKey]: true }
          : detail
      );

      await updateDoc(itemRef, {
        deliveryDetails: updatedDeliveryDetails,
      });

      setDeliveryItems((prevItems) =>
        prevItems.map((item) =>
          item.bidItem.id === itemId
            ? {
                ...item,
                trackingStates: {
                  ...item.trackingStates,
                  [statusKey]: true,
                },
              }
            : item
        )
      );
      alert(`Status updated: ${statusKey.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    } catch (err) {
      console.error('Error updating tracking status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 mb-4">{error}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Delivery Partner - Accepted Bids</h2>
      {deliveryItems.length === 0 ? (
        <p className="text-gray-600">No accepted bids available for delivery.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveryItems.map((item) => {
            const trackingSteps = [
              {
                key: 'onMyWayToFarmer' as keyof DeliveryItem['trackingStates'],
                label: 'On the way to farmer',
                enabled: true, // First step is always enabled
                status: item.trackingStates.onMyWayToFarmer,
              },
              {
                key: 'reachedFarmer' as keyof DeliveryItem['trackingStates'],
                label: 'Reached the farmer',
                enabled: item.trackingStates.onMyWayToFarmer,
                status: item.trackingStates.reachedFarmer,
              },
              {
                key: 'pickedUpOrder' as keyof DeliveryItem['trackingStates'],
                label: 'Picked up the order',
                enabled: item.trackingStates.reachedFarmer,
                status: item.trackingStates.pickedUpOrder,
              },
              {
                key: 'onMyWayToBuyer' as keyof DeliveryItem['trackingStates'],
                label: 'On the way to buyer',
                enabled: item.trackingStates.pickedUpOrder,
                status: item.trackingStates.onMyWayToBuyer,
              },
              {
                key: 'reachedBuyer' as keyof DeliveryItem['trackingStates'],
                label: 'Reached the buyer',
                enabled: item.trackingStates.onMyWayToBuyer,
                status: item.trackingStates.reachedBuyer,
              },
              {
                key: 'deliveredOrder' as keyof DeliveryItem['trackingStates'],
                label: 'Delivered the order',
                enabled: item.trackingStates.reachedBuyer,
                status: item.trackingStates.deliveredOrder,
              },
            ];

            const isCompleted = trackingSteps.every(step => step.status);

            return (
              <div key={item.bidItem.id} className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-800">{item.bidItem.itemName}</h3>
                <p className="text-sm text-gray-500 mb-2">Quantity: {item.bidItem.quantity}</p>
                <p className="text-sm text-gray-500 mb-2">
                  Pickup Point (Farmer): {item.farmer.address}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Delivery Point (Buyer): {item.buyer.address}
                </p>
                <p className="text-sm text-gray-500 mb-2">Distance: {item.distance} km</p>
                <div className="text-sm text-gray-500 mb-2">
                  <p>Minimum Delivery Amount: ₹{item.minAmount}</p>
                  {item.adjustedAmount !== item.minAmount && (
                    <p>Adjusted Delivery Amount: ₹{item.adjustedAmount}</p>
                  )}
                  {item.isLocked ? (
                    item.acceptedForDelivery ? (
                      <div className="mt-2">
                        <p className="text-green-600 font-medium">
                          Delivery Accepted: Please proceed to the pickup location at {item.farmer.address}.
                        </p>
                        {isCompleted ? (
                          <p className="text-gray-600 mt-1">
                            Delivery Completed: All steps have been marked as completed.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {trackingSteps.map((step) => (
                              <Button
                                key={step.key}
                                onClick={() => handleUpdateTrackingStatus(item.bidItem.id, step.key)}
                                disabled={!step.enabled || step.status}
                                className={`text-xs py-1 px-2 ${
                                  step.status
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    : step.enabled
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                }`}
                              >
                                {step.status ? 'Completed' : step.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-green-600">Amount Locked</p>
                    )
                  ) : (
                    <div className="flex space-x-2 mt-1">
                      <Button
                        onClick={() => handleIncreaseAmount(item.bidItem.id)}
                        className="border border-green-600 text-green-600 hover:bg-green-700 text-xs hover:text-white"
                      >
                        Increase (+₹10)
                      </Button>
                      <Button
                        onClick={() => handleDecreaseAmount(item.bidItem.id)}
                        className="border border-red-600 text-red-600 hover:bg-red-700 text-xs hover:text-white"
                      >
                        Decrease (-₹10)
                      </Button>
                      <Button
                        onClick={() => handleLockAmount(item.bidItem.id, item.adjustedAmount)}
                        className="border border-green-600 text-green-600 hover:bg-green-700 text-xs hover:text-white"
                      >
                        Lock
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryPartnerSection;