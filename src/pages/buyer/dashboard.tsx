import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from "firebase/firestore";
import {  FaShoppingCart, FaMoneyBillWave, FaGavel, FaBox, FaList } from "react-icons/fa";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Order {
  id: string;
  productName: string;
  farmerName: string;
  amount: number;
  timestamp: any;
  status: string;
}

interface BidDetail {
  bidItemId: string;
  productName: string;
  bidAmount: number;
  status: string;
  bidPlacedAt: any;
}

interface MonthlySpending {
  month: string;
  amount: number;
}

interface GrainComparison {
  grain: string;
  msp: number; // MSP in ₹/quintal
  marketPrice: number; // Market price in ₹/quintal
  difference: number; // Percentage difference
}

const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [ordersPlaced, setOrdersPlaced] = useState(0);
  const [itemsInCart, setItemsInCart] = useState(0);
  const [activeBids, setActiveBids] = useState(0);
  const [bidsParticipated, setBidsParticipated] = useState(0);
  const [bidExpenses, setBidExpenses] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [bidDetails, setBidDetails] = useState<BidDetail[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [grainComparisons, setGrainComparisons] = useState<GrainComparison[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log("Starting fetchDashboardData...");
      console.log("User:", user);

      if (!user || !user.uid) {
        console.warn("No user or user.uid found. Aborting fetch.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Step 1: Fetch orders placed by the buyer
        console.log("Fetching orders for buyerId:", user.uid);
        const ordersQuery = query(
          collection(db, "orders"),
          where("buyerId", "==", user.uid)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        console.log("Orders snapshot empty?", ordersSnapshot.empty);
        console.log("Orders snapshot size:", ordersSnapshot.size);
        console.log("Orders snapshot docs:", ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        let totalSpentAmount = 0;
        ordersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.totalAmount) {
            totalSpentAmount += data.totalAmount;
            console.log(`Order ${doc.id} totalAmount added to totalSpent:`, data.totalAmount);
          }
        });
        setOrdersPlaced(ordersSnapshot.size);
        setTotalSpent(totalSpentAmount);
        console.log("Set ordersPlaced:", ordersSnapshot.size);
        console.log("Set totalSpent:", totalSpentAmount);

        // Step 2: Fetch items in cart
        console.log("Fetching cart items for buyerId:", user.uid);
        const cartQuery = query(
          collection(db, "cart"),
          where("buyerId", "==", user.uid)
        );
        const cartSnapshot = await getDocs(cartQuery);

        let cartItemCount = 0;
        cartSnapshot.forEach(doc => {
          const data = doc.data();
          cartItemCount += data.quantity || 1; // Assume quantity field, default to 1 if missing
          console.log(`Cart item ${doc.id} quantity:`, data.quantity || 1);
        });
        setItemsInCart(cartItemCount);
        console.log("Set itemsInCart:", cartItemCount);

        // Step 3: Fetch bidding details (active bids, bids participated, bid expenses, and bid details table)
        console.log("Fetching bidItems for bidding details by buyerId:", user.uid);
        const bidItemsQuery = query(collection(db, "bidItems"));
        const bidItemsSnapshot = await getDocs(bidItemsQuery);
        console.log("BidItems snapshot empty?", bidItemsSnapshot.empty);
        console.log("BidItems snapshot size:", bidItemsSnapshot.size);
        console.log("BidItems snapshot docs:", bidItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        let activeBidsCount = 0;
        let bidsParticipatedCount = 0;
        let totalBidExpenses = 0;
        const bidDetailsData: BidDetail[] = [];

        bidItemsSnapshot.forEach(doc => {
          const data = doc.data();
          const bids = data.bids || [];
          const buyerBids = bids.filter((bid: any) => bid.buyerId === user.uid);

          // Check if the buyer has participated in this bidItem
          let hasParticipated = false;
          let bidAmountToUse = 0;
          let bidTimestamp = null;

          // Check if the bid was accepted and the buyer is the one whose bid was accepted
          if (data.acceptedBid && data.acceptedBid.buyerId === user.uid) {
            hasParticipated = true;
            bidAmountToUse = data.acceptedBid.bidAmount || 0;
            bidTimestamp = data.acceptedBid.acceptedAt || null;
            console.log(`BidItem ${doc.id} has an accepted bid by the buyer, bidAmount:`, bidAmountToUse);
          } else if (buyerBids.length > 0) {
            // If no accepted bid matches the buyer, use the buyer's bids from the bids array
            hasParticipated = true;
            buyerBids.forEach((bid: any) => {
              if (bid.bidAmount) {
                bidAmountToUse = bid.bidAmount; // Use the last bid amount for display
                bidTimestamp = bid.timestamp || null;
                console.log(`BidItem ${doc.id} bid by buyer (non-accepted), bidAmount:`, bidAmountToUse);
              }
            });
          }

          if (hasParticipated) {
            bidsParticipatedCount += 1; // Count the bidItem as a participated bid
            totalBidExpenses += bidAmountToUse; // Add the bid amount to expenses
            console.log(`BidItem ${doc.id} participated by buyer, totalBidExpenses updated:`, totalBidExpenses);

            // If the bidItem is active, count it towards activeBids
            if (data.status === "active") {
              activeBidsCount += 1;
              console.log(`BidItem ${doc.id} is active and has a bid by the buyer`);
            }

            // Add to bid details table
            bidDetailsData.push({
              bidItemId: doc.id,
              productName: data.itemName || "Unknown Product",
              bidAmount: bidAmountToUse,
              status: data.status || "Unknown",
              bidPlacedAt: bidTimestamp,
            });
          }
        });

        setActiveBids(activeBidsCount);
        setBidsParticipated(bidsParticipatedCount);
        setBidExpenses(totalBidExpenses);
        setBidDetails(bidDetailsData);
        console.log("Set activeBids:", activeBidsCount);
        console.log("Set bidsParticipated:", bidsParticipatedCount);
        console.log("Set bidExpenses:", totalBidExpenses);
        console.log("Set bidDetails:", bidDetailsData);

        // Step 4: Use dummy data for monthly spending (January to May 2025)
        const dummyMonthlySpending: MonthlySpending[] = [
          { month: "Jan 2025", amount: 8000 },
          { month: "Feb 2025", amount: 9500 },
          { month: "Mar 2025", amount: 12000 },
          { month: "Apr 2025", amount: 7000 },
          { month: "May 2025", amount: 11000 },
        ];
        setMonthlySpending(dummyMonthlySpending);
        console.log("Set monthlySpending (dummy data):", dummyMonthlySpending);

        // Step 5: Market analysis for grain items (rice, wheat) compared to MSP
        const wheatMSP2022 = 2015;
        const wheatMSP2025 = Math.round(wheatMSP2022 * Math.pow(1.05, 3)); // ₹2317
        const riceMSP2022 = 2040;
        const riceMSP2025 = Math.round(riceMSP2022 * Math.pow(1.05, 3)); // ₹2346
        const wheatMarketPrice = 2450;
        const riceMarketPrice = 2200;

        const grainData: GrainComparison[] = [
          {
            grain: "Wheat",
            msp: wheatMSP2025,
            marketPrice: wheatMarketPrice,
            difference: ((wheatMarketPrice - wheatMSP2025) / wheatMSP2025) * 100,
          },
          {
            grain: "Rice",
            msp: riceMSP2025,
            marketPrice: riceMarketPrice,
            difference: ((riceMarketPrice - riceMSP2025) / riceMSP2025) * 100,
          },
        ];
        setGrainComparisons(grainData);
        console.log("Set grainComparisons:", grainData);

        // Step 6: Fetch recent orders (limit to 5)
        console.log("Fetching recent orders for buyerId:", user.uid);
        const recentOrdersQuery = query(
          collection(db, "orders"),
          where("buyerId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
        console.log("Recent orders snapshot empty?", recentOrdersSnapshot.empty);
        console.log("Recent orders snapshot size:", recentOrdersSnapshot.size);
        console.log("Recent orders snapshot docs:", recentOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const recentOrdersData: Order[] = [];
        for (const orderDoc of recentOrdersSnapshot.docs) {
          const data = orderDoc.data();
          console.log("Processing recent order:", { id: orderDoc.id, data });

          // Determine order status
          const deliveryDetails = data.deliveryDetails || [];
          const isDelivered = deliveryDetails.some(
            (detail: any) => detail.deliveredOrder === true
          );
          const orderStatus = isDelivered ? "Delivered" : data.status === "pending" ? "Pending" : "Other";

          // Get product details from items array
          const firstItem = data.items && data.items.length > 0 ? data.items[0] : {};

          // Fetch farmer name using ownerUserId from items
          let farmerName = "Unknown";
          if (firstItem.id) {
            try {
              const itemDocRef = doc(db, "items", firstItem.id);
              const itemDoc = await getDoc(itemDocRef);
              if (itemDoc.exists()) {
                const itemData = itemDoc.data();
                const ownerUserId = itemData.ownerUserId;
                if (ownerUserId) {
                  const farmerDocRef = doc(db, "farmer", ownerUserId);
                  const farmerDoc = await getDoc(farmerDocRef);
                  if (farmerDoc.exists()) {
                    const farmerData = farmerDoc.data() as { fullName?: string };
                    farmerName = farmerData.fullName || "Unknown";
                    console.log(`Farmer name for ownerUserId ${ownerUserId}:`, farmerName);
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching farmer details for item ${firstItem.id}:`, error);
            }
          }

          const order: Order = {
            id: orderDoc.id,
            productName: firstItem.name || "Unknown Product",
            farmerName,
            amount: firstItem.totalAmount || 0,
            timestamp: data.createdAt,
            status: orderStatus,
          };

          recentOrdersData.push(order);
        }
        setRecentOrders(recentOrdersData);
        console.log("Set recentOrders:", recentOrdersData);
      } catch (error) {
        console.error("Error in fetchDashboardData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Metrics for display, reordered to group bid-related metrics in the second row
  const metrics = [
    { icon: <FaBox className="text-green-600 text-3xl" />, title: "Orders Placed", value: ordersPlaced },
    { icon: <FaShoppingCart className="text-green-600 text-3xl" />, title: "Items in Cart", value: itemsInCart },
    { icon: <FaMoneyBillWave className="text-green-600 text-3xl" />, title: "Order Expenses (₹)", value: totalSpent },
    { icon: <FaGavel className="text-green-600 text-3xl" />, title: "Active Bids", value: activeBids },
    { icon: <FaList className="text-green-600 text-3xl" />, title: "Bids Participated In", value: bidsParticipated },
    { icon: <FaMoneyBillWave className="text-green-600 text-3xl" />, title: "Bid Expenses (₹)", value: bidExpenses },
  ];

  // Chart data for Amount vs. Month
  const chartData = {
    labels: monthlySpending.map(spend => spend.month),
    datasets: [
      {
        label: "Spending Amount (₹)",
        data: monthlySpending.map(spend => spend.amount),
        backgroundColor: "#16a34a",
        borderColor: "#15803d",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Monthly Spending (Amount vs. Month)",
        font: {
          size: 18,
          weight: "bold" as const,
        },
        color: "#1f2937",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#4b5563",
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: "#4b5563",
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        title: {
          display: true,
          text: "Spending Amount (₹)",
          color: "#4b5563",
        },
      },
    },
  };

  return (
    <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-5 text-gray-800">
            Dashboard
          </h1>
        

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 flex items-center space-x-4 min-h-[150px]"
            >
              <div>{metric.icon}</div>
              <div>
                <h3 className="text-gray-800 font-medium text-lg">{metric.title}</h3>
                <p className="text-2xl font-bold text-gray-700">
                  {loading ? (
                    <span className="animate-pulse bg-gray-200 h-8 w-16 inline-block rounded"></span>
                  ) : (
                    metric.value
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          {loading ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          ) : monthlySpending.length > 0 ? (
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : (
            <p className="text-gray-500">No spending data available.</p>
          )}
        </div>

        {/* Market Analysis: Grain Price Comparison */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Market Analysis: Grain Price Comparison (MSP vs Market Price)
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : grainComparisons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {["Grain", "MSP (₹/quintal)", "Market Price (₹/quintal)", "Difference (%)"].map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-800"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grainComparisons.map((grain, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{grain.grain}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{grain.msp}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{grain.marketPrice}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {grain.difference.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No market analysis data available.</p>
          )}
        </div>

        {/* Bidding Details Table */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Bidding Details
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : bidDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {[
                      "Bid Item ID",
                      "Product Name",
                      "Bid Amount (₹)",
                      "Status",
                      "Bid Placed At",
                    ].map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-800"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bidDetails.map(bid => (
                    <tr key={bid.bidItemId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{bid.bidItemId}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{bid.productName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{bid.bidAmount}</td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bid.status === "active"
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {bid.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {bid.bidPlacedAt?.toDate
                          ? bid.bidPlacedAt.toDate().toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No bidding details available.</p>
          )}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Recent Orders
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {[
                      "Order ID",
                      "Date",
                      "Product",
                      "Farmer Name",
                      "Amount (₹)",
                      "Status",
                    ].map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-800"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{order.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {order.timestamp?.toDate
                          ? order.timestamp.toDate().toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{order.productName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{order.farmerName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{order.amount}</td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "Delivered"
                              ? "bg-green-100 text-green-600"
                              : order.status === "Pending"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No recent orders.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;