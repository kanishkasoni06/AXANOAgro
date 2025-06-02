import React, { useState, useEffect } from "react";
import ProductCard from "./productCard";

interface OrderItem {
  id: string;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  buyerId: string;
  createdAt: string;
  deliveryAddress: string;
  items: OrderItem[];
  status: string;
  totalAmount: number;
  updatedAt: string;
}

const ProductSlider: React.FC = () => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const visibleCards = 4;
  const totalCards = items.length;

  // Fetch orders from API
  const fetchOrders = async (): Promise<Order[]> => {
    try {
      const response = await fetch("/api/orders", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error("Failed to fetch orders");
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        const orders = await fetchOrders();
        // Flatten items from all orders
        const allItems = orders.flatMap((order) => order.items);
        setItems(allItems);
        setError(null);
      } catch (err) {
        setError("Failed to load products. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

  useEffect(() => {
    if (totalCards <= visibleCards) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        setCurrentIndex((prevIndex) =>
          (prevIndex + 1) % (totalCards - visibleCards + 1)
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, totalCards]);

  const handleViewDetails = (itemId: string) => {
    console.log(`View details for item ${itemId}`);
    // Implement navigation or modal opening
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading products...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="text-center py-4">No products available.</div>;
  }

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
          width: `${(totalCards / visibleCards) * 100}%`,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 p-2"
            style={{ width: `${100 / visibleCards}%` }}
          >
            <ProductCard
              itemId={item.id}
              imageUrls={[
                item.imageUrl || "https://via.placeholder.com/150",
              ]} // Fallback for empty imageUrl
              itemName={item.name}
              itemDescription={`Quantity: ${item.quantity}`} // Use quantity as description
              price={item.price.toFixed(2)} // Format price as string
              discountPrice="0" // Placeholder; update if discount available
              farmerName="Unknown Farmer" // Placeholder; update if farmer data available
              onViewDetails={() => handleViewDetails(item.id)}
            />
          </div>
        ))}
      </div>

      {totalCards > visibleCards && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: totalCards - visibleCards + 1 }).map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full ${
                currentIndex === index ? "bg-green-600" : "bg-gray-300"
              }`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSlider;