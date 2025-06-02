import React, { useState, useEffect } from "react";
import { db, storage} from "../../firebase/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp, DocumentData } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {  FaInfoCircle, FaTag, FaLightbulb, FaRobot } from "react-icons/fa";
import AdminSidebar from "./adminSidebar";

interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  imageUrl: string | null;
  targetGroups: string[];
  createdAt: string;
}

const AdminNotification: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Informative");
  const [image, setImage] = useState<File | null>(null);
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const categories = [
    { value: "Informative", label: "Informative", icon: <FaInfoCircle className="text-blue-500" /> },
    { value: "New Offer", label: "New Offer", icon: <FaTag className="text-green-500" /> },
    { value: "Ideas", label: "Ideas", icon: <FaLightbulb className="text-yellow-500" /> },
    { value: "AI Advice", label: "AI Advice", icon: <FaRobot className="text-purple-500" /> },
  ];

  const userGroups = [
    { value: "All Users", label: "All Users" },
    { value: "Farmers", label: "Farmers" },
    { value: "Buyers", label: "Buyers" },
    { value: "Delivery Partners", label: "Delivery Partners" },
  ];

  const handleTargetGroupChange = (group: string) => {
    if (group === "All Users") {
      setTargetGroups(["All Users"]);
    } else {
      if (targetGroups.includes("All Users")) {
        setTargetGroups([group]);
      } else {
        setTargetGroups(prev =>
          prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
        );
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !body || targetGroups.length === 0) {
      setError("Title, body, and at least one target group are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let imageUrl: string | null = null;
      if (image) {
        const imageRef = ref(storage, `notifications/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const notificationData = {
        title,
        body,
        category,
        imageUrl,
        targetGroups,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "notifications"), notificationData);

      // Log payload for debugging
      const payload = { title, body, category, imageUrl, targetGroups };
      console.log("Sending notification payload:", payload);

      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          const response = await fetch("http://localhost:3000/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to send notification: ${errorData.error || response.statusText}`);
          }

          break;
        } catch (fetchError) {
          attempts++;
          if (attempts === maxAttempts) {
            throw fetchError;
          }
          console.log(`Retry ${attempts}/${maxAttempts} for send-notification`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setNotifications(prev => [
        {
          id: docRef.id,
          ...notificationData,
          createdAt: new Date().toLocaleDateString(),
        },
        ...prev,
      ]);

      setTitle("");
      setBody("");
      setCategory("Informative");
      setImage(null);
      setTargetGroups([]);
      alert("Notification sent successfully!");
    } catch (error: any) {
      console.error("Error sending notification:", error);
      setError(`Failed to send notification: ${error.message}. Check backend logs for details.`);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setFetching(true);
    try {
      const notificationsQuery = query(collection(db, "notifications"));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notificationsList: Notification[] = [];

      notificationsSnapshot.forEach(doc => {
        const data = doc.data() as DocumentData;
        notificationsList.push({
          id: doc.id,
          title: data.title || "Untitled",
          body: data.body || "No content",
          category: data.category || "Informative",
          imageUrl: data.imageUrl || null,
          targetGroups: data.targetGroups || [],
          createdAt: data.createdAt?.toDate()
            ? data.createdAt.toDate().toLocaleDateString()
            : "N/A",
        });
      });

      notificationsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Failed to fetch notifications.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : <FaInfoCircle className="text-blue-500" />;
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar/>

      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-700 uppercase">Notifications</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Send New Notification</h2>
            <form onSubmit={handleSubmit}>
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Enter notification title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Body</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    rows={4}
                    placeholder="Enter notification message"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Groups</label>
                  <div className="mt-1">
                    {userGroups.map(group => (
                      <div key={group.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={group.value}
                          checked={targetGroups.includes(group.value)}
                          onChange={() => handleTargetGroupChange(group.value)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          disabled={targetGroups.includes("All Users") && group.value !== "All Users"}
                        />
                        <label htmlFor={group.value} className="ml-2 text-sm text-gray-700">
                          {group.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Notification History</h2>
            {fetching ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      {["Title", "Body", "Category", "Target Groups", "Image", "Created At"].map((header, index) => (
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
                    {notifications.map((notification, index) => (
                      <tr
                        key={notification.id}
                        className={`transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-700">{notification.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{notification.body}</td>
                        <td className="px-6 py-4 text-sm flex items-center space-x-2">
                          {getCategoryIcon(notification.category)}
                          <span>{notification.category}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {notification.targetGroups.join(", ")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {notification.imageUrl ? (
                            <img src={notification.imageUrl} alt="Notification" className="h-12 w-12 object-cover rounded" />
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{notification.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No notifications found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotification;