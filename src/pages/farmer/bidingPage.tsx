import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Timestamp } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { FaHandshake } from 'react-icons/fa';
import { LayoutDashboard, Leaf, ListCheckIcon, Loader2, LucideSprout, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import ActiveBids from './biding/activeBids';
import AcceptedBids from './biding/acceptedBids';
import DeliveryOffers from './biding/deliveryOffers';
import Sidebar from '../../components/ui/sidebar';

interface BidItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  quantity: number;
  basePrice: number;
  biddingStartDate: any;
  imageUrls: string[];
  bids?: Array<{ buyerId: string; bidAmount: number; timestamp: any }>;
  acceptedBid?: { buyerId: string; bidAmount: number; acceptedAt: any };
  deliveryDetails?: Array<{
    amount: number;
    deliveryPartnerId: string;
    lockedAt: any;
  }>;
  status: string;
}

interface BuyerDetails {
  [key: string]: { fullName: string; address: string };
}

interface DeliveryPartnerDetails {
  [key: string]: { fullName: string };
}

const FarmerAddBiddingPage = () => {
  const { t } = useTranslation(); // Hook for translations
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [biddingStartDate, setBiddingStartDate] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [bidItems, setBidItems] = useState<BidItem[]>([]);
  const [buyerDetails, setBuyerDetails] = useState<BuyerDetails>({});
  const [deliveryPartnerDetails, setDeliveryPartnerDetails] = useState<DeliveryPartnerDetails>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError(t('loginRequired'));
      setLoading(false);
      return;
    }

    const farmerId = user.uid;
    const q = query(collection(db, 'bidItems'), where('ownerUserId', '==', farmerId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BidItem[];
      setBidItems(itemsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bid items:", err);
      setError(t('failedToLoadBidItems'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, t]);

  // Fetch buyer details for accepted bids
  useEffect(() => {
    const fetchBuyerDetails = async () => {
      const newBuyerDetails: BuyerDetails = {};
      for (const item of bidItems) {
        if (item.acceptedBid && item.acceptedBid.buyerId) {
          const buyerId = item.acceptedBid.buyerId;
          if (!buyerDetails[buyerId]) {
            try {
              const userDoc = await getDoc(doc(db, 'buyer', buyerId));
              if (userDoc.exists()) {
                const data = userDoc.data();
                newBuyerDetails[buyerId] = {
                  fullName: data.fullName || t('unknownBuyer'),
                  address: data.address || t('noAddressProvided'),
                };
              } else {
                newBuyerDetails[buyerId] = {
                  fullName: t('unknownBuyer'),
                  address: t('noAddressProvided'),
                };
              }
            } catch (err) {
              console.error(`Error fetching buyer ${buyerId}:`, err);
              newBuyerDetails[buyerId] = {
                fullName: t('unknownBuyer'),
                address: t('noAddressProvided'),
              };
            }
          }
        }
      }
      setBuyerDetails((prev) => ({ ...prev, ...newBuyerDetails }));
    };

    if (bidItems.length > 0) {
      fetchBuyerDetails();
    }
  }, [bidItems, t]);

  // Fetch delivery partner details for deliveryDetails
  useEffect(() => {
    const fetchDeliveryPartnerDetails = async () => {
      const newDeliveryPartnerDetails: DeliveryPartnerDetails = {};
      for (const item of bidItems) {
        if (item.deliveryDetails && item.deliveryDetails.length > 0) {
          for (const detail of item.deliveryDetails) {
            const partnerId = detail.deliveryPartnerId;
            if (!deliveryPartnerDetails[partnerId]) {
              try {
                const partnerDoc = await getDoc(doc(db, 'deliveryPartner', partnerId));
                if (partnerDoc.exists()) {
                  const data = partnerDoc.data();
                  newDeliveryPartnerDetails[partnerId] = {
                    fullName: data.fullName || t('unknownDeliveryPartner'),
                  };
                } else {
                  newDeliveryPartnerDetails[partnerId] = {
                    fullName: t('unknownDeliveryPartner'),
                  };
                }
              } catch (err) {
                console.error(`Error fetching delivery partner ${partnerId}:`, err);
                newDeliveryPartnerDetails[partnerId] = {
                  fullName: t('unknownDeliveryPartner'),
                };
              }
            }
          }
        }
      }
      setDeliveryPartnerDetails((prev) => ({ ...prev, ...newDeliveryPartnerDetails }));
    };

    if (bidItems.length > 0) {
      fetchDeliveryPartnerDetails();
    }
  }, [bidItems, t]);

  const handleAddImageField = () => {
    setImageUrls([...imageUrls, '']);
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newImageUrls = [...imageUrls];
    newImageUrls[index] = value;
    setImageUrls(newImageUrls);
  };

  const handleFinalizeDetails = async () => {
    if (!itemName || !quantity || !basePrice || !biddingStartDate || imageUrls.every(url => !url)) {
      alert(t('fillAllFields'));
      return;
    }

    const parsedQuantity = parseInt(quantity);
    const parsedBasePrice = parseFloat(basePrice);
    const parsedBiddingStartDate = new Date(biddingStartDate);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      alert(t('invalidQuantity'));
      return;
    }

    if (isNaN(parsedBasePrice) || parsedBasePrice <= 0) {
      alert(t('invalidBasePrice'));
      return;
    }

    if (isNaN(parsedBiddingStartDate.getTime()) || parsedBiddingStartDate < new Date()) {
      alert(t('invalidBiddingStartDate'));
      return;
    }

    try {
      setLoading(true);
      const filteredImageUrls = imageUrls.filter(url => url.trim() !== '');
      await addDoc(collection(db, 'bidItems'), {
        ownerUserId: user!.uid,
        itemName,
        quantity: parsedQuantity,
        basePrice: parsedBasePrice,
        biddingStartDate: Timestamp.fromDate(parsedBiddingStartDate),
        imageUrls: filteredImageUrls,
        bids: [],
        status: 'active',
        createdAt: Timestamp.now(),
      });

      // Reset form and close modal
      setItemName('');
      setQuantity('');
      setBasePrice('');
      setBiddingStartDate('');
      setImageUrls(['']);
      setIsModalOpen(false);
      alert(t('productAddedSuccess'));
    } catch (err: any) {
      console.error("Error adding bid item:", err);
      alert(t('productAddedFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (item: BidItem, bid: { buyerId: string; bidAmount: number }) => {
    if (!bid.buyerId) {
      alert(t('missingBuyerId'));
      return;
    }

    try {
      const itemRef = doc(db, 'bidItems', item.id);
      await updateDoc(itemRef, {
        acceptedBid: {
          buyerId: bid.buyerId,
          bidAmount: bid.bidAmount,
          acceptedAt: Timestamp.now(),
        },
        status: 'active',
        bids: [],
      });
      alert(t('bidAccepted', { amount: bid.bidAmount, buyerId: bid.buyerId }));
    } catch (err: any) {
      console.error("Error accepting bid:", err);
      alert(t('bidAcceptFailed'));
    }
  };

  const handleDeclineBid = async (item: BidItem, bid: { buyerId: string; bidAmount: number; timestamp: any }) => {
    try {
      const itemRef = doc(db, 'bidItems', item.id);
      await updateDoc(itemRef, {
        bids: arrayRemove(bid)
      });
      alert(t('bidDeclined', { amount: bid.bidAmount, buyerId: bid.buyerId }));
    } catch (err: any) {
      console.error("Error declining bid:", err);
      alert(t('bidDeclineFailed'));
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
          <h2 className="text-xl font-medium text-gray-600">{error}</h2>
        </div>
      </div>
    );
  }

  const getMenuItems = () => {
    return [
      {
        label: t('dashboard'),
        onClick: () => navigate('/farmer/homePage'),
        icon: <LayoutDashboard className="text-white" />
      },
      {
        label: t('addProduct'),
        onClick: () => navigate('/farmer/add-product'),
        icon: <LucideSprout className="text-white" />
      },
      {
        label: t('orders'),
        onClick: () => navigate('/farmer/orders'),
        icon: <ListCheckIcon className="text-white" />
      },
      {
        label: t('biding'),
        onClick: () => navigate('/farmer/biding'),
        icon: <FaHandshake className="text-white" />
      },
      {
        label: t('advisory'),
        onClick: () => navigate('/farmer/advisory'),
        icon: <Leaf className="text-white" />
      },
      {
        label: t('settings'),
        onClick: () => navigate('/farmer/settings'),
        icon: <Settings className="text-white" />
      },
    ];
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar menuItems={getMenuItems()} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900 font-sans">
              {t('addBidingProducts')}
            </h1>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('addProduct')}
          </Button>
        </div>

        {/* Modal for Adding Product */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-green-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('addProductForBidding')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('itemName')}</label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={t('enterItemName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('quantity')}</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={t('enterQuantity')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('basePrice')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={t('enterBasePrice')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('biddingStartDate')}</label>
                  <input
                    type="datetime-local"
                    value={biddingStartDate}
                    onChange={(e) => setBiddingStartDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('images')}</label>
                  {imageUrls.map((url, index) => (
                    <div key={index} className="flex items-center space-x-2 mt-1">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => handleImageUrlChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder={t('imageUrl', { index: index + 1 })}
                      />
                    </div>
                  ))}
                  <Button
                    onClick={handleAddImageField}
                    className="mt-2 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {t('addAnotherImage')}
                  </Button>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleFinalizeDetails}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t('finalizeDetails')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Render Components */}
        <ActiveBids
          bidItems={bidItems}
          handleAcceptBid={handleAcceptBid}
          handleDeclineBid={handleDeclineBid}
        />
        <AcceptedBids bidItems={bidItems} buyerDetails={buyerDetails} />
        <DeliveryOffers
          bidItems={bidItems}
          buyerDetails={buyerDetails}
          deliveryPartnerDetails={deliveryPartnerDetails}
        />
      </div>
    </div>
  );
};

export default FarmerAddBiddingPage;