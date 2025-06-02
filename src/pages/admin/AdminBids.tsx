import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, doc, getDoc, deleteDoc } from "firebase/firestore";
import { FaGavel, FaMoneyBillWave, FaLock, FaLockOpen, FaMoneyCheckAlt, FaWallet, FaUser, FaClock } from "react-icons/fa";
import AdminSidebar from "./adminSidebar";

// Interface for Bid Item data
interface BidItem {
  id: string;
  itemName: string;
  farmerName: string;
  acceptedBidAmount: number | null;
  buyerName: string;
  status: string;
  createdDate: string;
  ownerUserId: string;
  createdTimestamp: any;
}

const AdminBids: React.FC = () => {
  const navigate = useNavigate();
  const [bidItems, setBidItems] = useState<BidItem[]>([]);
  const [totalBids, setTotalBids] = useState(0);
  const [openBids, setOpenBids] = useState(0);
  const [closedBids, setClosedBids] = useState(0);
  const [totalBidRevenue, setTotalBidRevenue] = useState(0);
  const [averageBidAmount, setAverageBidAmount] = useState(0);
  const [highestBidAmount, setHighestBidAmount] = useState(0);
  const [activeFarmers, setActiveFarmers] = useState(0);
  const [bidsClosingSoon, setBidsClosingSoon] = useState(0);
  const [loading, setLoading] = useState(true);

  // Function to get color class based on bid status (updated colors)
  const getStatusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-orange-300 text-orange-900"; // Orange for Open
      case "accepted":
        return "bg-blue-300 text-blue-900"; // Blue for Accepted
      case "declined":
        return "bg-red-300 text-red-900"; // Red for Declined
      case "closed":
        return "bg-green-300 text-green-900"; // Green for Closed
      default:
        return "bg-gray-200 text-gray-800"; // Default gray
    }
  };

  // Function to delete a bid item
  const handleDelete = async (bidItemId: string) => {
    if (window.confirm("Are you sure you want to delete this bid item?")) {
      try {
        await deleteDoc(doc(db, "bidItems", bidItemId));
        setBidItems(bidItems.filter(bid => bid.id !== bidItemId));
        // Recalculate metrics after deletion
        const updatedBids = bidItems.filter(bid => bid.id !== bidItemId);
        setTotalBids(updatedBids.length);
        setOpenBids(updatedBids.filter(bid => bid.status.toLowerCase() === "open").length);
        setClosedBids(updatedBids.filter(bid => bid.status.toLowerCase() === "closed").length);
        setTotalBidRevenue(updatedBids.reduce((sum, bid) => sum + (bid.acceptedBidAmount || 0), 0));

        // Recalculate new metrics
        const closedBidsList = updatedBids.filter(bid => bid.status.toLowerCase() === "closed" && bid.acceptedBidAmount !== null);
        const totalAcceptedAmount = closedBidsList.reduce((sum, bid) => sum + (bid.acceptedBidAmount || 0), 0);
        setAverageBidAmount(closedBidsList.length > 0 ? totalAcceptedAmount / closedBidsList.length : 0);
        setHighestBidAmount(closedBidsList.length > 0 ? Math.max(...closedBidsList.map(bid => bid.acceptedBidAmount || 0)) : 0);
        setActiveFarmers([...new Set(updatedBids.filter(bid => bid.status.toLowerCase() === "open").map(bid => bid.ownerUserId))].length);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        setBidsClosingSoon(updatedBids.filter(bid => bid.status.toLowerCase() === "open" && bid.createdTimestamp?.toDate() >= sevenDaysAgo).length);
      } catch (error) {
        console.error("Error deleting bid item:", error);
        alert("Failed to delete bid item. Please try again.");
      }
    }
  };

  // Fetch bid items and calculate metrics
  useEffect(() => {
    const fetchBidItemsData = async () => {
      setLoading(true);
      try {
        // Fetch Bid Items
        const bidItemsQuery = query(collection(db, "bidItems"));
        const bidItemsSnapshot = await getDocs(bidItemsQuery);
        const bidItemsList: BidItem[] = [];
        let openCount = 0;
        let closedCount = 0;
        let totalRevenue = 0;

        for (const bidDoc of bidItemsSnapshot.docs) {
          const bidData = bidDoc.data();

          // Initialize default values
          let itemName = bidData.itemName || "Unknown";
          let farmerName = "Unknown";
          let acceptedBidAmount: number | null = null;
          let buyerName = "Not Assigned";
          let status = bidData.status || "Open";
          const createdDate = bidData.createdAt?.toDate
            ? bidData.createdAt.toDate().toLocaleDateString()
            : "N/A";
          const createdTimestamp = bidData.createdAt;
          const ownerUserId = bidData.ownerUserId || "";

          // Fetch Farmer Name
          if (bidData.ownerUserId) {
            const farmerDoc = await getDoc(doc(db, "farmer", bidData.ownerUserId));
            if (farmerDoc.exists()) {
              const farmerData = farmerDoc.data();
              farmerName = farmerData.fullName || "Unknown";
            }
          }

          // Fetch Accepted Bid Details and Update Status
          if (bidData.acceptedBid) {
            acceptedBidAmount = bidData.acceptedBid.bidAmount || 0;
            totalRevenue += acceptedBidAmount ?? 0;
            if (bidData.acceptedBid.buyerId) {
              const buyerDoc = await getDoc(doc(db, "buyer", bidData.acceptedBid.buyerId));
              if (buyerDoc.exists()) {
                const buyerData = buyerDoc.data();
                buyerName = buyerData.fullName || "Unknown";
              }
            }
            // If the bid has an acceptedBid and status is not "Closed" or "Declined", set status to "Accepted"
            if (status.toLowerCase() !== "closed" && status.toLowerCase() !== "declined") {
              status = "Accepted";
            }
          }

          // Update Metrics
          if (status.toLowerCase() === "open") openCount++;
          else if (status.toLowerCase() === "closed") closedCount++;

          bidItemsList.push({
            id: bidDoc.id,
            itemName,
            farmerName,
            acceptedBidAmount,
            buyerName,
            status,
            createdDate,
            ownerUserId,
            createdTimestamp,
          });
        }

        // Calculate Additional Metrics
        const closedBidsList = bidItemsList.filter(bid => bid.status.toLowerCase() === "closed" && bid.acceptedBidAmount !== null);
        const totalAcceptedAmount = closedBidsList.reduce((sum, bid) => sum + (bid.acceptedBidAmount || 0), 0);
        const avgBidAmount = closedBidsList.length > 0 ? totalAcceptedAmount / closedBidsList.length : 0;
        const maxBidAmount = closedBidsList.length > 0 ? Math.max(...closedBidsList.map(bid => bid.acceptedBidAmount || 0)) : 0;
        const activeFarmersCount = [...new Set(bidItemsList.filter(bid => bid.status.toLowerCase() === "open").map(bid => bid.ownerUserId))].length;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const bidsClosingSoonCount = bidItemsList.filter(bid => bid.status.toLowerCase() === "open" && bid.createdTimestamp?.toDate() >= sevenDaysAgo).length;

        // Set Metrics
        setTotalBids(bidItemsSnapshot.size);
        setOpenBids(openCount);
        setClosedBids(closedCount);
        setTotalBidRevenue(totalRevenue);
        setAverageBidAmount(avgBidAmount);
        setHighestBidAmount(maxBidAmount);
        setActiveFarmers(activeFarmersCount);
        setBidsClosingSoon(bidsClosingSoonCount);

        // Sort bid items by createdDate (most recent first)
        bidItemsList.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        setBidItems(bidItemsList);
      } catch (error) {
        console.error("Error fetching bid items data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBidItemsData();
  }, []);

  // Metrics for display
  const metrics = [
    {
      icon: <FaGavel className="text-green-500 text-2xl" />,
      title: "Total Bids",
      value: totalBids,
      change: 5.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaLockOpen className="text-green-500 text-2xl" />,
      title: "Open Bids",
      value: openBids,
      change: 2.0,
      changeDirection: "down",
      changeText: "Last Month",
    },
    {
      icon: <FaLock className="text-green-500 text-2xl" />,
      title: "Closed Bids",
      value: closedBids,
      change: 3.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaMoneyBillWave className="text-green-500 text-2xl" />,
      title: "Total Bid Revenue",
      value: (totalBidRevenue / 1000).toFixed(1) + "k",
      change: 6.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaMoneyCheckAlt className="text-green-500 text-2xl" />,
      title: "Average Bid Amount",
      value: averageBidAmount.toFixed(0),
      change: 2.5,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaWallet className="text-green-500 text-2xl" />,
      title: "Highest Bid Amount",
      value: highestBidAmount,
      change: 3.5,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaUser className="text-green-500 text-2xl" />,
      title: "Active Farmers",
      value: activeFarmers,
      change: 1.5,
      changeDirection: "down",
      changeText: "Last Month",
    },
    {
      icon: <FaClock className="text-green-500 text-2xl" />,
      title: "Bids Closing Soon",
      value: bidsClosingSoon,
      change: 4.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Bids</h1>
          </div>

          {/* Metrics Section (4 per row on large screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4 transition-transform hover:scale-105"
              >
                <div className="p-3 bg-green-100 rounded-full">{metric.icon}</div>
                <div>
                  <h3 className="text-gray-600 font-medium text-sm">{metric.title}</h3>
                  <p className="text-3xl font-bold text-gray-800">
                    {loading ? (
                      <span className="animate-pulse bg-gray-200 h-8 w-16 inline-block rounded"></span>
                    ) : (
                      metric.value
                    )}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span
                      className={`text-xs font-medium ${
                        metric.changeDirection === "up" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {metric.changeDirection === "up" ? "▲" : "▼"} {metric.change}%
                    </span>
                    <span className="text-xs text-gray-500">{metric.changeText}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Bid List</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : bidItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {[
                        "Bid Item ID",
                        "Item Name",
                        "Farmer",
                        "Accepted Bid Amount",
                        "Buyer",
                        "Status",
                        "Created Date",
                        "Actions",
                      ].map((header, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-800 bg-gray-50"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bidItems.map((bid, index) => (
                      <tr
                        key={bid.id}
                        className={`transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-100 cursor-pointer`}
                      >
                        <td
                          className="px-6 py-4 text-sm text-blue-600 underline"
                          onClick={() => navigate(`/admin/bids/${bid.id}`)}
                        >
                          {bid.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{bid.itemName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{bid.farmerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {bid.acceptedBidAmount !== null ? bid.acceptedBidAmount : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{bid.buyerName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                              bid.status
                            )}`}
                          >
                            {bid.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{bid.createdDate}</td>
                        <td className="px-6 py-4 text-sm flex space-x-2">
                          <button
                            onClick={() => navigate(`/admin/bids/edit/${bid.id}`)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                            title="Edit Bid"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(bid.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                            title="Delete Bid"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No bids found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBids;