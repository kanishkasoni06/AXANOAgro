import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Button } from '../../components/ui/button';
import { FaAngleLeft, FaHandshake } from 'react-icons/fa';
import { LayoutDashboard, Leaf, ListCheckIcon, Loader2, LucideSprout, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import Sidebar from '../../components/ui/sidebar';
import { useTranslation } from 'react-i18next';

interface ProductItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  itemDescription: string;
  price: number;
  discountPrice?: number;
  stock: number;
  itemType: string;
  category?: string;
  imageUrls: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  ratings: any[];
  totalSales: number;
}

interface BidItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  quantity: number;
  basePrice: number;
  biddingStartDate: any; // Firestore Timestamp
  biddingEndDate?: any; // Firestore Timestamp
  imageUrls: string[];
  bids?: Array<{ buyerId: string; bidAmount: number; timestamp: any }>;
  acceptedBid?: { buyerId: string; bidAmount: number; acceptedAt: any };
  status: string;
}

type Item = ProductItem | BidItem;

const ProductDetailsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { productId } = useParams<{ productId: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'product' | 'bid' | null>(null);

  useEffect(() => {
    if (!user) {
      setError(t('error.notLoggedIn'));
      setLoading(false);
      return;
    }

    if (!productId) {
      setError(t('error.invalidProductId'));
      setLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        // Try fetching from 'items' collection
        const itemDocRef = doc(db, 'items', productId);
        const itemDocSnap = await getDoc(itemDocRef);

        if (itemDocSnap.exists()) {
          const data = { id: itemDocSnap.id, ...itemDocSnap.data() } as ProductItem;
          if (data.ownerUserId !== user.uid) {
            setError(t('error.unauthorizedAccess'));
            setLoading(false);
            return;
          }
          setItem(data);
          setItemType('product');
          setLoading(false);
          return;
        }

        // Try fetching from 'bidItems' collection
        const bidDocRef = doc(db, 'bidItems', productId);
        const bidDocSnap = await getDoc(bidDocRef);

        if (bidDocSnap.exists()) {
          const data = { id: bidDocSnap.id, ...bidDocSnap.data() } as BidItem;
          if (data.ownerUserId !== user.uid) {
            setError(t('error.unauthorizedAccess'));
            setLoading(false);
            return;
          }
          setItem(data);
          setItemType('bid');
          setLoading(false);
          return;
        }

        // If no document found in either collection
        setError(t('error.productNotFound'));
      } catch (err) {
        console.error('Error fetching item:', err);
        setError(t('error.loadProductFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [user, productId, t]);

  const getMenuItems = () => {
    return [
      {
        label: t('dashboard'),
        onClick: () => navigate('/farmer/homePage'),
        icon: <LayoutDashboard className="text-white" />,
      },
      {
        label: t('addProduct'),
        onClick: () => navigate('/farmer/add-product'),
        icon: <LucideSprout className="text-white" />,
      },
      {
        label: t('orders'),
        onClick: () => navigate('/farmer/orders'),
        icon: <ListCheckIcon className="text-white" />,
      },
      {
        label: t('biding'),
        onClick: () => navigate('/farmer/biding'),
        icon: <FaHandshake className="text-white" />,
      },
      {
        label: t('advisory'),
        onClick: () => navigate('/farmer/advisory'),
        icon: <Leaf className="text-white" />,
      },
      {
        label: t('settings'),
        onClick: () => navigate('/farmer/settings'),
        icon: <Settings className="text-white" />,
      },
    ];
  };

  const handleBackNavigation = () => {
    if (itemType === 'bid') {
      navigate('/farmer/biding');
    } else {
      navigate('/farmer/add-product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#2CD14D]" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium text-gray-600 font-sans">{error || t('error.productNotFound')}</h2>
        </div>
      </div>
    );
  }

  const isProductItem = (item: Item): item is ProductItem => itemType === 'product';
  const isBidItem = (item: Item): item is BidItem => itemType === 'bid';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar menuItems={getMenuItems()} />
      <div className="flex-1 ml-0 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={handleBackNavigation}
              className="flex items-center text-gray-700 hover:text-gray-900 text-sm"
              aria-label={t('back')}
            >
              <FaAngleLeft className="h-4 w-4 mr-2" />
              <span>{t('back')}</span>
            </Button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 font-serif mb-6">
            {t('productDetails')}
          </h1>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="space-y-6">
              {/* Item Images */}
              {item.imageUrls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {item.imageUrls.map((url, index) => (
                    <img
                      key={`image-${index}`}
                      src={url}
                      alt={`${item.itemName} ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/192?text=Invalid+URL';
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm font-sans">{t('noImage')}</span>
                </div>
              )}

              {/* Item Details */}
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">{t('productId')}:</span>
                  <p className="text-base text-gray-800">{item.id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">{t('productName')}:</span>
                  <p className="text-base text-gray-800">{item.itemName}</p>
                </div>
                {isProductItem(item) && (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('description')}:</span>
                      <p className="text-base text-gray-700">{item.itemDescription}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">{t('price')}:</span>
                        <p className="text-base text-gray-800">₹{item.price}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">{t('discountPrice')}:</span>
                        <p className="text-base text-gray-800">
                          {item.discountPrice ? `₹${item.discountPrice}` : t('na')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('stock')}:</span>
                      <p className="text-base text-gray-800">{item.stock} {t('units')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('productType')}:</span>
                      <p className="text-base text-gray-800">{item.itemType}</p>
                    </div>
                    {item.category && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">{t('category')}:</span>
                        <p className="text-base text-gray-800">{item.category}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('status')}:</span>
                      <p className="text-base text-gray-800">{item.status}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('createdAt')}:</span>
                      <p className="text-base text-gray-800">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('updatedAt')}:</span>
                      <p className="text-base text-gray-800">
                        {new Date(item.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('totalSales')}:</span>
                      <p className="text-base text-gray-800">{item.totalSales} {t('units')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('ratings')}:</span>
                      <p className="text-base text-gray-800">
                        {item.ratings.length > 0
                          ? `${item.ratings.length} ${t('ratings')}`
                          : t('noRatings')}
                      </p>
                    </div>
                  </>
                )}
                {isBidItem(item) && (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('quantity')}:</span>
                      <p className="text-base text-gray-800">{item.quantity} {t('units')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('basePrice')}:</span>
                      <p className="text-base text-gray-800">₹{item.basePrice}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('biddingStartDate')}:</span>
                      <p className="text-base text-gray-800">
                        {item.biddingStartDate.toDate().toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('biddingEndDate')}:</span>
                      <p className="text-base text-gray-800">
                        {item.biddingEndDate ? item.biddingEndDate.toDate().toLocaleString() : t('notSet')}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">{t('status')}:</span>
                      <p className="text-base text-gray-800">{item.status}</p>
                    </div>
                    {item.acceptedBid && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">{t('acceptedBid')}:</span>
                        <p className="text-base text-gray-800">
                          ₹{item.acceptedBid.bidAmount} by {item.acceptedBid.buyerId} at{' '}
                          {item.acceptedBid.acceptedAt.toDate().toLocaleString()}
                        </p>
                      </div>
                    )}
                    {item.bids && item.bids.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">{t('bids')}:</span>
                        <ul className="mt-2 space-y-2">
                          {item.bids
                            .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                            .map((bid, index) => (
                              <li key={index} className="text-base text-gray-800">
                                ₹{bid.bidAmount} by {bid.buyerId} at {bid.timestamp.toDate().toLocaleString()}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;