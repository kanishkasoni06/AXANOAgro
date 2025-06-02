import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { FaStar } from 'react-icons/fa';
import { useAuth } from '../../context/authContext';
import { db } from '../../firebase/firebase';
import { Button } from '../../components/ui/button';

interface BidItem {
  id: string;
  itemName: string;
  quantity: number;
  ownerUserId: string;
  acceptedBid?: { // Added acceptedBid field
    buyerId: string;
    bidAmount: number;
    acceptedAt: any;
  };
  deliveryDetails?: Array<{
    deliveryPartnerId: string;
    acceptedForDelivery?: boolean;
  }>;
  ratings?: {
    farmerRating?: number;
    farmerComment?: string;
    deliveryPartnerRating?: number;
    deliveryPartnerComment?: string;
    ratedBy?: string;
    ratedAt?: any;
  };
}

interface FarmerDetails {
  fullName: string;
}

interface DeliveryPartnerDetails {
  fullName: string;
}

const RateOrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bidItem, setBidItem] = useState<BidItem | null>(null);
  const [farmerDetails, setFarmerDetails] = useState<FarmerDetails | null>(null);
  const [deliveryPartnerDetails, setDeliveryPartnerDetails] = useState<DeliveryPartnerDetails | null>(null);
  const [farmerRating, setFarmerRating] = useState<number>(0);
  const [farmerComment, setFarmerComment] = useState<string>('');
  const [deliveryPartnerRating, setDeliveryPartnerRating] = useState<number>(0);
  const [deliveryPartnerComment, setDeliveryPartnerComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!orderId || !user) {
        setError('Invalid order or user not logged in.');
        setLoading(false);
        return;
      }

      try {
        // Fetch bid item
        const bidItemRef = doc(db, 'bidItems', orderId);
        const bidItemSnap = await getDoc(bidItemRef);
        if (!bidItemSnap.exists()) {
          setError('Order not found.');
          setLoading(false);
          return;
        }

        const bidItemData = { id: bidItemSnap.id, ...bidItemSnap.data() } as BidItem;
        console.log('Fetched bidItemData:', bidItemData); // Log the bid item data
        setBidItem(bidItemData);

        // Check if already rated
        if (bidItemData.ratings?.ratedBy) {
          setError('This order has already been rated.');
          setLoading(false);
          return;
        }

        // Fetch farmer details using ownerUserId
        const farmerRef = doc(db, 'farmers', bidItemData.ownerUserId);
        const farmerSnap = await getDoc(farmerRef);
        if (farmerSnap.exists()) {
          setFarmerDetails(farmerSnap.data() as FarmerDetails);
        } else {
          setFarmerDetails({ fullName: 'Unknown Farmer' });
        }

        // Fetch delivery partner details from deliveryPartners collection
        console.log('bidItemData.deliveryDetails:', bidItemData.deliveryDetails); // Log deliveryDetails
        const deliveryDetailsArray = Array.isArray(bidItemData.deliveryDetails)
          ? bidItemData.deliveryDetails
          : [];
        const acceptedDelivery = deliveryDetailsArray.find(detail => detail.acceptedForDelivery);
        console.log('acceptedDelivery:', acceptedDelivery); // Log acceptedDelivery

        if (acceptedDelivery) {
          const dpRef = doc(db, 'deliveryPartners', acceptedDelivery.deliveryPartnerId);
          const dpSnap = await getDoc(dpRef);
          if (dpSnap.exists()) {
            setDeliveryPartnerDetails(dpSnap.data() as DeliveryPartnerDetails);
          } else {
            setDeliveryPartnerDetails({ fullName: 'Unknown Delivery Partner' });
          }
        } else {
          setDeliveryPartnerDetails(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load order details. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId, user]);

  const handleSubmit = async () => {
    if (!bidItem || !user) return;

    setSubmitting(true);
    try {
      const bidItemRef = doc(db, 'bidItems', orderId!);
      const ratings = {
        farmerRating: farmerRating || 0,
        farmerComment: farmerComment.trim() || '',
        deliveryPartnerRating: deliveryPartnerDetails ? deliveryPartnerRating || 0 : 0,
        deliveryPartnerComment: deliveryPartnerDetails ? deliveryPartnerComment.trim() || '' : '',
        ratedBy: user.uid,
        ratedAt: Timestamp.now(),
      };

      await updateDoc(bidItemRef, { ratings });
      navigate('/purchase-history', { state: { message: 'Ratings submitted successfully!' } });
    } catch (err) {
      console.error('Error submitting ratings:', err);
      setError('Failed to submit ratings. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error || !bidItem) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 font-sans">{error || 'Order not found.'}</h2>
          <Button
            onClick={() => navigate('/purchase-history')}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
          >
            Back to Purchase History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 font-serif">Rate Order: {bidItem.itemName}</h1>
        <p className="text-sm text-gray-600 mb-6 font-sans">
          Final Amount Paid: ₹{bidItem.acceptedBid?.bidAmount?.toFixed(2) || '0.00'}
        </p>

        {/* Farmer Rating */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 font-serif">
            Rate Farmer: {farmerDetails?.fullName || 'Loading...'}
          </h2>
          <div className="flex items-center mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={`h-6 w-6 cursor-pointer ${
                  star <= farmerRating ? 'text-yellow-400' : 'text-gray-300'
                }`}
                onClick={() => setFarmerRating(star)}
              />
            ))}
          </div>
          <textarea
            value={farmerComment}
            onChange={(e) => setFarmerComment(e.target.value)}
            placeholder="Add a comment about the farmer (optional)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-sans text-sm"
            rows={3}
          />
        </div>

        {/* Delivery Partner Rating */}
        {deliveryPartnerDetails ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 font-serif">
              Rate Delivery Partner: {deliveryPartnerDetails.fullName}
            </h2>
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={`h-6 w-6 cursor-pointer ${
                    star <= deliveryPartnerRating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  onClick={() => setDeliveryPartnerRating(star)}
                />
              ))}
            </div>
            <textarea
              value={deliveryPartnerComment}
              onChange={(e) => setDeliveryPartnerComment(e.target.value)}
              placeholder="Add a comment about the delivery partner (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-sans text-sm"
              rows={3}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-6 font-sans">
            No delivery partner assigned to this order.
          </p>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            onClick={() => navigate('/purchase-history')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg text-sm font-sans"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!farmerRating && !deliveryPartnerRating)}
            className={`${
              submitting || (!farmerRating && !deliveryPartnerRating)
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } font-medium py-2 px-6 rounded-lg text-sm font-sans`}
          >
            {submitting ? 'Submitting...' : 'Submit Ratings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RateOrderPage;