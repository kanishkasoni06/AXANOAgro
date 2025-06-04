import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContext";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { FaTruck, FaHourglassHalf, FaMoneyBillWave, FaClock, FaStar, FaPlus, FaMinus } from "react-icons/fa";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Item {
  name: string;
  quantity: number;
}

interface Delivery {
  id: string;
  orderId: string;
  farmerName: string;
  buyerName: string;
  pickupPoint: string;
  dropOffPoint: string;
  distance: number;
  status: string;
  timestamp: any;
  timestampDate: Date;
  baseAmount: number;
  proposedAmount?: number;
  earnings: number;
  items: Item[];
  source: "bidItems" | "orders";
  hasSubmittedBid?: boolean;
}

interface MonthlyEarnings {
  month: string;
  amount: number;
}

interface RouteInsight {
  orderId: string;
  estimatedTime: number;
  actualTime: number;
  difference: number;
}

const DeliveryPartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState<string>("N/A");
  const [averageRating, setAverageRating] = useState<string>("No ratings yet");
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  const [routeInsights, setRouteInsights] = useState<RouteInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposedAmounts, setProposedAmounts] = useState<{ [key: string]: number }>({});

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

  const haversineDistance = (coords1: Coordinates, coords2: Coordinates): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);
    const lat1 = toRad(coords1.latitude);
    const lat2 = toRad(coords2.latitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Number(distance.toFixed(2));
  };

  const handleIncreaseAmount = (key: string, currentAmount: number) => {
    setProposedAmounts((prev) => ({
      ...prev,
      [key]: (prev[key] || currentAmount) + 10,
    }));
  };

  const handleDecreaseAmount = (key: string, currentAmount: number) => {
    setProposedAmounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || currentAmount) - 10),
    }));
  };

  const handleSubmitBid = async (delivery: Delivery) => {
    if (!user) return;
    try {
      const collectionName = delivery.source;
      const docRef = doc(db, collectionName, delivery.orderId);
      const existingDoc = await getDoc(docRef);
      const existingData = existingDoc.data();
      const existingBids = existingData?.deliveryBids || [];

      await updateDoc(docRef, {
        deliveryBids: [
          ...existingBids,
          {
            deliveryPartnerId: user.uid,
            amount: proposedAmounts[`${delivery.source}_${delivery.orderId}`] || delivery.baseAmount,
            assignedAt: new Date(),
          },
        ],
      });

      setRecentDeliveries((prev) =>
        prev.map((d) =>
          d.orderId === delivery.orderId && d.source === delivery.source
            ? {
                ...d,
                status: "Pending",
                proposedAmount: proposedAmounts[`${delivery.source}_${delivery.orderId}`] || delivery.baseAmount,
                hasSubmittedBid: true,
              }
            : d
        )
      );
      alert("Bid submitted successfully!");
    } catch (error) {
      console.error("Error submitting bid:", error);
      alert("Failed to submit bid. Please try again.");
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const deliveryPartnerDoc = await getDoc(doc(db, "deliveryPartner", user.uid));
        if (!deliveryPartnerDoc.exists()) {
          console.warn("Delivery partner not found.");
          setLoading(false);
          return;
        }

        const bidItemsQuery = query(
          collection(db, "bidItems"),
          where("status", "==", "accepted")
        );
        const bidItemsSnapshot = await getDocs(bidItemsQuery);

        const ordersQuery = query(
          collection(db, "orders"),
          where("status", "==", "ready")
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        let totalDeliveriesCount = 0;
        let totalEarningsAmount = 0;
        let onTimeDeliveries = 0;
        let totalRatedDeliveries = 0;
        let totalRating = 0;
        let activeDeliveriesCount = 0;
        const recentDeliveriesData: Delivery[] = [];
        const routeInsightsData: RouteInsight[] = [];

        // Process bidItems
        for (const bidDoc of bidItemsSnapshot.docs) {
          const data = bidDoc.data();
          const deliveryDetails = data.deliveryDetails || [];
          const deliveryBids = data.deliveryBids || [];
          const hasSubmittedBid = deliveryBids.some(
            (bid: any) => bid.deliveryPartnerId === user.uid
          );

          const isAssignedToUser = deliveryDetails.some(
            (detail: any) => detail.deliveryPartnerId === user.uid
          );
          const isAssignedToAnotherUser = deliveryDetails.some(
            (detail: any) => detail.deliveryPartnerId && detail.deliveryPartnerId !== user.uid
          );

          const orderId = bidDoc.id;

          // Metrics: Count completed and active deliveries for the logged-in user
          const deliveryDetail = deliveryDetails.find(
            (detail: any) => detail.deliveryPartnerId === user.uid && detail.deliveryStatus === "accepted"
          );

          if (deliveryDetail) {
            const isDelivered = deliveryDetail.deliveredOrder === true;
            if (isDelivered) {
              totalDeliveriesCount++;
              totalEarningsAmount += deliveryDetail.amount || 0;

              if (deliveryDetail.deliveredAt && deliveryDetail.estimatedDeliveryTime) {
                const deliveredAt = deliveryDetail.deliveredAt.toDate();
                const estimatedTimeDate = new Date(deliveryDetail.estimatedDeliveryTime.toDate());
                if (deliveredAt <= estimatedTimeDate) {
                  onTimeDeliveries++;
                }

                const actualTimeMinutes = (deliveredAt.getTime() - deliveryDetail.assignedAt.toDate().getTime()) / (1000 * 60);
                const estimatedTimeMinutes = (estimatedTimeDate.getTime() - deliveryDetail.assignedAt.toDate().getTime()) / (1000 * 60);
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

            if (data.ratings && typeof data.ratings.deliveryPartnerRating === "number") {
              totalRating += data.ratings.deliveryPartnerRating;
              totalRatedDeliveries++;
            }
          }

          // Recent Deliveries: Include unassigned or assigned to this user
          const shouldInclude =
            // Case 1: No deliveryDetails (unassigned)
            deliveryDetails.length === 0 ||
            // Case 2: Assigned to this user
            isAssignedToUser;

          if (shouldInclude && !isAssignedToAnotherUser) {
            let farmerName = "Unknown";
            let buyerName = "Unknown";
            let pickupPoint = "Unknown";
            let dropOffPoint = "Unknown";
            let distance = 10;
            let baseAmount = 100;

            if (data.ownerUserId) {
              const farmerDoc = await getDoc(doc(db, "farmer", data.ownerUserId));
              if (farmerDoc.exists()) {
                const farmerData = farmerDoc.data() as { fullName?: string; coordinates?: Coordinates; location?: string };
                farmerName = farmerData.fullName || "Unknown";
                pickupPoint = farmerData.location || "Unknown";
                if (farmerData.coordinates && data.acceptedBid?.buyerId) {
                  const buyerDoc = await getDoc(doc(db, "buyer", data.acceptedBid.buyerId));
                  if (buyerDoc.exists()) {
                    const buyerData = buyerDoc.data() as { fullName?: string; address?: string; coordinates?: Coordinates };
                    buyerName = buyerData.fullName || "Unknown";
                    dropOffPoint = buyerData.address || "Unknown";
                    if (buyerData.coordinates) {
                      distance = haversineDistance(farmerData.coordinates, buyerData.coordinates);
                      baseAmount = Math.round(distance * 10);
                    }
                  }
                }
              }
            }

            recentDeliveriesData.push({
              id: orderId,
              orderId: orderId,
              farmerName: farmerName,
              buyerName: buyerName,
              pickupPoint: pickupPoint,
              dropOffPoint: dropOffPoint,
              distance: distance,
              status: hasSubmittedBid ? "Pending" : "Accepted",
              timestamp: data.acceptedBid?.acceptedAt || data.createdAt,
              timestampDate: data.acceptedBid?.acceptedAt
                ? data.acceptedBid.acceptedAt.toDate()
                : data.createdAt.toDate(),
              baseAmount: baseAmount,
              proposedAmount: hasSubmittedBid ? deliveryBids.find((bid: any) => bid.deliveryPartnerId === user.uid)?.amount : undefined,
              earnings: 0,
              items: [
                {
                  name: data.itemName || "Unknown Item",
                  quantity: data.quantity || 0,
                },
              ],
              source: "bidItems",
              hasSubmittedBid: hasSubmittedBid,
            });
          }
        }

        // Process orders
        for (const orderDoc of ordersSnapshot.docs) {
          const data = orderDoc.data();
          const deliveryDetails = data.deliveryDetails || [];
          const deliveryBids = data.deliveryBids || [];
          const hasSubmittedBid = deliveryBids.some(
            (bid: any) => bid.deliveryPartnerId === user.uid
          );

          const isAssignedToUser = deliveryDetails.some(
            (detail: any) => detail.deliveryPartnerId === user.uid
          );
          const isAssignedToAnotherUser = deliveryDetails.some(
            (detail: any) => detail.deliveryPartnerId && detail.deliveryPartnerId !== user.uid
          );

          // Recent Deliveries: Include unassigned or assigned to this user
          const shouldInclude =
            // Case 1: No deliveryDetails (unassigned)
            deliveryDetails.length === 0 ||
            // Case 2: Assigned to this user
            isAssignedToUser;

          if (shouldInclude && !isAssignedToAnotherUser) {
            let farmerName = "Unknown";
            let buyerName = "Unknown";
            let pickupPoint = "Unknown";
            let dropOffPoint = "Unknown";
            let distance = 10;
            let baseAmount = 100;
            const items: Item[] = data.items?.map((item: any) => ({
              name: item.name || "Unknown Item",
              quantity: item.quantity || 0,
            })) || [{ name: "Unknown Item", quantity: 0 }];

            const ownerUserIds = new Set<string>();
            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                const itemDoc = await getDoc(doc(db, "items", item.name));
                if (itemDoc.exists()) {
                  const itemData = itemDoc.data();
                  if (itemData.ownerUserId) ownerUserIds.add(itemData.ownerUserId);
                }
              }
            }

            if (ownerUserIds.size > 0) {
              const farmerId = Array.from(ownerUserIds)[0];
              const farmerDoc = await getDoc(doc(db, "farmer", farmerId));
              if (farmerDoc.exists()) {
                const farmerData = farmerDoc.data() as { fullName?: string; coordinates?: Coordinates; location?: string };
                farmerName = farmerData.fullName || "Unknown";
                pickupPoint = farmerData.location || "Unknown";
                if (farmerData.coordinates && data.buyerId) {
                  const buyerDoc = await getDoc(doc(db, "buyer", data.buyerId));
                  if (buyerDoc.exists()) {
                    const buyerData = buyerDoc.data() as { fullName?: string; address?: string; coordinates?: Coordinates };
                    buyerName = buyerData.fullName || "Unknown";
                    dropOffPoint = buyerData.address || data.deliveryAddress || "Unknown";
                    if (buyerData.coordinates) {
                      distance = haversineDistance(farmerData.coordinates, buyerData.coordinates);
                      baseAmount = Math.round(distance * 10);
                    }
                  }
                }
              }
            }

            recentDeliveriesData.push({
              id: orderDoc.id,
              orderId: orderDoc.id,
              farmerName: farmerName,
              buyerName: buyerName,
              pickupPoint: pickupPoint,
              dropOffPoint: dropOffPoint,
              distance: distance,
              status: hasSubmittedBid ? "Pending" : "Ready",
              timestamp: data.createdAt,
              timestampDate: data.createdAt.toDate(),
              baseAmount: baseAmount,
              proposedAmount: hasSubmittedBid ? deliveryBids.find((bid: any) => bid.deliveryPartnerId === user.uid)?.amount : undefined,
              earnings: 0,
              items: items,
              source: "orders",
              hasSubmittedBid: hasSubmittedBid,
            });
          }
        }

        recentDeliveriesData.sort((a, b) => b.timestampDate.getTime() - a.timestampDate.getTime());
        setRecentDeliveries(recentDeliveriesData.slice(0, 5));

        routeInsightsData.sort((a, b) => {
          const orderA = recentDeliveriesData.find(d => d.orderId === a.orderId);
          const orderB = recentDeliveriesData.find(d => d.orderId === b.orderId);
          const timeA = orderA ? orderA.timestampDate.getTime() : 0;
          const timeB = orderB ? orderB.timestampDate.getTime() : 0;
          return timeB - timeA;
        });
        setRouteInsights(routeInsightsData.slice(0, 5));

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
  }, [user]);

  const metrics = [
    { icon: <FaTruck className="text-[#2CD14D] text-3xl" />, title: "Total Deliveries", value: totalDeliveries },
    { icon: <FaHourglassHalf className="text-[#2CD14D] text-3xl" />, title: "Active Deliveries", value: activeDeliveries },
    { icon: <FaMoneyBillWave className="text-[#2CD14D] text-3xl" />, title: "Total Earnings", value: `₹${totalEarnings.toLocaleString()}` },
    { icon: <FaClock className="text-[#2CD14D] text-3xl" />, title: "On-Time Rate", value: onTimeRate },
    { icon: <FaStar className="text-yellow-500 text-3xl" />, title: "Average Rating", value: averageRating },
  ];

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
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4 border border-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-[1.01]"
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

      <div className="flex flex-col lg:flex-row gap-6 mb-10 w-full">
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Monthly Earnings (Earnings vs. Month)
          </h2>
          {loading ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          ) : monthlyEarnings.length > 0 ? (
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : (
            <p className="text-gray-500">No earnings data available.</p>
          )}
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-800"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {routeInsights.map((insights, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{insights.orderId}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{insights.estimatedTime}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{insights.actualTime}</td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`${
                            insights.difference <= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {insights.difference > 0 ? `+${insights.difference}` : insights.difference}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No route insights available.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Deliveries</h2>
        {loading ? (
          [...Array(5)].map((_, index) => (
            <div key={index} className="animate-pulse h-12 bg-gray-200 rounded-lg"></div>
          ))
        ) : recentDeliveries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Order ID",
                    "Date & Time",
                    "Pick-Up Point",
                    "Delivery Point",
                    "Items",
                    "Distance (km)",
                    "Status",
                    "Base Price (₹)",
                    "Proposed Amount (₹)",
                    "Action",
                  ].map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recentDeliveries.map((delivery) => (
                  <tr key={`${delivery.source}_${delivery.orderId}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-700">{delivery.orderId}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {delivery.timestampDate ? formatDateTime(delivery.timestampDate) : "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{delivery.pickupPoint}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{delivery.dropOffPoint}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {delivery.items.map((item, index) => (
                          <li key={index} className="text-sm">
                            {item.quantity}x {item.name}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{delivery.distance.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          delivery.status === "accepted" || delivery.status === "ready"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{delivery.baseAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {delivery.hasSubmittedBid ? (
                        <span className="text-sm font-medium">
                          ₹{delivery.proposedAmount}
                        </span>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleDecreaseAmount(`${delivery.source}_${delivery.orderId}`, delivery.baseAmount)}
                            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                            aria-label="Decrease amount"
                          >
                            <FaMinus className="text-gray-600 w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium">
                            ₹{proposedAmounts[`${delivery.source}_${delivery.orderId}`] || delivery.baseAmount}
                          </span>
                          <button
                            onClick={() => handleIncreaseAmount(`${delivery.source}_${delivery.orderId}`, delivery.baseAmount)}
                            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                            aria-label="Increase amount"
                          >
                            <FaPlus className="text-gray-600 w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleSubmitBid(delivery)}
                        className={`px-4 py-2 rounded-full text-xs font-medium text-white transition-colors ${
                          delivery.status === "Pending" || delivery.hasSubmittedBid
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-[#2CD14D] hover:bg-[#24B042]"
                        }`}
                        disabled={delivery.status === "Pending" || delivery.hasSubmittedBid}
                      >
                        {delivery.hasSubmittedBid ? "Bid Submitted" : "Submit Bid"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No recent deliveries available.</p>
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;