import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, getDoc, doc, DocumentData, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { FaMapMarkerAlt, FaTruck, FaPhone, FaMap, FaHome, FaClipboardList, FaMapMarkedAlt, FaRoute } from 'react-icons/fa';
import { IoSettings } from 'react-icons/io5';
import Sidebar from '../../components/ui/sidebar';
import { GoogleMap, Marker, DirectionsService, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';

// Interface for coordinates
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Interface for user details (farmer or buyer)
interface UserDetails {
  fullName: string;
  address: string;
  coordinates?: Coordinates;
  phoneNumber?: string;
}

// Interface for order items (from orders collection)
interface OrderItem {
  id?: string;
  name?: string;
  quantity: number;
  price: number;
}

// Interface for vehicle details (fetched from deliveryPartners collection)
interface VehicleDetails {
  vehicleModel: string;
  payload: string;
  loadVolume: string;
  licensePlate: string;
}

// Interface for active deliveries (orders accepted by the delivery partner)
interface ActiveDelivery {
  orderId: string;
  itemName: string;
  quantity: number;
  pickupPoint: string;
  deliveryPoint: string;
  items: OrderItem[];
  distance: number;
  deliveryAmount: number;
  status: string;
  farmer: UserDetails;
  buyer: UserDetails;
  routeColor: string;
}

// Interface for orders (from orders collection)
interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress?: string;
  status: 'New' | 'Preparing' | 'ready' | 'Picked Up' | 'Out for Delivery' | 'Delivered';
  buyerId: string;
  deliveryDetails?: {
    deliveryPartnerId: string;
    assignedAt: Date;
    deliveryStatus: 'pending' | 'accepted';
    onMyWayToFarmer?: boolean;
    reachedFarmer?: boolean;
    pickedUpOrder?: boolean;
    onMyWayToBuyer?: boolean;
    reachedBuyer?: boolean;
    deliveredOrder?: boolean;
  };
}

// Haversine formula for distance calculation
const haversineDistance = (
  coords1: Coordinates,
  coords2: Coordinates
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Number(distance.toFixed(2));
};

// Mock function to simulate distance calculation (in km) when coordinates are unavailable
const calculateDistance = (_pickupPoint: string): number => {
  return Math.floor(Math.random() * (50 - 5 + 1)) + 5;
};

// Array of colors for routes
const routeColors = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
];

// MapPage component
const MapPage: React.FC = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [directionsMap, setDirectionsMap] = useState<{ [orderId: string]: google.maps.DirectionsResult }>({});
  const [optimizeRoute, setOptimizeRoute] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load Google Maps API using useJsApiLoader
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA7wnXcrrVOYRs3-ycN0zGOQlF8PZJFXq0",
  });

  // Map container style with reduced height
  const mapContainerStyle = {
    width: '100%',
    height: '400px',
  };

  // Default center if coordinates are unavailable
  const defaultCenter = {
    lat: 12.9716, // Bengaluru, India
    lng: 77.5946,
  };

  // Compute map center dynamically based on all pickup and delivery coordinates
  const computeMapCenter = () => {
    const allCoords: Coordinates[] = [];
    activeDeliveries.forEach(delivery => {
      if (delivery.farmer.coordinates) allCoords.push(delivery.farmer.coordinates);
      if (delivery.buyer.coordinates) allCoords.push(delivery.buyer.coordinates);
    });

    if (allCoords.length === 0) return defaultCenter;

    const avgLat = allCoords.reduce((sum, coord) => sum + coord.latitude, 0) / allCoords.length;
    const avgLng = allCoords.reduce((sum, coord) => sum + coord.longitude, 0) / allCoords.length;

    return { lat: avgLat, lng: avgLng };
  };

  // Compute bounds to fit all markers
  const computeBounds = () => {
    const bounds = new google.maps.LatLngBounds();
    activeDeliveries.forEach(delivery => {
      if (delivery.farmer.coordinates) {
        bounds.extend(new google.maps.LatLng(delivery.farmer.coordinates.latitude, delivery.farmer.coordinates.longitude));
      }
      if (delivery.buyer.coordinates) {
        bounds.extend(new google.maps.LatLng(delivery.buyer.coordinates.latitude, delivery.buyer.coordinates.longitude));
      }
    });
    return bounds;
  };

  useEffect(() => {
    if (!user) {
      setError('You need to be logged in to view this page');
      setLoading(false);
      return;
    }

    // Fetch vehicle details from deliveryPartners collection
    const fetchVehicleDetails = async () => {
      try {
        const deliveryPartnerDoc = await getDoc(doc(db, 'deliveryPartners', user.uid));
        if (deliveryPartnerDoc.exists()) {
          const data = deliveryPartnerDoc.data() as DocumentData;
          setVehicleDetails({
            vehicleModel: data.vehicleModel,
            payload: data.payload,
            loadVolume: data.loadVolume,
            licensePlate: data.licensePlate,
          });
        } else {
          setVehicleDetails(null);
        }
      } catch (err: any) {
        console.error('Error fetching vehicle details:', err.code, err.message);
        setVehicleDetails(null);
      }
    };

    // Fetch active deliveries
    const ordersQuery = query(collection(db, 'orders'));

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        try {
          const deliveries: ActiveDelivery[] = [];
          let colorIndex = 0;

          for (const docSnap of snapshot.docs) {
            const order = { id: docSnap.id, ...docSnap.data() } as Order;

            // Skip if the order is not assigned to the current delivery partner or is already delivered
            if (
              !order.deliveryDetails ||
              order.deliveryDetails.deliveryPartnerId !== user.uid ||
              order.status === 'Delivered'
            ) {
              continue;
            }

            let farmerAddress = '';
            let farmerDetails: UserDetails = { fullName: '', address: '' };
            let ownerUserId: string | null = null;

            // Step 1: Fetch the ownerUserId from the items collection
            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              for (const item of order.items) {
                try {
                  // Use item.id as the name to query the items collection
                  const itemName = item.id || item.name;
                  if (!itemName) {
                    console.warn(`Item in order ${order.id} missing ID or name:`, item);
                    continue;
                  }

                  // Query the items collection to find the item where the 'name' field matches itemName
                  const itemsQuery = query(collection(db, 'items'), where('name', '==', itemName));
                  const itemDocs = await getDocs(itemsQuery);

                  if (!itemDocs.empty) {
                    const itemDoc = itemDocs.docs[0];
                    const itemData = itemDoc.data() as DocumentData;
                    ownerUserId = itemData.ownerUserId || null;
                    if (!ownerUserId) {
                      console.warn(`Item ${itemName} in items collection missing ownerUserId:`, itemData);
                    }
                    break; // Assuming one farmer per order, so we can break after finding the first ownerUserId
                  } else {
                    console.warn(`No item found with name ${itemName} in items collection for order ${order.id}`);
                  }
                } catch (err: any) {
                  console.error(`Error fetching item with name ${item.id || item.name} for order ${order.id}:`, err.code, err.message);
                }
              }
            } else {
              console.warn(`Order ${order.id} has no items or items is not an array:`, order.items);
            }

            // Step 2: Fetch the farmer's address using the ownerUserId
            if (ownerUserId) {
              try {
                const farmerDoc = await getDoc(doc(db, 'farmer', ownerUserId));
                if (farmerDoc.exists()) {
                  const data = farmerDoc.data() as DocumentData;
                  // Log the fetched farmer data to debug
                  console.log(`Farmer ${ownerUserId} data for order ${order.id}:`, data);

                  farmerAddress = data.location || 'No address provided';
                  farmerDetails = {
                    fullName: data.fullName || 'Unknown Farmer',
                    address: farmerAddress,
                    coordinates: data.coordinates || undefined,
                    phoneNumber: data.phoneNumber || 'Not provided',
                  };
                } else {
                  console.warn(`Farmer document with ID ${ownerUserId} not found in farmer collection for order ${order.id}`);
                }
              } catch (err: any) {
                console.error(`Error fetching farmer with ID ${ownerUserId} for order ${order.id}:`, err.code, err.message);
              }
            } else {
              console.warn(`No ownerUserId found for order ${order.id}`);
            }

            let buyerAddress = 'No address provided';
            let buyerDetails: UserDetails = { fullName: '', address: '' };
            if (order.buyerId) {
              try {
                const buyerDoc = await getDoc(doc(db, 'buyer', order.buyerId));
                if (buyerDoc.exists()) {
                  const data = buyerDoc.data() as DocumentData;
                  buyerAddress = data.address || order.deliveryAddress || 'No address provided';
                  buyerDetails = {
                    fullName: data.fullName || 'Unknown Buyer',
                    address: buyerAddress,
                    coordinates: data.coordinates || undefined,
                    phoneNumber: data.phoneNumber || 'Not provided',
                  };
                } else {
                  console.warn(`Buyer document with ID ${order.buyerId} not found in buyer collection for order ${order.id}`);
                }
              } catch (err: any) {
                console.error(`Error fetching buyer ${order.buyerId} for order ${order.id}:`, err.code, err.message);
              }
            } else {
              console.warn(`Order ${order.id} missing buyerId`);
            }

            let distance = calculateDistance(farmerAddress);
            if (farmerDetails.coordinates && buyerDetails.coordinates) {
              try {
                distance = haversineDistance(farmerDetails.coordinates, buyerDetails.coordinates);
              } catch (err) {
                console.error('Error calculating distance for order ${order.id}:', err);
              }
            }

            const deliveryAmount = distance * 10;

            const firstItem = order.items && order.items.length > 0 ? order.items[0] : { name: 'Unknown Item', quantity: 0 };

            const activeDelivery: ActiveDelivery = {
              orderId: order.id,
              itemName: firstItem.name || ('id' in firstItem ? firstItem.id : undefined) || 'Unknown Item',
              quantity: firstItem.quantity,
              pickupPoint: farmerAddress,
              deliveryPoint: buyerAddress,
              items: order.items || [],
              distance,
              deliveryAmount,
              status: order.status,
              farmer: farmerDetails,
              buyer: buyerDetails,
              routeColor: routeColors[colorIndex % routeColors.length],
            };

            deliveries.push(activeDelivery);
            colorIndex++;
          }

        

          setActiveDeliveries(deliveries);
          await fetchVehicleDetails();
          setLoading(false);

          // Set the first order as selected by default
          if (deliveries.length > 0 && !selectedOrderId) {
            setSelectedOrderId(deliveries[0].orderId);
          }
        } catch (err: any) {
          console.error('Error processing orders:', err.code, err.message);
          setError('Failed to load active deliveries. Please try again later.');
        }
      },
      (err: any) => {
        console.error('Error fetching orders:', err.code, err.message);
        setError('Failed to load active deliveries. Please try again later.');
      }
    );

    return () => unsubscribeOrders();
  }, [user, selectedOrderId]);

  // Callback for DirectionsService
  const directionsCallback = useCallback(
    (orderId: string) =>
      (
        response: google.maps.DirectionsResult | null,
        status?: google.maps.DirectionsStatus
      ) => {
        if (response !== null && status) {
          if (status === 'OK') {
            setDirectionsMap(prev => ({
              ...prev,
              [orderId]: response,
            }));
          } else {
            console.error(`Directions request for order ${orderId} failed due to ${status}`);
            if (status === 'REQUEST_DENIED') {
              setError('Directions request failed: API key not authorized. Please contact support.');
            } else {
              setError(`Failed to calculate route for order ${orderId}: ${status}. Please try again.`);
            }
          }
        } else {
          setError(`Directions request for order ${orderId} failed: No response from server. Please try again.`);
        }
      },
    []
  );

  // Function to find best route
  const handleFindBestRoute = () => {
    setOptimizeRoute(true);
    setDirectionsMap({});
  };

  const getMenuItems = () => {
    return [
      {
        label: "Dashboard",
        onClick: () => navigate("/delivery/homePage"),
        icon: <FaHome className="text-[#2CD14D] text-xl" />,
      },
      {
        label: "My Deliveries",
        onClick: () => navigate("/myDeliveries"),
        icon: <FaTruck className="text-[#2CD14D] text-xl" />,
      },
      {
        label: "Route Map",
        onClick: () => navigate("/delivery/mapPage"),
        icon: <FaMapMarkedAlt className="text-[#2CD14D] text-xl" />,
      },
      {
        label: "Notifications",
        onClick: () => navigate("/delivery/notification"),
        icon: <FaClipboardList className="text-[#2CD14D] text-xl" />,
      },
      {
        label: "Settings",
        onClick: () => navigate("/delivery/settings"),
        icon: <IoSettings className="text-[#2CD14D] text-xl" />,
      },
    ];
  };

  // Get the selected delivery for contact details
  const selectedDelivery = activeDeliveries.find(delivery => delivery.orderId === selectedOrderId) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-[#2CD14D] animate-spin" />
          <p className="mt-3 text-lg text-gray-600 font-medium">Loading Your Deliveries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800">{error}</h2>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#2CD14D] text-white px-6 py-3 rounded-full text-lg font-medium hover:bg-[#24B042] transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800">Failed to load Google Maps API. Please check your network connection.</h2>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#2CD14D] text-white px-6 py-3 rounded-full text-lg font-medium hover:bg-[#24B042] transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-[#2CD14D] animate-spin" />
          <p className="mt-3 text-lg text-gray-600 font-medium">Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Sidebar menuItems={getMenuItems()} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-800 pb-4">Delivery Routes</h1>

        {activeDeliveries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 font-medium">No active deliveries found. Check for new orders!</p>
            <button
              onClick={() => navigate('/myDeliveries')}
              className="mt-4 bg-[#2CD14D] text-white px-6 py-3 rounded-full text-lg font-medium hover:bg-[#24B042] transition-all duration-200"
            >
              Find New Orders
            </button>
          </div>
        ) : (
          <div className="flex space-x-6">
            {/* Left Sidebar */}
            <div className="w-1/3 space-y-6">
              {/* Vehicle Info */}
              {vehicleDetails ? (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Vehicle</h3>
                  <img
                    src="https://via.placeholder.com/200x100?text=Vehicle+Image"
                    alt="Vehicle"
                    className="w-full h-32 object-cover rounded-md mb-4"
                  />
                  {vehicleDetails.vehicleModel && <p className="text-lg text-gray-600">{vehicleDetails.vehicleModel}</p>}
                  {vehicleDetails.payload && <p className="text-lg text-gray-600">Payload: {vehicleDetails.payload}</p>}
                  {vehicleDetails.loadVolume && <p className="text-lg text-gray-600">Load Volume: {vehicleDetails.loadVolume}</p>}
                  {vehicleDetails.licensePlate && <p className="text-lg font-medium text-gray-800 mt-2">{vehicleDetails.licensePlate}</p>}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Vehicle</h3>
                  <p className="text-lg text-gray-600">No vehicle details available.</p>
                </div>
              )}

              {/* Active Orders List */}
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 max-h-[400px] overflow-y-auto">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Orders</h3>
                <div className="space-y-4">
                  {activeDeliveries.map(delivery => (
                    <div
                      key={delivery.orderId}
                      onClick={() => setSelectedOrderId(delivery.orderId)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedOrderId === delivery.orderId ? 'bg-[#2CD14D] bg-opacity-10 border-2 border-[#2CD14D]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-semibold text-gray-800">Order #{delivery.orderId}</h4>
                        <span className="bg-blue-100 text-blue-600 text-sm font-medium px-3 py-1 rounded">
                          On the Way
                        </span>
                      </div>
                      <p className="text-lg font-medium text-gray-800">{delivery.itemName}</p>
                      <div className="mt-2 space-y-2 text-base text-gray-600">
                        <p className="flex items-start">
                          <FaMapMarkerAlt className="mr-2 text-green-500 text-xl mt-1" />
                          <span>{delivery.pickupPoint}</span>
                        </p>
                        <p className="flex items-start">
                          <FaMapMarkerAlt className="mr-2 text-red-500 text-xl mt-1" />
                          <span>{delivery.deliveryPoint}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Details for Selected Order */}
              {selectedDelivery && (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Contact Info</h3>
                  <div className="space-y-6 text-base text-gray-600">
                    <div>
                      <p className="font-medium text-gray-800 text-lg">{selectedDelivery.farmer.fullName}</p>
                      <p>{selectedDelivery.farmer.address}</p>
                      <p>{selectedDelivery.farmer.phoneNumber}</p>
                      <button
                        className="mt-3 w-full bg-[#2CD14D] text-white px-4 py-3 rounded-full text-lg font-medium hover:bg-[#24B042] flex items-center justify-center transition-all duration-200"
                      >
                        <FaPhone className="mr-2 text-xl" />
                        Call Farmer
                      </button>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-lg">{selectedDelivery.buyer.fullName}</p>
                      <p>{selectedDelivery.buyer.address}</p>
                      <p>{selectedDelivery.buyer.phoneNumber}</p>
                      <button
                        className="mt-3 w-full bg-[#2CD14D] text-white px-4 py-3 rounded-full text-lg font-medium hover:bg-[#24B042] flex items-center justify-center transition-all duration-200"
                      >
                        <FaPhone className="mr-2 text-xl" />
                        Call Buyer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Map Section */}
            <div className="w-2/3 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Your Routes</h3>
                  {selectedDelivery && directionsMap[selectedDelivery.orderId] && (
                    <div className="flex space-x-4 text-base text-gray-600">
                      <span className="flex items-center">
                        <FaTruck className="mr-2 text-[#2CD14D] text-xl" />
                        {directionsMap[selectedDelivery.orderId].routes[0].legs[0].distance?.text || 'Calculating...'}
                      </span>
                      <span className="flex items-center">
                        <span className="material-icons mr-2 text-xl">schedule</span>
                        {directionsMap[selectedDelivery.orderId].routes[0].legs[0].duration?.text || 'Calculating...'}
                      </span>
                    </div>
                  )}
                </div>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={computeMapCenter()}
                  zoom={12}
                  onLoad={map => {
                    const bounds = computeBounds();
                    if (!bounds.isEmpty()) map.fitBounds(bounds);
                  }}
                >
                  {/* Markers for all pickup and delivery points */}
                  {activeDeliveries.map(delivery => (
                    <React.Fragment key={delivery.orderId}>
                      {/* Pickup Point (Farmer) */}
                      {delivery.farmer.coordinates && (
                        <Marker
                          position={{
                            lat: delivery.farmer.coordinates.latitude,
                            lng: delivery.farmer.coordinates.longitude,
                          }}
                          label="Pick Up"
                          icon={{
                            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                          }}
                        />
                      )}

                      {/* Delivery Point (Buyer) */}
                      {delivery.buyer.coordinates && (
                        <Marker
                          position={{
                            lat: delivery.buyer.coordinates.latitude,
                            lng: delivery.buyer.coordinates.longitude,
                          }}
                          label="Deliver To"
                          icon={{
                            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          }}
                        />
                      )}

                      {/* Directions Service for each order */}
                      {delivery.farmer.coordinates && delivery.buyer.coordinates && (
                        <DirectionsService
                          options={{
                            origin: {
                              lat: delivery.farmer.coordinates.latitude,
                              lng: delivery.farmer.coordinates.longitude,
                            },
                            destination: {
                              lat: delivery.buyer.coordinates.latitude,
                              lng: delivery.buyer.coordinates.longitude,
                            },
                            travelMode: google.maps.TravelMode.DRIVING,
                            optimizeWaypoints: optimizeRoute,
                            waypoints: [],
                          }}
                          callback={directionsCallback(delivery.orderId)}
                        />
                      )}

                      {/* Render the directions on the map */}
                      {directionsMap[delivery.orderId] && (
                        <DirectionsRenderer
                          options={{
                            directions: directionsMap[delivery.orderId],
                            polylineOptions: {
                              strokeColor: delivery.routeColor,
                              strokeOpacity: 0.8,
                              strokeWeight: 5,
                            },
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </GoogleMap>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={handleFindBestRoute}
                    className="bg-[#2CD14D] text-white px-4 py-3 rounded-full text-lg font-medium hover:bg-[#24B042] flex items-center transition-all duration-200"
                  >
                    <FaRoute className="mr-2 text-xl" />
                    Find Best Route
                  </button>
                  <button
                    className="bg-blue-500 text-white px-4 py-3 rounded-full text-lg font-medium hover:bg-blue-600 flex items-center transition-all duration-200"
                  >
                    <FaMap className="mr-2 text-xl" />
                    Start Navigation
                  </button>
                </div>
              </div>

              {/* Legend for Route Colors */}
              {activeDeliveries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Route Colors</h3>
                  <div className="space-y-3">
                    {activeDeliveries.map(delivery => (
                      <div key={delivery.orderId} className="flex items-center">
                        <div className="w-6 h-6 rounded-full mr-3" style={{ backgroundColor: delivery.routeColor }}></div>
                        <span className="text-base text-gray-600">Order #{delivery.orderId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MapPage;