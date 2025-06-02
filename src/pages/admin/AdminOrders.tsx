import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, doc, getDoc, deleteDoc } from "firebase/firestore";
import { FaShoppingCart, FaTruck, FaClock, FaCheckCircle, FaMoneyBillWave, FaBoxOpen, FaHandPaper, FaCreditCard } from "react-icons/fa";
import AdminSidebar from "./adminSidebar";

// Interface for Order data
interface Order {
  id: string;
  itemName: string;
  buyerName: string;
  deliveryPartnerName: string;
  totalAmount: number;
  deliveryStatus: string;
  paymentStatus: string; // New field for payment status
  orderDate: string;
}

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [inTransitOrders, setInTransitOrders] = useState(0);
  const [deliveredOrders, setDeliveredOrders] = useState(0);
  const [readyOrders, setReadyOrders] = useState(0);
  const [acceptedOrders, setAcceptedOrders] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0); // New metric for Pending Payments
  const [totalOrderRevenue, setTotalOrderRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Function to get color class based on delivery status
  const getStatusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-red-100 text-red-800";
      case "ready":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "in transit":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to get color class based on payment status
  const getPaymentStatusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to delete an order
  const handleDelete = async (orderId: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        setOrders(orders.filter(order => order.id !== orderId));
        // Recalculate metrics after deletion
        const updatedOrders = orders.filter(order => order.id !== orderId);
        setTotalOrders(updatedOrders.length);
        setPendingOrders(updatedOrders.filter(order => order.deliveryStatus.toLowerCase() === "pending").length);
        setInTransitOrders(updatedOrders.filter(order => order.deliveryStatus.toLowerCase() === "in transit").length);
        setDeliveredOrders(updatedOrders.filter(order => order.deliveryStatus.toLowerCase() === "delivered").length);
        setReadyOrders(updatedOrders.filter(order => order.deliveryStatus.toLowerCase() === "ready").length);
        setAcceptedOrders(updatedOrders.filter(order => order.deliveryStatus.toLowerCase() === "accepted").length);
        setPendingPayments(updatedOrders.filter(order => order.paymentStatus.toLowerCase() === "pending").length);
        setTotalOrderRevenue(updatedOrders.reduce((sum, order) => sum + order.totalAmount, 0));
      } catch (error) {
        console.error("Error deleting order:", error);
        alert("Failed to delete order. Please try again.");
      }
    }
  };

  // Fetch orders and calculate metrics
  useEffect(() => {
    const fetchOrdersData = async () => {
      setLoading(true);
      try {
        // Fetch Orders
        const ordersQuery = query(collection(db, "orders"));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersList: Order[] = [];
        let pendingCount = 0;
        let inTransitCount = 0;
        let deliveredCount = 0;
        let readyCount = 0;
        let acceptedCount = 0;
        let pendingPaymentCount = 0;
        let totalRevenue = 0;

        for (const orderDoc of ordersSnapshot.docs) {
          const orderData = orderDoc.data();

          // Initialize default values
          let itemName = "Unknown";
          let buyerName = "Unknown";
          let deliveryPartnerName = "Not Assigned";
          let totalAmount = 0;
          let deliveryStatus = orderData.status || "Pending";
          let paymentStatus = orderData.paymentStatus || "Pending"; // New field
          const orderDate = orderData.createdAt?.toDate
            ? orderData.createdAt.toDate().toLocaleDateString()
            : "N/A";

          // Fetch Buyer Name
          if (orderData.buyerId) {
            const buyerDoc = await getDoc(doc(db, "buyer", orderData.buyerId));
            if (buyerDoc.exists()) {
              const buyerData = buyerDoc.data();
              buyerName = buyerData.fullName || "Unknown";
            }
          }

          // Fetch Item Name and Total Amount
          if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
            itemName = orderData.items[0].name || "Unknown";
            orderData.items.forEach((item: any) => {
              totalAmount += item.totalAmount || 0;
            });
          }

          // If order is linked to a bid item, fetch bid item details
          if (orderData.bidItemId) {
            const bidItemDoc = await getDoc(doc(db, "bidItems", orderData.bidItemId));
            if (bidItemDoc.exists()) {
              const bidItemData = bidItemDoc.data();
              itemName = bidItemData.itemName || itemName;
              totalAmount = bidItemData.acceptedBid?.bidAmount || totalAmount;
            }
          }

          // Fetch Delivery Partner Name and Status
          if (orderData.deliveryDetails?.deliveryPartnerId) {
            const deliveryPartnerDoc = await getDoc(doc(db, "deliveryPartner", orderData.deliveryDetails.deliveryPartnerId));
            if (deliveryPartnerDoc.exists()) {
              const deliveryPartnerData = deliveryPartnerDoc.data();
              deliveryPartnerName = deliveryPartnerData.fullName || "Unknown";
            }
            deliveryStatus = orderData.deliveryDetails.deliveryStatus || deliveryStatus;
          }

          // Update Metrics
          totalRevenue += totalAmount;
          switch (deliveryStatus.toLowerCase()) {
            case "pending":
              pendingCount++;
              break;
            case "in transit":
              inTransitCount++;
              break;
            case "delivered":
              deliveredCount++;
              break;
            case "ready":
              readyCount++;
              break;
            case "accepted":
              acceptedCount++;
              break;
            default:
              break;
          }

          if (paymentStatus.toLowerCase() === "pending") {
            pendingPaymentCount++;
          }

          ordersList.push({
            id: orderDoc.id,
            itemName,
            buyerName,
            deliveryPartnerName,
            totalAmount,
            deliveryStatus,
            paymentStatus,
            orderDate,
          });
        }

        // Set Metrics
        setTotalOrders(ordersSnapshot.size);
        setPendingOrders(pendingCount);
        setInTransitOrders(inTransitCount);
        setDeliveredOrders(deliveredCount);
        setReadyOrders(readyCount);
        setAcceptedOrders(acceptedCount);
        setPendingPayments(pendingPaymentCount);
        setTotalOrderRevenue(totalRevenue);

        // Sort orders by orderDate (most recent first)
        ordersList.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching orders data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersData();
  }, []);

  // Metrics for display (updated with Pending Payments)
  const metrics = [
    {
      icon: <FaShoppingCart className="text-green-500 text-2xl" />,
      title: "Total Orders",
      value: totalOrders,
      change: 5.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaClock className="text-green-500 text-2xl" />,
      title: "Pending Orders",
      value: pendingOrders,
      change: 2.0,
      changeDirection: "down",
      changeText: "Last Month",
    },
    {
      icon: <FaTruck className="text-green-500 text-2xl" />,
      title: "In-Transit Orders",
      value: inTransitOrders,
      change: 3.5,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaCheckCircle className="text-green-500 text-2xl" />,
      title: "Delivered Orders",
      value: deliveredOrders,
      change: 4.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaBoxOpen className="text-green-500 text-2xl" />,
      title: "Ready Orders",
      value: readyOrders,
      change: 2.5,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaHandPaper className="text-green-500 text-2xl" />,
      title: "Accepted Orders",
      value: acceptedOrders,
      change: 3.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaCreditCard className="text-green-500 text-2xl" />,
      title: "Pending Payments",
      value: pendingPayments,
      change: 1.5,
      changeDirection: "down",
      changeText: "Last Month",
    },
    {
      icon: <FaMoneyBillWave className="text-green-500 text-2xl" />,
      title: "Total Order Revenue",
      value: (totalOrderRevenue / 1000).toFixed(1) + "k",
      change: 6.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Inbuilt Sidebar */}
     <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Orders</h1>
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

          {/* Orders Table (Removed Farmer, Added Payment Status and Actions) */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Order List</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {[
                        "Order ID",
                        "Item Name",
                        "Buyer",
                        "Delivery Partner",
                        "Total Amount",
                        "Delivery Status",
                        "Payment Status",
                        "Order Date",
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
                    {orders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-100 cursor-pointer`}
                      >
                        <td
                          className="px-6 py-4 text-sm text-blue-600 underline"
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          {order.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{order.itemName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{order.buyerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{order.deliveryPartnerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{order.totalAmount}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                              order.deliveryStatus
                            )}`}
                          >
                            {order.deliveryStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColorClass(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{order.orderDate}</td>
                        <td className="px-6 py-4 text-sm flex space-x-2">
                          <button
                            onClick={() => navigate(`/admin/orders/edit/${order.id}`)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                            title="Edit Order"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                            title="Delete Order"
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
              <p className="text-gray-500">No orders found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;