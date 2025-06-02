import { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import TrackOrderModal from '../../../components/ui/TrackOrderModal';
import { FaStar, FaPhone } from 'react-icons/fa';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BidItem {
  id: string;
  itemName: string;
  quantity: number;
  acceptedBid?: { buyerId: string; bidAmount: number };
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
  farmerRatings?: {
    deliveryPartnerRating: number;
    comment: string;
    ratedAt: any;
  };
}

interface BuyerDetails {
  [key: string]: { fullName: string };
}

interface DeliveryPartnerDetails {
  [key: string]: {
    fullName: string;
    phoneNumber?: string;
  };
}

interface DeliveryOffersProps {
  bidItems: BidItem[];
  buyerDetails: BuyerDetails;
  deliveryPartnerDetails: DeliveryPartnerDetails;
}

const DeliveryOffers = ({ bidItems, buyerDetails, deliveryPartnerDetails }: DeliveryOffersProps) => {
  const { t } = useTranslation();
  const [showAllItems, setShowAllItems] = useState(false);
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BidItem | null>(null);
  const [ratingItem, setRatingItem] = useState<BidItem | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [chatPartner, setChatPartner] = useState<{ partnerId: string; partnerName: string } | null>(null);

  const itemsWithDelivery = bidItems.filter(item => item.deliveryDetails && item.deliveryDetails.length > 0);
  const displayedItems = itemsWithDelivery.length > 3 && !showAllItems ? itemsWithDelivery.slice(0, 3) : itemsWithDelivery;

  const handleAcceptOffer = async (itemId: string, selectedOfferIndex: number) => {
    setLoadingOfferId(`${itemId}-${selectedOfferIndex}`);
    try {
      const itemRef = doc(db, 'bidItems', itemId);
      const item = itemsWithDelivery.find(item => item.id === itemId);
      if (!item || !item.deliveryDetails) return;

      const updatedDeliveryDetails = item.deliveryDetails.map((detail, index) => ({
        ...detail,
        acceptedForDelivery: index === selectedOfferIndex,
      }));

      await updateDoc(itemRef, {
        deliveryDetails: updatedDeliveryDetails,
      });

      const updatedItems = bidItems.map(bidItem =>
        bidItem.id === itemId
          ? { ...bidItem, deliveryDetails: updatedDeliveryDetails }
          : bidItem
      );
      console.log('Updated bidItems:', updatedItems);
    } catch (error) {
      console.error('Error accepting delivery offer:', error);
    } finally {
      setLoadingOfferId(null);
    }
  };

  const handleTrackOrder = (item: BidItem) => {
    setSelectedItem(item);
  };

  const handleRateDeliveryPartner = (item: BidItem) => {
    setRatingItem(item);
    setRating(0);
    setComment('');
  };

  const handleOpenChat = (partnerId: string, partnerName: string) => {
    setChatPartner({ partnerId, partnerName });
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  const closeRatingModal = () => {
    setRatingItem(null);
  };

  const closeChatModal = () => {
    setChatPartner(null);
  };

  const handleSubmitRating = async () => {
    if (!ratingItem || rating === 0) return;

    setSubmittingRating(true);
    try {
      const itemRef = doc(db, 'bidItems', ratingItem.id);
      const farmerRatings = {
        deliveryPartnerRating: rating,
        comment: comment.trim(),
        ratedAt: Timestamp.now(),
      };

      await updateDoc(itemRef, { farmerRatings });

      const updatedItems = bidItems.map(bidItem =>
        bidItem.id === ratingItem.id
          ? { ...bidItem, farmerRatings }
          : bidItem
      );
      console.log('Updated bidItems with farmer ratings:', updatedItems);

      closeRatingModal();
    } catch (error) {
      console.error('Error submitting farmer rating:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  const isDelivered = (item: BidItem) => {
    const acceptedDelivery = item.deliveryDetails?.find(detail => detail.acceptedForDelivery);
    return acceptedDelivery?.deliveredOrder === true;
  };

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">{t('deliveryPartnerOffers')}</h2>
      {itemsWithDelivery.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">{t('noDeliveryOffers')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2 font-serif">{item.itemName}</h3>
                <p className="text-sm text-gray-600 mb-2 font-sans">{t('quantity')} {item.quantity}</p>
                {item.acceptedBid && (
                  <p className="text-sm text-gray-600 mb-2 font-sans">
                    {t('acceptedBidBy', {
                      bidAmount: item.acceptedBid.bidAmount,
                      buyerName: buyerDetails[item.acceptedBid.buyerId]?.fullName || 'Loading...',
                    })}
                  </p>
                )}
                <h4 className="text-base font-semibold text-gray-700 mb-3 font-serif">{t('deliveryOffers')}</h4>
                <ul className="space-y-3">
                  {item.deliveryDetails!.map((detail, index) => (
                    <li key={index} className="text-sm text-gray-600 font-sans flex items-center justify-between">
                      <span>
                        {t('deliveryOffer', {
                          amount: detail.amount,
                          partnerName: deliveryPartnerDetails[detail.deliveryPartnerId]?.fullName || 'Loading...',
                          lockedAt: detail.lockedAt.toDate().toLocaleString(),
                        })}
                      </span>
                      <button
                        onClick={() => handleAcceptOffer(item.id, index)}
                        disabled={detail.acceptedForDelivery || loadingOfferId === `${item.id}-${index}`}
                        className={`ml-2 px-3 py-1 rounded-lg text-sm font-sans ${
                          detail.acceptedForDelivery
                            ? 'bg-green-200 text-green-800 cursor-not-allowed'
                            : loadingOfferId === `${item.id}-${index}`
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {detail.acceptedForDelivery ? t('accepted') : t('acceptOffer')}
                      </button>
                    </li>
                  ))}
                </ul>
                {item.deliveryDetails!.map((detail, index) => (
                  <div
                    key={`contact-${index}`}
                    className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200"
                  >
                    <div className="flex items-center space-x-2">
                      <FaPhone className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 font-sans">
                        {t('contactDeliveryPartner', { partnerName: deliveryPartnerDetails[detail.deliveryPartnerId]?.fullName || 'Delivery Partner' })}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={`tel:${deliveryPartnerDetails[detail.deliveryPartnerId]?.phoneNumber || ''}`}
                        className={`text-sm font-sans px-3 py-1 rounded-lg ${
                          deliveryPartnerDetails[detail.deliveryPartnerId]?.phoneNumber
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {deliveryPartnerDetails[detail.deliveryPartnerId]?.phoneNumber
                          ? t('callNow')
                          : t('numberUnavailable')}
                      </a>
                      <button
                        onClick={() =>
                          handleOpenChat(
                            detail.deliveryPartnerId,
                            deliveryPartnerDetails[detail.deliveryPartnerId]?.fullName || 'Delivery Partner'
                          )
                        }
                        className="text-sm font-sans px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <MessageCircle className="h-6 w-6 inline-block" />
                      </button>
                    </div>
                  </div>
                ))}
                {item.deliveryDetails?.some(detail => detail.acceptedForDelivery) && (
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => handleTrackOrder(item)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                    >
                      {t('trackOrder')}
                    </button>
                    {isDelivered(item) && !item.farmerRatings && (
                      <button
                        onClick={() => handleRateDeliveryPartner(item)}
                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                      >
                        {t('rateDeliveryPartner')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {itemsWithDelivery.length > 3 && !showAllItems && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowAllItems(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg text-base font-sans"
              >
                {t('viewMore')}
              </button>
            </div>
          )}
        </>
      )}

      {showAllItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-2xl p-8 max-w-7xl w-full max-h-[80vh] overflow-y-auto relative scrollbar-hide"
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{t('allDeliveryOffers')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {itemsWithDelivery.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 font-serif">{item.itemName}</h3>
                  <p className="text-sm text-gray-600 mb-2 font-sans">{t('quantity')} {item.quantity}</p>
                  {item.acceptedBid && (
                    <p className="text-sm text-gray-600 mb-2 font-sans">
                      {t('acceptedBidBy', {
                        bidAmount: item.acceptedBid.bidAmount,
                        buyerName: buyerDetails[item.acceptedBid?.buyerId]?.fullName || 'Loading...',
                      })}
                    </p>
                  )}
                  <h4 className="text-base font-semibold text-gray-700 mb-3 font-serif">{t('deliveryOffers')}</h4>
                  <ul className="space-y-3">
                    {item.deliveryDetails!.map((detail, index) => (
                      <li key={index} className="text-sm text-gray-600 font-sans flex items-center justify-between">
                        <span>
                          {t('deliveryOffer', {
                            amount: detail.amount,
                            partnerName: deliveryPartnerDetails[detail.deliveryPartnerId]?.fullName || 'Loading...',
                            lockedAt: detail.lockedAt.toDate().toLocaleString(),
                          })}
                        </span>
                        <button
                          onClick={() => handleAcceptOffer(item.id, index)}
                          disabled={detail.acceptedForDelivery || loadingOfferId === `${item.id}-${index}`}
                          className={`ml-2 px-3 py-1 rounded-lg text-sm font-sans ${
                            detail.acceptedForDelivery
                              ? 'bg-green-200 text-green-800 cursor-not-allowed'
                              : loadingOfferId === `${item.id}-${index}`
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {detail.acceptedForDelivery ? t('accepted') : t('acceptOffer')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {item.deliveryDetails!.map((detail, index) => (
                    <div
                      key={`contact-${index}`}
                      className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200"
                    >
                      <div className="flex items-center space-x-2">
                        <FaPhone className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700 font-sans">
                          {t('contactDeliveryPartner', { partnerName: deliveryPartnerDetails[detail.deliveryPartnerId]?.fullName || 'Delivery Partner' })}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={`tel:${deliveryPartnerDetails[detail.deliveryPartnerId]?.phoneNumber || ''}`}
                          className={`text-sm font-sans px-3 py-1 rounded-lg ${
                            deliveryPartnerDetails[detail.deliveryPartnerId]?.phoneNumber
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {deliveryPartnerDetails[detail.deliveryPartnerId]?.phoneNumber
                            ? t('callNow')
                            : t('numberUnavailable')}
                        </a>
                        <button
                          onClick={() =>
                            handleOpenChat(
                              detail.deliveryPartnerId,
                              deliveryPartnerDetails[detail.deliveryPartnerId]?.fullName || 'Delivery Partner'
                            )
                          }
                          className="text-sm font-sans px-3 py-1 rounded-lg bg-blue-600 text-white font-blue-700"
                        >
                          <MessageCircle className="h-4 w-4 inline-block" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {item.deliveryDetails?.some(detail => detail.acceptedForDelivery) && (
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleTrackOrder(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                      >
                        {t('trackOrder')}
                      </button>
                      {isDelivered(item) && !item.farmerRatings && (
                        <button
                          onClick={() => handleRateDeliveryPartner(item)}
                          className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                        >
                          {t('rateDeliveryPartner')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <TrackOrderModal
          order={{
            id: selectedItem.id,
            name: selectedItem.itemName || 'Order',
            trackingDetails: selectedItem.deliveryDetails || [],
          }}
          onClose={closeModal}
        />
      )}

      {ratingItem && (
        <div className="fixed inset-0 bg-gradient-to-b from-green-0 to-green-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={closeRatingModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{t('rateDeliveryPartnerTitle')}</h2>
            <p className="text-sm text-gray-600 mb-4 font-sans">
              {t('item', { itemName: ratingItem.itemName })}
            </p>
            <p className="text-sm text-gray-600 mb-4 font-sans">
              {t('deliveryPartner', { 
                partnerName: deliveryPartnerDetails[ratingItem.deliveryDetails?.find(detail => detail.acceptedForDelivery)?.deliveryPartnerId || '']?.fullName || 'Loading...'
              })}
            </p>
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={`h-6 w-6 cursor-pointer ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('addComment')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-sans text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeRatingModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg text-sm font-sans"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={submittingRating || rating === 0}
                className={`${
                  submittingRating || rating === 0
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } font-medium py-2 px-4 rounded-lg text-sm font-sans`}
              >
                {submittingRating ? t('submitting') : t('submitRating')}
              </button>
            </div>
          </div>
        </div>
      )}

      {chatPartner && (
        <div className="fixed inset-0 bg-gradient-to-b from-green-0 to-green-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] min-h-[80vh] flex flex-col relative scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <button
              onClick={closeChatModal}
              className="absolute top-4 right-4-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 font-serif">
              {t('chatWithDeliveryPartner', { partnerName: chatPartner.partnerName })}
            </h2>
            <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center text-gray-600 text-sm font-sans">
                {t('chatWithDeliveryPartner', { partnerName: chatPartner.partnerName })}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={t('typeMessage')}
                disabled
                className="flex-1 p-3 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:ring-2 focus:ring-green-600 cursor-not-allowed"
              />
              <button
                disabled
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-sans text-sm cursor-not-allowed"
              >
                {t('send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeliveryOffers;