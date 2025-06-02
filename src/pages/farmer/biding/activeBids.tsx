import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { Timestamp } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { useTranslation } from 'react-i18next';

interface BidItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  quantity: number;
  basePrice: number;
  biddingStartDate: any;
  biddingEndDate?: any;
  imageUrls: string[];
  bids?: Array<{ buyerId: string; bidAmount: number; timestamp: any }>;
  acceptedBid?: { buyerId: string; bidAmount: number; acceptedAt: any };
  status: string;
}

interface ActiveBidsProps {
  bidItems: BidItem[];
  handleAcceptBid: (item: BidItem, bid: { buyerId: string; bidAmount: number; timestamp: any }) => void;
  handleDeclineBid: (item: BidItem, bid: { buyerId: string; bidAmount: number; timestamp: any }) => void;
}

const ActiveBids = ({ bidItems, handleAcceptBid, handleDeclineBid }: ActiveBidsProps) => {
  const { t } = useTranslation();
  const [endDateInputs, setEndDateInputs] = useState<{ [key: string]: string }>({});
  const [updating, setUpdating] = useState<{ [key: string]: boolean }>({});
  const [showAllItems, setShowAllItems] = useState(false);

  const handleUpdateEndDate = async (item: BidItem) => {
    if (item.acceptedBid) {
      alert(t('cannotUpdateEndDateAccepted'));
      return;
    }

    if (item.status !== 'active') {
      alert(t('cannotUpdateEndDateInactive'));
      return;
    }

    const endDateStr = endDateInputs[item.id];
    if (!endDateStr) {
      alert(t('selectEndDate'));
      return;
    }

    const newEndDate = new Date(endDateStr);
    const now = new Date();
    const startDate = item.biddingStartDate.toDate();

    if (isNaN(newEndDate.getTime())) {
      alert(t('invalidDateFormat'));
      return;
    }

    if (newEndDate <= now) {
      alert(t('endDateFuture'));
      return;
    }

    if (newEndDate <= startDate) {
      alert(t('endDateAfterStart'));
      return;
    }

    try {
      setUpdating(prev => ({ ...prev, [item.id]: true }));
      const itemRef = doc(db, 'bidItems', item.id);
      await updateDoc(itemRef, {
        biddingEndDate: Timestamp.fromDate(newEndDate),
      });
      alert(t('endDateUpdated', { itemName: item.itemName }));
      setEndDateInputs(prev => ({ ...prev, [item.id]: '' }));
    } catch (err: any) {
      console.error('Error updating bidding end date:', err);
      alert(t('failedToUpdateEndDate'));
    } finally {
      setUpdating(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleEndDateChange = (itemId: string, value: string) => {
    setEndDateInputs(prev => ({ ...prev, [itemId]: value }));
  };

  const handleAcceptBidWithStatus = async (item: BidItem, bid: { buyerId: string; bidAmount: number; timestamp: any }) => {
    try {
      setUpdating(prev => ({ ...prev, [item.id]: true }));
      await handleAcceptBid(item, bid);
      const itemRef = doc(db, 'bidItems', item.id);
      await updateDoc(itemRef, {
        status: 'accepted',
        acceptedBid: {
          buyerId: bid.buyerId,
          bidAmount: bid.bidAmount,
          acceptedAt: Timestamp.fromDate(new Date()),
        },
      });
    } catch (err: any) {
      console.error('Error accepting bid:', err);
      alert(t('failedToAcceptBid'));
    } finally {
      setUpdating(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const displayedItems = bidItems.length > 3 && !showAllItems ? bidItems.slice(0, 3) : bidItems;

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">{t('yourBiddingItems')}</h2>
      {bidItems.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">{t('noListedItems')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <img
                  src={item.imageUrls[0] || 'https://via.placeholder.com/150'}
                  alt={item.itemName}
                  className="h-48 w-full object-cover rounded-lg mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-800 mb-2 font-serif">{item.itemName}</h3>
                <p className="text-sm text-gray-600 mb-2 font-sans">{t('quantity')} {item.quantity}</p>
                <p className="text-base font-medium text-gray-800 mb-2 font-sans">
                  {t('basePrice', { basePrice: item.basePrice })}
                </p>
                <p className="text-sm text-gray-600 font-sans">
                  {t('biddingStarts')} {item.biddingStartDate.toDate().toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 font-sans">
                  {t('biddingEnds')}{' '}
                  {item.biddingEndDate
                    ? item.biddingEndDate.toDate().toLocaleString()
                    : t('notSet')}
                </p>
                {!item.acceptedBid && item.status === 'active' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 font-sans">
                      {t('setBiddingEndDate')}
                    </label>
                    <div className="flex items-center space-x-3 mt-2">
                      <input
                        type="datetime-local"
                        value={endDateInputs[item.id] || ''}
                        onChange={e => handleEndDateChange(item.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-sans"
                        disabled={updating[item.id]}
                      />
                      <Button
                        onClick={() => handleUpdateEndDate(item)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                        disabled={updating[item.id]}
                      >
                        {updating[item.id] ? t('saving') : t('save')}
                      </Button>
                    </div>
                  </div>
                )}
                {item.acceptedBid && (
                  <p className="text-sm text-green-700 font-medium mt-2 font-sans">
                    {t('acceptedBid', { amount: item.acceptedBid.bidAmount })}
                  </p>
                )}
                {item.status === 'declined' && (
                  <p className="text-sm text-red-600 font-medium mt-2 font-sans">{t('biddingCancelled')}</p>
                )}
                {item.bids && item.bids.length > 0 && item.status === 'active' && (
                  <div className="mt-6">
                    <h4 className="text-base font-semibold text-gray-700 mb-3 font-serif">{t('bidActivity')}</h4>
                    <ul className="space-y-3">
                      {item.bids
                        .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                        .map((bid, index) => (
                          <li
                            key={index}
                            className="flex justify-between items-center border-b border-gray-200 pb-2"
                          >
                            <span className="text-sm text-gray-600 font-sans">
                              {t('bidByBuyer', {
                                bidAmount: bid.bidAmount,
                                buyerId: bid.buyerId,
                                timestamp: bid.timestamp.toDate().toLocaleString(),
                              })}
                            </span>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleAcceptBidWithStatus(item, bid)}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded-lg text-xs font-sans"
                                disabled={updating[item.id]}
                              >
                                {t('accept')}
                              </Button>
                              <Button
                                onClick={() => handleDeclineBid(item, bid)}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-lg text-xs font-sans"
                                disabled={updating[item.id]}
                              >
                                {t('decline')}
                              </Button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          {bidItems.length > 3 && !showAllItems && (
            <div className="mt-8 text-center">
              <Button
                onClick={() => setShowAllItems(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
              >
                {t('viewMore')}
              </Button>
            </div>
          )}
        </>
      )}

      {showAllItems && (
        <div className="fixed inset-0 bg-opacity-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-7xl w-full max-h-[80vh] overflow-y-auto relative scrollbar-hide"
               style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <button
              onClick={() => setShowAllItems(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{t('allBiddingItems')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bidItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
                >
                  <img
                    src={item.imageUrls[0] || 'https://via.placeholder.com/150'}
                    alt={item.itemName}
                    className="h-48 w-full object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 font-serif">{item.itemName}</h3>
                  <p className="text-sm text-gray-600 mb-2 font-sans">{t('quantity')} {item.quantity}</p>
                  <p className="text-base font-medium text-gray-800 mb-2 font-sans">
                    {t('basePrice', { basePrice: item.basePrice })}
                  </p>
                  <p className="text-sm text-gray-600 font-sans">
                    {t('biddingStarts')} {item.biddingStartDate.toDate().toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 font-sans">
                    {t('biddingEnds')}{' '}
                    {item.biddingEndDate
                      ? item.biddingEndDate.toDate().toLocaleString()
                      : t('notSet')}
                  </p>
                  {!item.acceptedBid && item.status === 'active' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 font-sans">
                        {t('setBiddingEndDate')}
                      </label>
                      <div className="flex items-center space-x-3 mt-2">
                        <input
                          type="datetime-local"
                          value={endDateInputs[item.id] || ''}
                          onChange={e => handleEndDateChange(item.id, e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-sans"
                          disabled={updating[item.id]}
                        />
                        <Button
                          onClick={() => handleUpdateEndDate(item)}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                          disabled={updating[item.id]}
                        >
                          {updating[item.id] ? t('saving') : t('save')}
                        </Button>
                      </div>
                    </div>
                  )}
                  {item.acceptedBid && (
                    <p className="text-sm text-green-700 font-medium mt-2 font-sans">
                      {t('acceptedBid', { amount: item.acceptedBid.bidAmount })}
                    </p>
                  )}
                  {item.status === 'declined' && (
                    <p className="text-sm text-red-600 font-medium mt-2 font-sans">{t('biddingCancelled')}</p>
                  )}
                  {item.bids && item.bids.length > 0 && item.status === 'active' && (
                    <div className="mt-6">
                      <h4 className="text-base font-semibold text-gray-700 mb-3 font-serif">{t('bidActivity')}</h4>
                      <ul className="space-y-3">
                        {item.bids
                          .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                          .map((bid, index) => (
                            <li
                              key={index}
                              className="flex justify-between items-center border-b border-gray-200 pb-2"
                            >
                              <span className="text-sm text-gray-600 font-sans">
                                {t('bidByBuyer', {
                                  bidAmount: bid.bidAmount,
                                  buyerId: bid.buyerId,
                                  timestamp: bid.timestamp.toDate().toLocaleString(),
                                })}
                              </span>
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleAcceptBidWithStatus(item, bid)}
                                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded-lg text-xs font-sans"
                                  disabled={updating[item.id]}
                                >
                                  {t('accept')}
                                </Button>
                                <Button
                                  onClick={() => handleDeclineBid(item, bid)}
                                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-lg text-xs font-sans"
                                  disabled={updating[item.id]}
                                >
                                  {t('decline')}
                                </Button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ActiveBids;