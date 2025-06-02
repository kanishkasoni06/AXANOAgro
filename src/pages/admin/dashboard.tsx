import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FaShoppingCart, FaGavel, FaMoneyBillWave, FaChartLine, FaUsers } from "react-icons/fa";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from "chart.js";
import { Chart } from "react-chartjs-2";
import AdminSidebar from "./adminSidebar";


// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Interface for monthly performance data
interface MonthlyPerformance {
  month: string;
  pageViews: number;
  clicks: number;
}

// Interface for recent activities
interface Activity {
  id: string;
  action: string;
  timestamp: any;
}

const AdminDashboard: React.FC = () => {
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeBids, setActiveBids] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch Orders and Calculate Total Revenue
        const ordersQuery = query(collection(db, "orders"));
        const ordersSnapshot = await getDocs(ordersQuery);
        let totalRevenueAmount = 0;
        ordersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              totalRevenueAmount += item.totalAmount || 0;
            });
          }
        });
        setTotalOrders(ordersSnapshot.size);
        setTotalRevenue(totalRevenueAmount);

        // Fetch Active Bids
        const bidsQuery = query(collection(db, "bidItems"), where("status", "==", "active"));
        const bidsSnapshot = await getDocs(bidsQuery);
        setActiveBids(bidsSnapshot.size);

        // Add revenue from accepted bids
        const bidItemsQuery = query(collection(db, "bidItems"));
        const bidItemsSnapshot = await getDocs(bidItemsQuery);
        for (const bidDoc of bidItemsSnapshot.docs) {
          const bidData = bidDoc.data();
          if (bidData.acceptedBid?.acceptedAt && bidData.acceptedBid.bidAmount) {
            totalRevenueAmount += bidData.acceptedBid.bidAmount || 0;
            if (bidData.deliveryDetails?.[0]?.amount) {
              totalRevenueAmount += bidData.deliveryDetails[0].amount;
            }
          }
        }
        setTotalRevenue(totalRevenueAmount);

        // Fetch Total Users
        const farmersQuery = query(collection(db, "farmer"));
        const farmersSnapshot = await getDocs(farmersQuery);
        const buyersQuery = query(collection(db, "buyer"));
        const buyersSnapshot = await getDocs(buyersQuery);
        const deliveryPartnersQuery = query(collection(db, "deliveryPartner"));
        const deliveryPartnersSnapshot = await getDocs(deliveryPartnersQuery);

        const totalUsersCount = farmersSnapshot.size + buyersSnapshot.size + deliveryPartnersSnapshot.size;
        setTotalUsers(totalUsersCount);

        // Fetch Recent Activities
        const activities: Activity[] = [];
        for (const orderDoc of ordersSnapshot.docs) {
          const orderData = orderDoc.data();
          const orderStatus = orderData.deliveryDetails?.deliveryStatus || orderData.status || "N/A";

          activities.push({
            id: orderDoc.id,
            action: `Order placed for ${orderData.items?.[0]?.name || "Unknown"} (Status: ${orderStatus})`,
            timestamp: orderData.createdAt,
          });

          if (orderData.deliveryDetails?.deliveryPartnerId) {
            activities.push({
              id: `${orderDoc.id}-delivery`,
              action: `Delivery accepted for order ${orderDoc.id}`,
              timestamp: orderData.deliveryDetails?.assignedAt || orderData.createdAt,
            });
          }
        }

        for (const bidDoc of bidItemsSnapshot.docs) {
          const bidData = bidDoc.data();

          if (bidData.acceptedBid?.buyerId || bidData.bids?.[0]?.buyerId) {
            activities.push({
              id: bidDoc.id,
              action: `Bid placed for ${bidData.itemName} (Status: ${bidData.status})`,
              timestamp: bidData.acceptedBid?.acceptedAt || bidData.createdAt,
            });
          }

          if (bidData.ownerUserId) {
            activities.push({
              id: `${bidDoc.id}-farmer`,
              action: `Listed ${bidData.itemName} for bidding`,
              timestamp: bidData.createdAt,
            });
          }
        }

        const sortedActivities = activities
          .sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0))
          .slice(0, 10);
        setRecentActivities(sortedActivities);

        // Dummy data for sessions and conversion rate
        setTotalSessions(1245);
        setConversionRate(3.5);

      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Chart data
  const performanceData: MonthlyPerformance[] = [
    { month: "Jan", pageViews: 30, clicks: 5 },
    { month: "Feb", pageViews: 40, clicks: 3 },
    { month: "Mar", pageViews: 20, clicks: 8 },
    { month: "Apr", pageViews: 50, clicks: 4 },
    { month: "May", pageViews: 60, clicks: 2 },
    { month: "Jun", pageViews: 35, clicks: 6 },
    { month: "Jul", pageViews: 45, clicks: 3 },
    { month: "Aug", pageViews: 55, clicks: 7 },
    { month: "Sep", pageViews: 25, clicks: 5 },
    { month: "Oct", pageViews: 65, clicks: 4 },
    { month: "Nov", pageViews: 50, clicks: 6 },
    { month: "Dec", pageViews: 70, clicks: 8 },
  ];

  const chartData = {
    labels: performanceData.map(data => data.month),
    datasets: [
      {
        type: 'bar' as const,
        label: "Page Views",
        data: performanceData.map(data => data.pageViews),
        backgroundColor: "#16a34a",
        borderColor: "#16a34a",
        borderWidth: 1,
        barThickness: 20,
      },
      {
        type: 'line' as const,
        label: "Clicks",
        data: performanceData.map(data => data.clicks),
        borderColor: "#34d399",
        backgroundColor: "rgba(52, 211, 153, 0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: { size: 12 },
          color: "#6b7280",
        },
      },
      title: {
        display: true,
        text: "Performance",
        font: { size: 18, weight: "bold" as const },
        color: "#1f2937",
        align: "start" as const,
        padding: { bottom: 20 },
      },
    },
    scales: {
      x: { ticks: { color: "#6b7280" }, grid: { display: false } },
      y: {
        ticks: { color: "#6b7280", stepSize: 10 },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        title: { display: true, text: "Values", color: "#6b7280", font: { size: 14 } },
      },
    },
  };

  // Metrics
  const metrics = [
    {
      icon: <FaShoppingCart className="text-green-500 text-2xl" />,
      title: "Total Orders",
      value: totalOrders,
      change: 8.19,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaGavel className="text-green-500 text-2xl" />,
      title: "Active Bids",
      value: activeBids,
      change: 0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaMoneyBillWave className="text-green-500 text-2xl" />,
      title: "Total Revenue",
      value: (totalRevenue / 1000).toFixed(1) + "k",
      change: 10,
      changeDirection: "down",
      changeText: "Last Month",
    },
    {
      icon: <FaUsers className="text-green-500 text-2xl" />,
      title: "Total Users",
      value: totalUsers,
      change: 6.5,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaChartLine className="text-green-500 text-2xl" />,
      title: "Total Sessions",
      value: totalSessions,
      change: 5.2,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaChartLine className="text-green-500 text-2xl" />,
      title: "Conversion Rate",
      value: conversionRate + "%",
      change: 2.5,
      changeDirection: "down",
      changeText: "Last Month",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar/>
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Admin</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Performance</h2>
                <div className="flex space-x-2">
                  {["ALL", "1M", "6M", "1Y"].map((filter, index) => (
                    <button
                      key={index}
                      className={`px-3 py-1 text-sm rounded-full ${
                        filter === "ALL"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
              ) : (
                <div className="h-64">
                  <Chart type="bar" data={chartData} options={chartOptions} />
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {["ID", "Action", "Date"].map((header, index) => (
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
                    {recentActivities.map(activity => (
                      <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-sm text-gray-700">{activity.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{activity.action}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {activity.timestamp?.toDate
                            ? activity.timestamp.toDate().toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No recent activities found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;