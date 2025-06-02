import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, doc, deleteDoc, where } from "firebase/firestore";
import { FaTractor,FaUserCheck, FaBox, FaClipboardList } from "react-icons/fa";
import AdminSidebar from "./adminSidebar";

// Interface for Farmer data
interface Farmer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  totalBidItems: number;
  status: string;
  registrationDate: string;
}

const AdminFarmers: React.FC = () => {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [totalFarmers, setTotalFarmers] = useState(0);
  const [activeFarmers, setActiveFarmers] = useState(0);
  const [totalBidItems, setTotalBidItems] = useState(0);
  const [averageBidItemsPerFarmer, setAverageBidItemsPerFarmer] = useState(0);
  const [loading, setLoading] = useState(true);


  // Function to get color class based on farmer status
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

  // Function to delete a farmer
  const handleDelete = async (farmerId: string) => {
    if (window.confirm("Are you sure you want to delete this farmer? This action cannot be undone.")) {
      try {
        // Check if the farmer has any bid items
        const bidItemsQuery = query(collection(db, "bidItems"), where("ownerUserId", "==", farmerId));
        const bidItemsSnapshot = await getDocs(bidItemsQuery);
        if (bidItemsSnapshot.size > 0) {
          alert("Cannot delete this farmer because they have associated bid items. Please delete the bid items first.");
          return;
        }

        // Delete the farmer
        await deleteDoc(doc(db, "farmer", farmerId));
        setFarmers(farmers.filter(farmer => farmer.id !== farmerId));
        // Recalculate metrics after deletion
        const updatedFarmers = farmers.filter(farmer => farmer.id !== farmerId);
        setTotalFarmers(updatedFarmers.length);
        setActiveFarmers(updatedFarmers.filter(farmer => farmer.status.toLowerCase() === "active").length);
        const updatedTotalBidItems = updatedFarmers.reduce((sum, farmer) => sum + farmer.totalBidItems, 0);
        setTotalBidItems(updatedTotalBidItems);
        setAverageBidItemsPerFarmer(updatedFarmers.length > 0 ? updatedTotalBidItems / updatedFarmers.length : 0);
      } catch (error) {
        console.error("Error deleting farmer:", error);
        alert("Failed to delete farmer. Please try again.");
      }
    }
  };

  // Fetch farmers and their bid item counts
  useEffect(() => {
    const fetchFarmersData = async () => {
      setLoading(true);
      try {
        // Fetch Farmers
        const farmersQuery = query(collection(db, "farmer"));
        const farmersSnapshot = await getDocs(farmersQuery);
        const farmersList: Farmer[] = [];
        let activeCount = 0;
        let totalBidItemsCount = 0;

        for (const farmerDoc of farmersSnapshot.docs) {
          const farmerData = farmerDoc.data();

          // Initialize default values
          const fullName = farmerData.fullName || "Unknown";
          const email = farmerData.email || "N/A";
          const phoneNumber = farmerData.phoneNumber || "N/A";
          const status = farmerData.status || "Active"; // Default to Active if not specified
          const registrationDate = farmerData.createdAt?.toDate
            ? farmerData.createdAt.toDate().toLocaleDateString()
            : "N/A";

          // Fetch total bid items for this farmer
          const bidItemsQuery = query(collection(db, "bidItems"), where("ownerUserId", "==", farmerDoc.id));
          const bidItemsSnapshot = await getDocs(bidItemsQuery);
          const totalBidItems = bidItemsSnapshot.size;

          // Update Metrics
          totalBidItemsCount += totalBidItems;
          if (status.toLowerCase() === "active") {
            activeCount++;
          }

          farmersList.push({
            id: farmerDoc.id,
            fullName,
            email,
            phoneNumber,
            totalBidItems,
            status,
            registrationDate,
          });
        }

        // Set Metrics
        setTotalFarmers(farmersSnapshot.size);
        setActiveFarmers(activeCount);
        setTotalBidItems(totalBidItemsCount);
        setAverageBidItemsPerFarmer(farmersSnapshot.size > 0 ? totalBidItemsCount / farmersSnapshot.size : 0);

        // Sort farmers by registrationDate (most recent first)
        farmersList.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
        setFarmers(farmersList);
      } catch (error) {
        console.error("Error fetching farmers data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmersData();
  }, []);

  // Metrics for display
  const metrics = [
    {
      icon: <FaTractor className="text-green-500 text-2xl" />,
      title: "Total Farmers",
      value: totalFarmers,
      change: 4.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaUserCheck className="text-green-500 text-2xl" />,
      title: "Active Farmers",
      value: activeFarmers,
      change: 3.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaBox className="text-green-500 text-2xl" />,
      title: "Total Bid Items",
      value: totalBidItems,
      change: 5.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaClipboardList className="text-green-500 text-2xl" />,
      title: "Avg Bid Items per Farmer",
      value: averageBidItemsPerFarmer.toFixed(1),
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
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Farmers</h1>
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

          {/* Farmers Table */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Farmer List</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : farmers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {[
                        "Farmer ID",
                        "Full Name",
                        "Email",
                        "Phone Number",
                        "Total Bid Items",
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
                    {farmers.map((farmer, index) => (
                      <tr
                        key={farmer.id}
                        className={`transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-100 cursor-pointer`}
                      >
                        <td
                          className="px-6 py-4 text-sm text-blue-600 underline"
                          onClick={() => navigate(`/admin/farmers/${farmer.id}`)}
                        >
                          {farmer.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{farmer.fullName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{farmer.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{farmer.phoneNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{farmer.totalBidItems}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                              farmer.status
                            )}`}
                          >
                            {farmer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{farmer.registrationDate}</td>
                        <td className="px-6 py-4 text-sm flex space-x-2">
                          <button
                            onClick={() => navigate(`/admin/farmers/edit/${farmer.id}`)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                            title="Edit Farmer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(farmer.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                            title="Delete Farmer"
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
              <p className="text-gray-500">No farmers found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFarmers;