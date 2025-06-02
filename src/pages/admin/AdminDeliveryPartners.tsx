import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, doc, deleteDoc, where } from "firebase/firestore";
import {  FaTruck, FaUserCheck, FaBox, FaClipboardList } from "react-icons/fa";
import AdminSidebar from "./adminSidebar";

// Interface for Delivery Partner data
interface DeliveryPartner {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  totalDeliveries: number;
  status: string;
  registrationDate: string;
}

const AdminDeliveryPartners: React.FC = () => {
  const navigate = useNavigate();
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [totalDeliveryPartners, setTotalDeliveryPartners] = useState(0);
  const [activeDeliveryPartners, setActiveDeliveryPartners] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [averageDeliveriesPerPartner, setAverageDeliveriesPerPartner] = useState(0);
  const [loading, setLoading] = useState(true);


  // Function to get color class based on delivery partner status
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

  // Function to delete a delivery partner
  const handleDelete = async (partnerId: string) => {
    if (window.confirm("Are you sure you want to delete this delivery partner? This action cannot be undone.")) {
      try {
        // Check if the delivery partner has any assigned deliveries
        const ordersQuery = query(collection(db, "orders"), where("deliveryPartnerId", "==", partnerId));
        const ordersSnapshot = await getDocs(ordersQuery);
        if (ordersSnapshot.size > 0) {
          alert("Cannot delete this delivery partner because they have assigned orders. Please reassign or complete the orders first.");
          return;
        }

        // Delete the delivery partner
        await deleteDoc(doc(db, "deliveryPartner", partnerId));
        setDeliveryPartners(deliveryPartners.filter(partner => partner.id !== partnerId));
        // Recalculate metrics after deletion
        const updatedPartners = deliveryPartners.filter(partner => partner.id !== partnerId);
        setTotalDeliveryPartners(updatedPartners.length);
        setActiveDeliveryPartners(updatedPartners.filter(partner => partner.status.toLowerCase() === "active").length);
        const updatedTotalDeliveries = updatedPartners.reduce((sum, partner) => sum + partner.totalDeliveries, 0);
        setTotalDeliveries(updatedTotalDeliveries);
        setAverageDeliveriesPerPartner(updatedPartners.length > 0 ? updatedTotalDeliveries / updatedPartners.length : 0);
      } catch (error) {
        console.error("Error deleting delivery partner:", error);
        alert("Failed to delete delivery partner. Please try again.");
      }
    }
  };

  // Fetch delivery partners and their delivery counts
  useEffect(() => {
    const fetchDeliveryPartnersData = async () => {
      setLoading(true);
      try {
        // Fetch Delivery Partners
        const partnersQuery = query(collection(db, "deliveryPartner"));
        const partnersSnapshot = await getDocs(partnersQuery);
        const partnersList: DeliveryPartner[] = [];
        let activeCount = 0;
        let totalDeliveriesCount = 0;

        for (const partnerDoc of partnersSnapshot.docs) {
          const partnerData = partnerDoc.data();

          // Initialize default values
          const fullName = partnerData.fullName || "Unknown";
          const email = partnerData.email || "N/A";
          const phoneNumber = partnerData.phoneNumber || "N/A";
          const status = partnerData.status || "Active"; // Default to Active if not specified
          const registrationDate = partnerData.createdAt?.toDate
            ? partnerData.createdAt.toDate().toLocaleDateString()
            : "N/A";

          // Fetch total deliveries for this delivery partner
          const ordersQuery = query(collection(db, "orders"), where("deliveryPartnerId", "==", partnerDoc.id));
          const ordersSnapshot = await getDocs(ordersQuery);
          const totalDeliveries = ordersSnapshot.size;

          // Update Metrics
          totalDeliveriesCount += totalDeliveries;
          if (status.toLowerCase() === "active") {
            activeCount++;
          }

          partnersList.push({
            id: partnerDoc.id,
            fullName,
            email,
            phoneNumber,
            totalDeliveries,
            status,
            registrationDate,
          });
        }

        // Set Metrics
        setTotalDeliveryPartners(partnersSnapshot.size);
        setActiveDeliveryPartners(activeCount);
        setTotalDeliveries(totalDeliveriesCount);
        setAverageDeliveriesPerPartner(partnersSnapshot.size > 0 ? totalDeliveriesCount / partnersSnapshot.size : 0);

        // Sort delivery partners by registrationDate (most recent first)
        partnersList.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
        setDeliveryPartners(partnersList);
      } catch (error) {
        console.error("Error fetching delivery partners data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryPartnersData();
  }, []);

  // Metrics for display
  const metrics = [
    {
      icon: <FaTruck className="text-green-500 text-2xl" />,
      title: "Total Delivery Partners",
      value: totalDeliveryPartners,
      change: 4.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaUserCheck className="text-green-500 text-2xl" />,
      title: "Active Delivery Partners",
      value: activeDeliveryPartners,
      change: 3.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaBox className="text-green-500 text-2xl" />,
      title: "Total Deliveries",
      value: totalDeliveries,
      change: 5.0,
      changeDirection: "up",
      changeText: "Last Month",
    },
    {
      icon: <FaClipboardList className="text-green-500 text-2xl" />,
      title: "Avg Deliveries per Partner",
      value: averageDeliveriesPerPartner.toFixed(1),
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
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Delivery Partners</h1>
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

          {/* Delivery Partners Table */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Delivery Partner List</h2>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : deliveryPartners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {[
                        "Partner ID",
                        "Full Name",
                        "Email",
                        "Phone Number",
                        "Total Deliveries",
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
                    {deliveryPartners.map((partner, index) => (
                      <tr
                        key={partner.id}
                        className={`transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-100 cursor-pointer`}
                      >
                        <td
                          className="px-6 py-4 text-sm text-blue-600 underline"
                          onClick={() => navigate(`/admin/delivery-partners/${partner.id}`)}
                        >
                          {partner.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{partner.fullName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{partner.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{partner.phoneNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{partner.totalDeliveries}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClass(
                              partner.status
                            )}`}
                          >
                            {partner.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{partner.registrationDate}</td>
                        <td className="px-6 py-4 text-sm flex space-x-2">
                          <button
                            onClick={() => navigate(`/admin/delivery-partners/edit/${partner.id}`)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                            title="Edit Delivery Partner"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(partner.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                            title="Delete Delivery Partner"
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
              <p className="text-gray-500">No delivery partners found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeliveryPartners;