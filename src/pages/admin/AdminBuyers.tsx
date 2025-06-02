import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, doc, deleteDoc, where } from "firebase/firestore";
import {  FaUsers, FaUserCheck, FaBox, FaClipboardList } from "react-icons/fa";
import AdminSidebar from "./adminSidebar";

// Interface for Buyer data
interface Buyer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  totalOrders: number;
  status: string;
  registrationDate: string;
}

const AdminBuyers: React.FC = () => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [activeBuyers, setActiveBuyers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [averageOrdersPerBuyer, setAverageOrdersPerBuyer] = useState(0);
  const [loading, setLoading] = useState(true);

  // Function to get color class based on buyer status
  const getStatusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to delete a buyer
  const handleDelete = async (buyerId: string) => {
    if (window.confirm("Are you sure you want to delete this buyer? This action cannot be undone.")) {
      try {
        // Check if the buyer has any orders
        const ordersQuery = query(collection(db, "orders"), where("buyerId", "==", buyerId));
        const ordersSnapshot = await getDocs(ordersQuery);
        if (ordersSnapshot.size > 0) {
          alert("Cannot delete this buyer because they have associated orders. Please delete the orders first.");
          return;
        }

        // Delete the buyer
        await deleteDoc(doc(db, "buyer", buyerId));
        setBuyers(buyers.filter(buyer => buyer.id !== buyerId));
        // Recalculate metrics after deletion
        const updatedBuyers = buyers.filter(buyer => buyer.id !== buyerId);
        setTotalBuyers(updatedBuyers.length);
        setActiveBuyers(updatedBuyers.filter(buyer => buyer.status.toLowerCase() === "active").length);
        const updatedTotalOrders = updatedBuyers.reduce((sum, buyer) => sum + buyer.totalOrders, 0);
        setTotalOrders(updatedTotalOrders);
        setAverageOrdersPerBuyer(updatedBuyers.length > 0 ? updatedTotalOrders / updatedBuyers.length : 0);
      } catch (error) {
        console.error("Error deleting buyer:", error);
        alert("Failed to delete buyer. Please try again.");
      }
    }
  };

  // Fetch buyers and their order counts
  useEffect(() => {
    const fetchBuyersData = async () => {
      setLoading(true);
      try {
        // Fetch Buyers
        const buyersQuery = query(collection(db, "buyer"));
        const buyersSnapshot = await getDocs(buyersQuery);
        const buyersList: Buyer[] = [];
        let activeCount = 0;
        let totalOrdersCount = 0;

        for (const buyerDoc of buyersSnapshot.docs) {
          const buyerData = buyerDoc.data();

          // Initialize default values
          const fullName = buyerData.fullName || "Unknown";
          const email = buyerData.email || "N/A";
          const phoneNumber = buyerData.phoneNumber || "N/A";
          const status = buyerData.status || "Active"; // Default to Active if not specified
          const registrationDate = buyerData.createdAt?.toDate
            ? buyerData.createdAt.toDate().toLocaleDateString()
            : "N/A";

          // Fetch total orders for this buyer
          const ordersQuery = query(collection(db, "orders"), where("buyerId", "==", buyerDoc.id));
          const ordersSnapshot = await getDocs(ordersQuery);
          const totalOrders = ordersSnapshot.size;

          // Update Metrics
          totalOrdersCount += totalOrders;
          if (status.toLowerCase() === "active") {
            activeCount++;
          }

          buyersList.push({
            id: buyerDoc.id,
            fullName,
            email,
            phoneNumber,
            totalOrders,
            status,
            registrationDate,
          });
        }

        // Set Metrics
        setTotalBuyers(buyersSnapshot.size);
        setActiveBuyers(activeCount);
        setTotalOrders(totalOrdersCount);
        setAverageOrdersPerBuyer(buyersSnapshot.size > 0 ? totalOrdersCount / buyersSnapshot.size : 0);

        // Sort buyers by registrationDate (most recent first)
        buyersList.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
        setBuyers(buyersList);
      } catch (error) {
        console.error("Error fetching buyers data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuyersData();
  }, []);

  // Metrics for display
  const metrics = [
    {
      icon: <FaUsers className="text-green-500 text-2xl" />,
      title: "Total Buyers",
      value: totalBuyers,
      change: 4.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaUserCheck className="text-green-500 text-2xl" />,
      title: "Active Buyers",
      value: activeBuyers,
      change: 3.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaBox className="text-green-500 text-2xl" />,
      title: "Total Orders",
      value: totalOrders,
      change: 5.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaClipboardList className="text-green-500 text-2xl" />,
      title: "Avg Orders per Buyer",
      value: averageOrdersPerBuyer.toFixed(1),
      change: 2.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
     <AdminSidebar/>

      {/* Main Content */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Buyers</h1>
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

          {/* Buyers Table */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Buyer List</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : buyers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {[
                        "Buyer ID",
                        "Full Name",
                        "Email",
                        "Phone Number",
                        "Total Orders",
                        "Status",
                        "Registration Date",
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
                    {buyers.map((buyer, index) => (
                      <tr
                        key={buyer.id}
                        className={`transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-100 cursor-pointer`}
                      >
                        <td
                          className="px-6 py-4 text-sm text-blue-600 underline"
                          onClick={() => navigate(`/admin/buyers/${buyer.id}`)}
                        >
                          {buyer.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{buyer.fullName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{buyer.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{buyer.phoneNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{buyer.totalOrders}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                              buyer.status
                            )}`}
                          >
                            {buyer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{buyer.registrationDate}</td>
                        <td className="px-6 py-4 text-sm flex space-x-2">
                          <button
                            onClick={() => navigate(`/admin/buyers/edit/${buyer.id}`)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                            title="Edit Buyer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(buyer.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                            title="Delete Buyer"
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
              <p className="text-gray-500">No buyers found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBuyers;