import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { FaPhone } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface BidItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  quantity: number;
  acceptedBid?: { buyerId: string; bidAmount: number; acceptedAt: any };
}

interface BuyerDetails {
  [key: string]: {
    fullName: string;
    address: string;
    phoneNumber?: string;
  };
}

interface AcceptedBidsProps {
  bidItems: BidItem[];
  buyerDetails: BuyerDetails;
}

const AcceptedBids = ({ bidItems, buyerDetails }: AcceptedBidsProps) => {
  const { t } = useTranslation();
  const [showAllItems, setShowAllItems] = useState(false);
  const [chatBuyer, setChatBuyer] = useState<{ buyerId: string; buyerName: string } | null>(null);

  const acceptedItems = bidItems.filter(item => item.acceptedBid);
  const displayedItems = acceptedItems.length > 3 && !showAllItems ? acceptedItems.slice(0, 3) : acceptedItems;

  const handleOpenChat = (buyerId: string, buyerName: string) => {
    setChatBuyer({ buyerId, buyerName });
  };

  const closeChatModal = () => {
    setChatBuyer(null);
  };

  return (
    <section className="py-8 relative">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">{t('acceptedBids')}</h2>
      {acceptedItems.length === 0 ? (
        <p className="text-gray-600 text-lg font-sans">{t('noAcceptedBids')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2 font-serif">{item.itemName}</h3>
                <p className="text-sm text-gray-600 mb-2 font-sans">
                  {t('buyerName')} {buyerDetails[item.acceptedBid!.buyerId]?.fullName || 'Loading...'}
                </p>
                <p className="text-sm text-gray-600 mb-2 font-sans">
                  {t('address')} {buyerDetails[item.acceptedBid!.buyerId]?.address || 'Loading...'}
                </p>
                <p className="text-sm text-gray-600 mb-2 font-sans">{t('quantity')} {item.quantity}</p>
                <p className="text-sm text-gray-600 mb-2 font-sans">
                  {t('bidAmount', { amount: item.acceptedBid!.bidAmount })}
                </p>
                <p className="text-sm text-gray-600 font-sans">
                  {t('acceptedAt')} {item.acceptedBid!.acceptedAt?.toDate().toLocaleString() || 'N/A'}
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FaPhone className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700 font-sans">
                      {t('contactBuyer', { buyerName: buyerDetails[item.acceptedBid!.buyerId]?.fullName || 'Buyer' })}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={`tel:${buyerDetails[item.acceptedBid!.buyerId]?.phoneNumber || ''}`}
                      className={`text-sm font-sans px-3 py-1 rounded-lg ${
                        buyerDetails[item.acceptedBid!.buyerId]?.phoneNumber
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {buyerDetails[item.acceptedBid!.buyerId]?.phoneNumber
                        ? t('callNow')
                        : t('numberUnavailable')}
                    </a>
                    <button
                      onClick={() =>
                        handleOpenChat(
                          item.acceptedBid!.buyerId,
                          buyerDetails[item.acceptedBid!.buyerId]?.fullName || 'Buyer'
                        )
                      }
                      className="text-sm font-sans px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <MessageCircle className="h-6 w-6 inline-block" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {acceptedItems.length > 3 && !showAllItems && (
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">{t('allAcceptedBids')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {acceptedItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 font-serif">{item.itemName}</h3>
                  <p className="text-sm text-gray-600 mb-2 font-sans">
                    {t('buyerName')} {buyerDetails[item.acceptedBid!.buyerId]?.fullName || 'Loading...'}
                  </p>
                  <p className="text-sm text-gray-600 mb-2 font-sans">
                    {t('address')} {buyerDetails[item.acceptedBid!.buyerId]?.address || 'Loading...'}
                  </p>
                  <p className="text-sm text-gray-600 mb-2 font-sans">{t('quantity')} {item.quantity}</p>
                  <p className="text-sm text-gray-600 mb-2 font-sans">
                    {t('bidAmount', { amount: item.acceptedBid!.bidAmount })}
                  </p>
                  <p className="text-sm text-gray-600 font-sans">
                    {t('acceptedAt')} {item.acceptedBid!.acceptedAt?.toDate().toLocaleString() || 'N/A'}
                  </p>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <FaPhone className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 font-sans">
                        {t('contactBuyer', { buyerName: buyerDetails[item.acceptedBid!.buyerId]?.fullName || 'Buyer' })}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={`tel:${buyerDetails[item.acceptedBid!.buyerId]?.phoneNumber || ''}`}
                        className={`text-sm font-sans px-3 py-1 rounded-lg ${
                          buyerDetails[item.acceptedBid!.buyerId]?.phoneNumber
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {buyerDetails[item.acceptedBid!.buyerId]?.phoneNumber
                          ? t('callNow')
                          : t('numberUnavailable')}
                      </a>
                      <button
                        onClick={() =>
                          handleOpenChat(
                            item.acceptedBid!.buyerId,
                            buyerDetails[item.acceptedBid!.buyerId]?.fullName || 'Buyer'
                          )
                        }
                        className="text-sm font-sans px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <MessageCircle className="h-4 w-4 inline-block" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {chatBuyer && (
        <div className="fixed inset-0 bg-gradient-to-b from-green-0 to-green-100 backdrop-blur-sm flex items-center justify-center z-50">
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
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 font-serif">
              {t('chatWithBuyer', { buyerName: chatBuyer.buyerName })}
            </h2>
            <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center text-gray-600 text-sm font-sans">
                {t('chatWithBuyer', { buyerName: chatBuyer.buyerName })}
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

export default AcceptedBids;