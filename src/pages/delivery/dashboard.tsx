import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaTruck, FaHourglassHalf, FaMoneyBillWave, FaClock, FaStar } from "react-icons/fa";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Delivery {
  id: string;
  orderId: string;
  farmerName: string;
  buyerName: string;
  status: string;
  timestamp: any;
  timestampDate: Date;
  earnings: number;
}

interface MonthlyEarnings {
  month: string;
  amount: number;
}

interface RouteInsight {
  orderId: string;
  estimatedTime: number; // in minutes
  actualTime: number; // in minutes
  difference: number; // in minutes
}

const DeliveryPartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState<string>("N/A");
  const [averageRating, setAverageRating] = useState<string>("No ratings yet");
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  const [routeInsights, setRouteInsights] = useState<RouteInsight[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to format Date object to a readable string
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

  // Fetch data from Firestore
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Step 1: Fetch delivery partner's data from deliveryPartner collection
        const deliveryPartnerDoc = await getDoc(doc(db, "deliveryPartner", user.uid));
        if (!deliveryPartnerDoc.exists()) {
          console.warn("Delivery partner not found.");
          setLoading(false);
          return;
        }

        // Step 2: Fetch all bidItems where this delivery partner is involved
        const bidItemsQuery = query(
          collection(db, "bidItems"),
          where("deliveryDetails", "array-contains", { deliveryPartnerId: user.uid })
        );
        const bidItemsSnapshot = await getDocs(bidItemsQuery);

        let totalDeliveriesCount = 0;
        let activeDeliveriesCount = 0;
        let totalEarningsAmount = 0;
        let onTimeDeliveries = 0;
        let totalRatedDeliveries = 0;
        let totalRating = 0;
        const recentDeliveriesData: Delivery[] = [];
        const routeInsightsData: RouteInsight[] = [];

        const orderIds = new Set<string>();
        bidItemsSnapshot.forEach(doc => {
          const data = doc.data();
          const deliveryDetail = data.deliveryDetails.find(
            (detail: any) => detail.deliveryPartnerId === user.uid
          );

          if (!deliveryDetail) return;

          const orderId = doc.id;
          orderIds.add(orderId);

          // Determine delivery status
          const isDelivered = deliveryDetail.deliveredOrder === true;
          if (isDelivered) {
            totalDeliveriesCount++;
            totalEarningsAmount += deliveryDetail.amount || 0;

            // Check on-time delivery (assuming deliveredAt and estimatedDeliveryTime exist)
            if (deliveryDetail.deliveredAt && deliveryDetail.estimatedDeliveryTime) {
              const deliveredAt = deliveryDetail.deliveredAt.toDate();
              const estimatedTimeDate = new Date(deliveryDetail.estimatedDeliveryTime.toDate());
              if (deliveredAt <= estimatedTimeDate) {
                onTimeDeliveries++;
              }

              // Add to route insights
              const actualTimeMinutes = (deliveredAt.getTime() - deliveryDetail.assignedAt.toDate().getTime()) / (1000 * 60); // in minutes
              const estimatedTimeMinutes = (estimatedTimeDate.getTime() - deliveryDetail.assignedAt.toDate().getTime()) / (1000 * 60); // in minutes
              routeInsightsData.push({
                orderId: orderId,
                estimatedTime: Math.round(estimatedTimeMinutes),
                actualTime: Math.round(actualTimeMinutes),
                difference: Math.round(actualTimeMinutes - estimatedTimeMinutes),
              });
            }
          } else {
            activeDeliveriesCount++;
          }

          // Calculate average rating
          if (data.ratings && typeof data.ratings.deliveryPartnerRating === "number") {
            totalRating += data.ratings.deliveryPartnerRating;
            totalRatedDeliveries++;
          }
        });

        // Step 3: Fetch orders to cross-check and get additional details
        const ordersQuery = query(collection(db, "orders"));
        const ordersSnapshot = await getDocs(ordersQuery);

        const farmerItemIds = new Set<string>();
        const recentOrdersMap: { [key: string]: any } = {};

        ordersSnapshot.forEach(orderDoc => {
          const data = orderDoc.data();
          const orderId = orderDoc.id;

          // Check if this order is relevant to the delivery partner
          const deliveryDetails = data.deliveryDetails || {};
          if (deliveryDetails.deliveryPartnerId !== user.uid) return;

          orderIds.add(orderId);

          // Determine status
          const isDelivered = deliveryDetails.deliveredOrder === true;
          if (isDelivered) {
            totalDeliveriesCount++;
          } else {
            activeDeliveriesCount++;
          }

          // Collect item IDs to fetch farmer details
          const items = data.items || [];
          items.forEach((item: any) => {
            if (item.id) farmerItemIds.add(item.id);
          });

          recentOrdersMap[orderId] = {
            status: isDelivered ? "Delivered" : data.status === "pending" ? "Pending" : "Other",
            timestamp: data.deliveryDetails.assignedAt || data.createdAt,
            timestampDate: data.deliveryDetails.assignedAt
              ? data.deliveryDetails.assignedAt.toDate()
              : data.createdAt
              ? data.createdAt.toDate()
              : new Date(),
            earnings: 0, // Will be updated from bidItems
            buyerId: data.buyerId || "",
            items: items,
          };
        });

        // Step 4: Combine data for recent deliveries
        for (const orderId of orderIds) {
          const orderData = recentOrdersMap[orderId];
          if (!orderData) continue;

          let farmerName = "Unknown";
          let buyerName = "Unknown";
          let earnings = 0;

          // Fetch earnings from bidItems
          const bidItemDoc = bidItemsSnapshot.docs.find(doc => doc.id === orderId);
          if (bidItemDoc) {
            const bidData = bidItemDoc.data();
            const deliveryDetail = bidData.deliveryDetails.find(
              (detail: any) => detail.deliveryPartnerId === user.uid
            );
            if (deliveryDetail) {
              earnings = deliveryDetail.amount || 0;
            }
          }

          // Fetch farmer name
          const items = orderData.items || [];
          if (items.length > 0) {
            const firstItem = items[0];
            if (firstItem.id) {
              const itemDoc = await getDoc(doc(db, "items", firstItem.id));
              if (itemDoc.exists()) {
                const itemData = itemDoc.data() as { ownerUserId?: string };
                if (itemData.ownerUserId) {
                  const farmerDoc = await getDoc(doc(db, "farmer", itemData.ownerUserId));
                  if (farmerDoc.exists()) {
                    const farmerData = farmerDoc.data() as { fullName?: string };
                    farmerName = farmerData.fullName || "Unknown";
                  }
                }
              }
            }
          }

          // Fetch buyer name
          if (orderData.buyerId) {
            const buyerDoc = await getDoc(doc(db, "buyer", orderData.buyerId));
            if (buyerDoc.exists()) {
              const buyerData = buyerDoc.data() as { fullName?: string };
              buyerName = buyerData.fullName || "Unknown";
            }
          }

          recentDeliveriesData.push({
            id: orderId,
            orderId: orderId,
            farmerName: farmerName,
            buyerName: buyerName,
            status: orderData.status,
            timestamp: orderData.timestamp,
            timestampDate: orderData.timestampDate,
            earnings: earnings,
          });
        }

        // Sort recent deliveries by timestamp (latest first) and limit to 5
        recentDeliveriesData.sort((a, b) => b.timestampDate.getTime() - a.timestampDate.getTime());
        setRecentDeliveries(recentDeliveriesData.slice(0, 5));

        // Sort route insights by orderId (most recent first) and limit to 5
        routeInsightsData.sort((a, b) => {
          const orderA = recentDeliveriesData.find(d => d.orderId === a.orderId);
          const orderB = recentDeliveriesData.find(d => d.orderId === b.orderId);
          const timeA = orderA ? orderA.timestampDate.getTime() : 0;
          const timeB = orderB ? orderB.timestampDate.getTime() : 0;
          return timeB - timeA;
        });
        setRouteInsights(routeInsightsData.slice(0, 5));

        // Set metrics
        setTotalDeliveries(totalDeliveriesCount);
        setActiveDeliveries(activeDeliveriesCount);
        setTotalEarnings(totalEarningsAmount);
        if (totalDeliveriesCount > 0) {
          const onTimePercentage = (onTimeDeliveries / totalDeliveriesCount) * 100;
          setOnTimeRate(`${onTimePercentage.toFixed(1)}%`);
        }
        if (totalRatedDeliveries > 0) {
          const avgRating = (totalRating / totalRatedDeliveries).toFixed(1);
          setAverageRating(`${avgRating} / 5`);
        }

        // Use dummy data for monthly earnings (January to May 2025)
        const dummyMonthlyEarnings: MonthlyEarnings[] = [
          { month: "Jan 2025", amount: 5000 },
          { month: "Feb 2025", amount: 6000 },
          { month: "Mar 2025", amount: 7500 },
          { month: "Apr 2025", amount: 4000 },
          { month: "May 2025", amount: 8000 },
        ];
        setMonthlyEarnings(dummyMonthlyEarnings);
      } catch (error) {
        console.error("Error in fetchDashboardData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  // Metrics for display
  const metrics = [
    { icon: <FaTruck className="text-[#2CD14D] text-3xl" />, title: "Total Deliveries", value: totalDeliveries },
    { icon: <FaHourglassHalf className="text-[#2CD14D] text-3xl" />, title: "Active Deliveries", value: activeDeliveries },
    { icon: <FaMoneyBillWave className="text-[#2CD14D] text-3xl" />, title: "Total Earnings", value: `₹${totalEarnings.toLocaleString()}` },
    { icon: <FaClock className="text-[#2CD14D] text-3xl" />, title: "On-Time Rate", value: onTimeRate },
    { icon: <FaStar className="text-yellow-500 text-3xl" />, title: "Average Rating", value: averageRating },
  ];

  // Chart data for Earnings vs. Month
  const chartData = {
    labels: monthlyEarnings.map(earning => earning.month),
    datasets: [
      {
        label: "Earnings (₹)",
        data: monthlyEarnings.map(earning => earning.amount),
        backgroundColor: "#2CD14D",
        borderColor: "#24B042",
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
        text: "Monthly Earnings (Earnings vs. Month)",
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
          text: "Earnings (₹)",
          color: "#4b5563",
        },
      },
    },
  };

  return (
    <div>
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
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

        {/* Earnings Trend and Route Insights Side by Side */}
        <div className="flex flex-col lg:flex-row gap-6 mb-10 w-full">
          {/* Earnings Trend Chart */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">
              Monthly Earnings (Earnings vs. Month)
            </h2>
            {loading ? (
              <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
            ) : monthlyEarnings.length > 0 ? (
              <div className="h-64">
                <Bar data={chartData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-gray-500 font-sans">No earnings data available.</p>
            )}
          </div>

          {/* Route Optimization Insights */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">
              Route Optimization Insights
            </h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : routeInsights.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {["Order ID", "Estimated Time (min)", "Actual Time (min)", "Difference (min)"].map((header, index) => (
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
                    {routeInsights.map((insight, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700 font-sans">{insight.orderId}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 font-sans">{insight.estimatedTime}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 font-sans">{insight.actualTime}</td>
                        <td className="px-4 py-2 text-sm font-sans">
                          <span
                            className={`${
                              insight.difference <= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {insight.difference > 0 ? `+${insight.difference}` : insight.difference}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 font-sans">No route insights available.</p>
            )}
          </div>
        </div>

        {/* Recent Deliveries Table */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-sans">
            Recent Deliveries
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : recentDeliveries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {[
                      "Order ID",
                      "Date & Time",
                      "Farmer Name",
                      "Buyer Name",
                      "Status",
                      "Earnings (₹)",
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
                  {recentDeliveries.map(delivery => (
                    <tr key={delivery.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700 font-sans">{delivery.orderId}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 font-sans">
                        {delivery.timestampDate ? formatDateTime(delivery.timestampDate) : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 font-sans">{delivery.farmerName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 font-sans">{delivery.buyerName}</td>
                      <td className="px-4 py-2 text-sm font-sans">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            delivery.status === "Delivered"
                              ? "bg-green-100 text-green-600"
                              : delivery.status === "Pending"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 font-sans">{delivery.earnings.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 font-sans">No recent deliveries.</p>
          )}
        </div>
      </div>
  
  );
};

export default DeliveryPartnerDashboard;