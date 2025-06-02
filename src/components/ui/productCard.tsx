import { Button } from '../ui/button';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  itemId: string;
  imageUrls: string[]; // Array of base64 strings
  itemName: string;
  itemDescription: string;
  price: string; // Formatted as string (e.g., "24.50")
  discountPrice?: string; // Formatted as string (e.g., "20.00") or undefined
  farmerName: string;
  onViewDetails: () => void;
}

function ProductCard({
  itemId,
  imageUrls,
  itemName,
  itemDescription,
  price,
  discountPrice,
  farmerName,
  onViewDetails,
}: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id: itemId,
      name: itemName,
      price: parseFloat(price),
      imageUrl: imageUrls[0] || 'https://via.placeholder.com/150',
      description: itemDescription,
      discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
      farmerName,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <div className="h-48 overflow-hidden">
        <img
          src={imageUrls[0] || 'https://via.placeholder.com/150'}
          alt={itemName}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{itemName}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{itemDescription}</p>
        <p className="text-sm text-gray-500 mb-2">By: {farmerName}</p>
        <div className="flex items-center mb-4">
          <span className="text-green-600 font-bold text-xl">
            ₹{discountPrice || price}/kg
          </span>
          {discountPrice && (
            <span className="ml-2 text-sm text-gray-500 line-through">₹{price}/kg</span>
          )}
        </div>
        <div className="mt-auto flex space-x-2">
          <Button
            variant="outline"
            className="flex-grow border-green-600 text-green-600 hover:bg-green-50"
            onClick={onViewDetails}
          >
            View Details
          </Button>
          <Button
            className="flex-grow bg-green-600 hover:bg-green-700"
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;