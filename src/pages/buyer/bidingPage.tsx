import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Timestamp } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import {  FaShoppingCart, FaStore } from 'react-icons/fa';
import { ClipboardList, LayoutDashboard, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { BiTrendingUp } from 'react-icons/bi';
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
  acceptedBid?: { buyerId: string; bidAmount: number };
  status: string; // "active", "accepted", or "declined"
}

const BuyerBiddingPage = () => {
  const [bidItems, setBidItems] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmounts, setBidAmounts] = useState<{ [key: string]: number }>({});
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError("You need to be logged in to view this page");
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'bidItems'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BidItem[];
      // Filter for active items with no accepted bid
      const activeItems = itemsData.filter(item => item.status === 'active' && !item.acceptedBid);
      setBidItems(activeItems);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bid items:", err);
      setError("Failed to load bid items. Please try again later.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRaiseBid = async (item: BidItem) => {
    const bidAmount = bidAmounts[item.id] || 0;
    if (bidAmount <= item.basePrice) {
      alert(`Please enter a bid amount greater than the base price (₹${item.basePrice})`);
      return;
    }

    const existingBid = item.bids?.find(bid => bid.buyerId === user!.uid);
    if (existingBid && bidAmount <= existingBid.bidAmount) {
      alert(`Please enter a bid amount greater than your previous bid (₹${existingBid.bidAmount})`);
      return;
    }

    try {
      const itemRef = doc(db, 'bidItems', item.id);
      const newBid = {
        buyerId: user!.uid,
        bidAmount,
        timestamp: Timestamp.now()
      };

      if (existingBid) {
        await updateDoc(itemRef, {
          bids: arrayRemove(existingBid)
        });
      }

      await updateDoc(itemRef, {
        bids: arrayUnion(newBid)
      });

      setBidItems(bidItems.map(i =>
        i.id === item.id
          ? {
              ...i,
              bids: existingBid
                ? [...(i.bids?.filter(bid => bid.buyerId !== user!.uid) || []), newBid]
                : [...(i.bids || []), newBid]
            }
          : i
      ));
      alert(`Bid raised to ₹${bidAmount}`);
    } catch (err: any) {
      console.error("Error raising bid:", err);
      alert("Failed to raise bid. Please try again.");
    }
  };

  const handleWithdrawBid = async (item: BidItem) => {
    const myBid = item.bids?.find(bid => bid.buyerId === user!.uid);
    if (!myBid) {
      alert("You have not placed a bid on this item");
      return;
    }

    try {
      const itemRef = doc(db, 'bidItems', item.id);
      await updateDoc(itemRef, {
        bids: arrayRemove(myBid)
      });
      setBidItems(bidItems.map(i =>
        i.id === item.id ? { ...i, bids: i.bids?.filter(bid => bid.buyerId !== user!.uid) } : i
      ));
      setBidAmounts(prev => ({ ...prev, [item.id]: 0 }));
      alert("Bid withdrawn successfully");
    } catch (err: any) {
      console.error("Error withdrawing bid:", err);
      alert("Failed to withdraw bid. Please try again.");
    }
  };

  const isBiddingStarted = (startDate: any) => {
    const now = new Date();
    const biddingStart = startDate.toDate();
    return now >= biddingStart;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 font-sans">{error}</h2>
        </div>
      </div>
    );
  }
   const getMenuItems = () => {
    const commonItems = [
      {
        label: "Dashboard",
        onClick: () => navigate("/buyer/homepage"),
        icon: <LayoutDashboard className="text-white" />},
      {
        label: "Marketplace",
        onClick: () => navigate("/marketplace"),
        icon: <FaStore className="text-white" />
      },
      {
        label: "Orders",
        icon: (
          <div className="flex items-center">
            <FaShoppingCart className="text-white" />
           
          </div>
        ),
        onClick: () => navigate("/cart")
      },
       {
        label: "Purchase History",
        onClick: () => navigate("/purchase-history"),
        icon: <ClipboardList className="text-white" />
      },
      {
        label: "Biding Items",
        onClick: () => navigate("/buyer/biding"),
        icon: <BiTrendingUp className="text-white" />
      },
      {
        label: "Settings",
        onClick: () => navigate("/buyer/settings"),
        icon: <Settings className="text-white" />
      }
    ];

    return [
      ...commonItems,
    ];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Sidebar menuItems={getMenuItems()} />
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900 font-sans">
              Bidding Items
            </h1>
          </div>
      </div>

      {/* Bidding Items Section */}
      <section>
        {bidItems.length === 0 ? (
          <p className="text-gray-600 text-lg font-sans">No items available for bidding at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bidItems.map(item => (
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
                <p className="text-sm text-gray-600 mb-2 font-sans">Quantity: {item.quantity}</p>
                <p className="text-base font-medium text-gray-800 mb-2 font-sans">
                  Base Price: ₹{item.basePrice}
                </p>
                <p className="text-sm text-gray-600 font-sans">
                  Bidding Starts: {item.biddingStartDate.toDate().toLocaleString()}
                </p>
                {item.bids && item.bids.length > 0 && (
                  <p className="text-sm text-gray-600 font-sans">
                    Highest Bid: ₹{item.bids.sort((a, b) => b.bidAmount - a.bidAmount)[0].bidAmount}
                  </p>
                )}
                {item.bids?.some(bid => bid.buyerId === user!.uid) && (
                  <p className="text-sm text-green-700 font-medium mt-2 font-sans">
                    Your Bid: ₹{item.bids.find(bid => bid.buyerId === user!.uid)!.bidAmount}
                  </p>
                )}

                {/* Conditional Rendering for Bidding Actions */}
                {isBiddingStarted(item.biddingStartDate) ? (
                  <div className="mt-4 flex items-center space-x-3">
                    <input
                      type="number"
                      min={item.basePrice + 1}
                      value={bidAmounts[item.id] || ''}
                      onChange={(e) => setBidAmounts({ ...bidAmounts, [item.id]: Number(e.target.value) })}
                      placeholder={`Bid > ₹${item.basePrice}`}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-sans"
                    />
                    <Button
                      onClick={() => handleRaiseBid(item)}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                    >
                      Raise Bid
                    </Button>
                    <Button
                      onClick={() => handleWithdrawBid(item)}
                      className="border border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-medium py-2 px-4 rounded-lg text-sm font-sans"
                      disabled={!item.bids?.some(bid => bid.buyerId === user!.uid)}
                    >
                      Withdraw
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-600 font-sans">
                    Bidding opens at: {item.biddingStartDate.toDate().toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BuyerBiddingPage;