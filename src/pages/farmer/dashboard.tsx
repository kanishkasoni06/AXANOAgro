import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { db } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { FaGavel, FaTruck, FaHourglassHalf, FaWarehouse, FaStar, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface Order {
  id: string;
  productName: string;
  buyerId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  paymentType: string;
  status: string;
  totalAmount: number;
  timestamp: any;
  timestampDate: Date;
  quantity: number;
  source: "orders" | "bidItems";
}

interface MonthlySale {
  month: string;
  amount: number;
}

interface ProductSale {
  product: string;
  amount: number;
}

interface GrainComparison {
  grain: string;
  msp: number;
  marketPrice: number;
  difference: number;
}

const FarmerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bidItemsCount, setBidItemsCount] = useState(0);
  const [deliveredOrders, setDeliveredOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalStockQuantity, setTotalStockQuantity] = useState(0);
  const [averageRating, setAverageRating] = useState<string>("No ratings yet");
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [grainComparisons, setGrainComparisons] = useState<GrainComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format Date object to a readable string
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).replace(",", "");
  };

  // Handle accepting an order or bidItem
  const handleAcceptOrder = async (order: Order) => {
    try {
      const docRef = doc(db, order.source, order.id);
      await updateDoc(docRef, {
        status: "accepted",
        acceptedAt: Timestamp.fromDate(new Date()),
      });
      setRecentOrders((prev) =>
        prev.map((o) =>
          o.id === order.id && o.source === order.source ? { ...o, status: "accepted" } : o
        )
      );
      setPendingOrders((prev) => prev - 1);
    } catch (err) {
      console.error(`Error accepting ${order.source} ${order.id}:`, err);
      setError("Failed to accept order. Please try again.");
    }
  };

  // Handle declining an order or bidItem
  const handleDeclineOrder = async (order: Order) => {
    try {
      const docRef = doc(db, order.source, order.id);
      await updateDoc(docRef, {
        status: "declined",
      });
      setRecentOrders((prev) => prev.filter((o) => !(o.id === order.id && o.source === order.source)));
      setPendingOrders((prev) => prev - 1);
    } catch (err) {
      console.error(`Error declining ${order.source} ${order.id}:`, err);
      setError("Failed to decline order. Please try again.");
    }
  };

  // Fetch data from Firestore
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.uid) {
        setError("Please log in to view your dashboard.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Step 1: Fetch items owned by the farmer
        const itemsQuery = query(collection(db, "items"), where("ownerUserId", "==", user.uid));
        const itemsSnapshot = await getDocs(itemsQuery);

        let totalQuantity = 0;
        const farmerItemIds = new Set<string>();
        itemsSnapshot.forEach((doc) => {
          const data = doc.data();
          totalQuantity += Number(data.stock) || 0;
          farmerItemIds.add(doc.id);
        });
        setTotalStockQuantity(totalQuantity);

        // Step 2: Fetch bidItems for the farmer
        const bidItemsQuery = query(collection(db, "bidItems"), where("ownerUserId", "==", user.uid));
        const bidItemsSnapshot = await getDocs(bidItemsQuery);
        setBidItemsCount(bidItemsSnapshot.size);

        // Step 3: Process bidItems
        let deliveredFromBidItems = 0;
        let pendingFromBidItems = 0;
        let totalFarmerRatings = 0;
        let farmerRatingCount = 0;
        const bidItemOrders: Order[] = [];
        const processedOrderIds = new Set<string>();

        for (const bidDoc of bidItemsSnapshot.docs) {
          const data = bidDoc.data();
          const orderId = bidDoc.id;
          if (processedOrderIds.has(orderId)) continue;

          const firstItem = data.item || {};
          const timestampDate = data.createdAt ? data.createdAt.toDate() : new Date();
          let status = data.status || "Pending";
          const deliveryDetails = data.deliveryDetails || {};
          const isDelivered = deliveryDetails.deliveredOrder === true;

          if (isDelivered) {
            status = "Delivered";
            deliveredFromBidItems++;
          } else if (status.toLowerCase() === "pending") {
            pendingFromBidItems++;
          }

          if (data.ratings?.farmerRating && typeof data.ratings.farmerRating === "number") {
            totalFarmerRatings += data.ratings.farmerRating;
            farmerRatingCount++;
          }

          const order: Order = {
            id: orderId,
            productName: firstItem.name || "Unknown Item",
            buyerId: data.buyerId || "",
            customerName: "Unknown",
            email: "N/A",
            phone: "N/A",
            address: data.deliveryAddress || "N/A",
            paymentType: data.paymentType || "N/A",
            status,
            totalAmount: data.totalAmount || 0,
            timestamp: data.createdAt,
            timestampDate,
            quantity: data.quantity || 1,
            source: "bidItems",
          };

            if (order.buyerId) {
            try {
              const buyerDocRef = doc(db, "buyer", order.buyerId);
              const buyerDoc = await getDoc(buyerDocRef);
              if (buyerDoc.exists()) {
              const buyerData = buyerDoc.data() as {
                fullName?: string;
                email?: string;
                phone?: string;
                address?: string;
              };
              order.customerName = buyerData.fullName || "Unknown";
              order.email = buyerData.email || "N/A";
              order.phone = buyerData.phone || "N/A";
              order.address = buyerData.address || order.address;
              }
            } catch (err) {
              console.error(`Error fetching buyer for bidItem ${orderId}:`, err);
            }
            }

            // Do not add to recent orders if status is "active"
            if (status.toLowerCase() !== "active") {
            bidItemOrders.push(order);
            }
          processedOrderIds.add(orderId);
        }

        if (farmerRatingCount > 0) {
          setAverageRating(`${(totalFarmerRatings / farmerRatingCount).toFixed(1)} / 5`);
        }

        // Step 4: Fetch orders
        const ordersQuery = query(collection(db, "orders"));
        const ordersSnapshot = await getDocs(ordersQuery);

        let deliveredFromOrders = 0;
        let pendingFromOrders = 0;
        const regularOrders: Order[] = [];

        for (const orderDoc of ordersSnapshot.docs) {
          const data = orderDoc.data();
          const orderId = orderDoc.id;
          if (processedOrderIds.has(orderId)) continue;

          const items = data.items || [];
          const hasFarmerItem = items.some((item: any) => farmerItemIds.has(item.id));
          if (!hasFarmerItem) continue;

          let status = data.status || "Pending";
          const deliveryDetails = data.deliveryDetails || {};
          const isDelivered = deliveryDetails.deliveredOrder === true;
          if (isDelivered) {
            status = "Delivered";
            deliveredFromOrders++;
          } else if (status.toLowerCase() === "pending") {
            pendingFromOrders++;
          }

          const firstItem = items[0] || {};
          const timestampDate = data.createdAt ? data.createdAt.toDate() : new Date();

          const order: Order = {
            id: orderId,
            productName: firstItem.name || "Unknown Product",
            buyerId: data.buyerId || "",
            customerName: "Unknown",
            email: "N/A",
            phone: "N/A",
            address: data.deliveryAddress || "N/A",
            paymentType: data.paymentMethod || "N/A",
            status ,
            totalAmount: firstItem.totalAmount || data.totalAmount || 0,
            timestamp: data.createdAt,
            timestampDate,
            quantity: firstItem.quantity || 0,
            source: "orders",
          };

          if (order.buyerId) {
            try {
              const buyerDocRef = doc(db, "buyer", order.buyerId);
              const buyerDoc = await getDoc(buyerDocRef);
              if (buyerDoc.exists()) {
                const buyerData = buyerDoc.data();
                order.customerName = buyerData.fullName || "Unknown";
                order.email = buyerData.email || "N/A";
                order.phone = buyerData.phone || "N/A";
                order.address = buyerData.address || order.address;
              }
            } catch (err) {
              console.error(`Error fetching buyer for order ${orderId}:`, err);
            }
          }

          regularOrders.push(order);
          processedOrderIds.add(orderId);
        }

        // Combine and sort orders
        const combinedOrders = [...bidItemOrders, ...regularOrders];
        combinedOrders.sort((a, b) => {
          if (a.status.toLowerCase() === "pending" && b.status.toLowerCase() !== "pending") return -1;
          if (a.status.toLowerCase() !== "pending" && b.status.toLowerCase() === "pending") return 1;
          return b.timestampDate.getTime() - a.timestampDate.getTime();
        });
        setRecentOrders(combinedOrders.slice(0, 5));

        setDeliveredOrders(deliveredFromBidItems + deliveredFromOrders);
        setPendingOrders(pendingFromBidItems + pendingFromOrders);

        // Step 5: Dummy data for charts
        const dummyMonthlySales: MonthlySale[] = [
          { month: "Jan 2025", amount: 12000 },
          { month: "Feb 2025", amount: 15000 },
          { month: "Mar 2025", amount: 18000 },
          { month: "Apr 2025", amount: 10000 },
          { month: "May 2025", amount: 20000 },
        ];
        setMonthlySales(dummyMonthlySales);

        const dummyProductSales: ProductSale[] = [
          { product: "Wheat", amount: 25000 },
          { product: "Rice", amount: 18000 },
          { product: "Corn", amount: 15000 },
          { product: "Barley", amount: 10000 },
          { product: "Oats", amount: 8000 },
        ];
        setProductSales(dummyProductSales);

        // Step 6: Grain price comparison
        const wheatMSP2022 = 2015;
        const wheatMSP2025 = Math.round(wheatMSP2022 * Math.pow(1.05, 3));
        const riceMSP2022 = 2040;
        const riceMSP2025 = Math.round(riceMSP2022 * Math.pow(1.05, 3));
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
      } catch (error) {
        console.error("Error in fetchDashboardData:", error);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Metrics for display
  const metrics = [
    { icon: <FaGavel className="text-[#2CD14D] text-3xl" />, title: "Items in Bids", value: bidItemsCount },
    { icon: <FaTruck className="text-[#2CD14D] text-3xl" />, title: "Orders Delivered", value: deliveredOrders },
    { icon: <FaHourglassHalf className="text-[#2CD14D] text-3xl" />, title: "Orders Pending", value: pendingOrders },
    { icon: <FaWarehouse className="text-[#2CD14D] text-3xl" />, title: "Items in Stock", value: totalStockQuantity },
    { icon: <FaStar className="text-yellow-500 text-3xl" />, title: "Farmer Rating", value: averageRating },
  ];

  // Chart data for Amount vs. Month
  const barChartData = {
    labels: monthlySales.map((sale) => sale.month),
    datasets: [
      {
        label: "Total Amount (₹)",
        data: monthlySales.map((sale) => sale.amount),
        backgroundColor: "#2CD14D",
        borderColor: "#24B042",
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Monthly Sales (Amount vs. Month)",
        font: { size: 18, weight: "bold" as const },
        color: "#1f2937",
      },
    },
    scales: {
      x: { ticks: { color: "#4b5563" }, grid: { display: false } },
      y: {
        ticks: { color: "#4b5563" },
        grid: { color: "rgba(0, 0, 0, 0.1)" },
        title: { display: true, text: "Total Amount (₹)", color: "#4b5563" },
      },
    },
  };

  // Chart data for Product vs Sales
  const lineChartData = {
    labels: productSales.map((sale) => sale.product),
    datasets: [
      {
        label: "Sales Amount (₹)",
        data: productSales.map((sale) => sale.amount),
        fill: false,
        borderColor: "#2CD14D",
        backgroundColor: "#2CD14D",
        tension: 0.1,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Product vs Sales",
        font: { size: 18, weight: "bold" as const },
        color: "#1f2937",
      },
    },
    scales: {
      x: { ticks: { color: "#4b5563" }, grid: { display: false } },
      y: {
        ticks: { color: "#4b5563" },
        grid: { color: "rgba(0, 0, 0, 0.1)" },
        title: { display: true, text: "Sales Amount (₹)", color: "#4b5563" },
      },
    },
  };

  return (
    <div className="min-h-screen mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      </header>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg font-sans">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10 w-full">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4 border border-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-[1.01]"
          >
            <div>{metric.icon}</div>
            <div>
              <h3 className="text-gray-800 font-medium text-lg font-sans">{metric.title}</h3>
              <p className="text-2xl font-bold text-gray-700 font-sans">
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

      {/* Charts */}
      <div className="flex flex-col lg:flex-row gap-6 mb-10 w-full">
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">
            Monthly Sales (Amount vs. Month)
          </h2>
          {loading ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          ) : monthlySales.length > 0 ? (
            <div className="h-64">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          ) : (
            <p className="text-gray-500 font-sans">No sales data available.</p>
          )}
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">
            Product vs Sales
          </h2>
          {loading ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          ) : productSales.length > 0 ? (
            <div className="h-64">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          ) : (
            <p className="text-gray-500 font-sans">No product sales data available.</p>
          )}
        </div>
      </div>

      {/* Market Analysis */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-10 w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">
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
                  {["Grain", "MSP (₹/quintal)", "Market Price (₹/quintal)", "Difference (%)"].map(
                    (header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-800 font-sans"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grainComparisons.map((grain, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{grain.grain}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{grain.msp}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{grain.marketPrice}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={grain.difference >= 0 ? "text-[#2CD14D]" : "text-red-600"}>
                        {grain.difference.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 font-sans">No market analysis data available.</p>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">Recent Orders</h2>
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
                    "Date & Time",
                    "Product",
                    "Customer Name",
                    "Email ID",
                    "Phone No.",
                    "Address",
                    "Payment Type",
                    "Status",
                    "Actions",
                  ].map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-2 text-left text-sm font-medium text-gray-800 font-sans"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={`${order.source}-${order.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">
                      {order.timestampDate ? formatDateTime(order.timestampDate) : "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.productName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.customerName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.phone}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.address}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 font-sans">{order.paymentType}</td>
                    <td className="px-4 py-2 text-sm font-sans">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "Delivered"
                            ? "bg-green-100 text-[#2CD14D]"
                            : order.status.toLowerCase() === "pending"
                            ? "bg-yellow-100 text-yellow-600"
                            : order.status === "accepted"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-sans">
                      {order.status.toLowerCase() === "pending" ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptOrder(order)}
                            className="px-2 py-1 bg-[#2CD14D] text-white rounded-lg hover:bg-[#24B042] text-xs flex items-center"
                            title="Accept Order"
                          >
                            <FaCheckCircle className="mr-1 h-3 w-3" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineOrder(order)}
                            className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs flex items-center"
                            title="Decline Order"
                          >
                            <FaTimesCircle className="mr-1 h-3 w-3" />
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 font-sans">No recent orders.</p>
        )}
      </div>
    </div>
  );
};

export default FarmerDashboard;