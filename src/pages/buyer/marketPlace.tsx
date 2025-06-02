import React, { useState, useEffect } from 'react';
import { ChevronDown, ClipboardList,  LayoutDashboard, Settings, ShoppingCart } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Slider } from '../../components/ui/slider';
import ProductCard from '../../components/ui/productCard';
import {  FaShoppingCart, FaStore, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Sidebar from '../../components/ui/sidebar';
import { BiTrendingUp } from 'react-icons/bi';

interface Product {
  itemId: string;
  itemName: string;
  itemDescription: string;
  price: number;
  discountPrice: number | null;
  imageUrls: string[];
  category: string | null;
  farmerName: string;
}

const MarketPlace: React.FC = () => {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'default' | 'priceLowToHigh' | 'priceHighToLow'>('default');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const categories = ['Fruits', 'Vegetables', 'Dairy', 'Grains', 'Meat', 'Poultry', 'Seafood', 'Herbs', 'Other'];

  // Fetch products from Firestore
  useEffect(() => {
    const itemsCollection = collection(db, 'items');
    const unsubscribe = onSnapshot(itemsCollection, async (snapshot) => {
      setIsLoading(true);
      const productsData: Product[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        let farmerName = '';
        if (data.ownerUserId) {
          const userDocRef = doc(db, 'farmer', data.ownerUserId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            farmerName = userDoc.data().fullName || 'Unknown Farmer';
          }
        }

        productsData.push({
          itemId: docSnapshot.id,
          itemName: data.itemName,
          itemDescription: data.itemDescription,
          price: data.price,
          discountPrice: data.discountPrice || null,
          imageUrls: data.imageUrls || [],
          category: data.itemType || null,
          farmerName,
        });
      }

      setProducts(productsData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch product details for modal
  const fetchProductDetails = async (itemId: string) => {
    setModalLoading(true);
    try {
      const itemDocRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemDocRef);
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        let farmerName = 'Unknown Farmer';
        if (data.ownerUserId) {
          const userDocRef = doc(db, 'farmer', data.ownerUserId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            farmerName = userDoc.data().displayName || 'Unknown Farmer';
          }
        }

        const product: Product = {
          itemId: itemDoc.id,
          itemName: data.itemName,
          itemDescription: data.itemDescription,
          price: data.price,
          discountPrice: data.discountPrice || null,
          imageUrls: data.imageUrls || [],
          category: data.itemType || null,
          farmerName,
        };
        setSelectedProduct(product);
        setShowModal(true);
      } else {
        console.error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product =>
      product.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategories.length === 0 || (product.category && selectedCategories.includes(product.category))) &&
      product.price >= priceRange[0] && product.price <= priceRange[1]
    )
    .sort((a, b) => {
      if (sortOption === 'priceLowToHigh') {
        return a.price - b.price;
      } else if (sortOption === 'priceHighToLow') {
        return b.price - a.price;
      }
      return 0;
    });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSortOption('default');
    setPriceRange([0, 10000]);
    setSelectedCategories([]);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      console.log('Added to cart:', selectedProduct.itemName); // Placeholder for cart integration
      // Future: Use useCart to add the item
    }
    handleCloseModal();
  };
   const getMenuItems = () => {
    const commonItems = [
      {
        label: "Dashboard",
        onClick: () => navigate("/buyer/homepage"),
        icon: <LayoutDashboard className="text-white" />},
      {
        label: "Marketplace",
        onClick: () => navigate("/marketplace"),
        icon: <FaStore className="text-white" />
      },
      {
        label: "Orders",
        icon: (
          <div className="flex items-center">
            <FaShoppingCart className="text-white" />
            {totalItems > 0 && (
              <span className="ml-2 bg-white text-green-600 text-xs font-bold px-2 py-1 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
        ),
        onClick: () => navigate("/cart")
      },
       {
        label: "Purchase History",
        onClick: () => navigate("/purchase-history"),
        icon: <ClipboardList className="text-white" />
      },
      {
        label: "Biding Items",
        onClick: () => navigate("/buyer/biding"),
        icon: <BiTrendingUp className="text-white" />
      },
      {
        label: "Settings",
        onClick: () => navigate("/buyer/settings"),
        icon: <Settings className="text-white" />
      }
    ];

    return [
      ...commonItems,
    ];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Sidebar menuItems={getMenuItems()} />
      {/* Header with search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
         <div className="flex items-center">
           
            <h1 className="text-3xl font-bold text-gray-900 font-sans">
              Marketplace
            </h1>
          </div>
        <div className="relative w-full md:w-96">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content area */}
        <div className="flex-1">
          {/* Sorting controls */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-gray-600">
              Showing {filteredProducts.length} products
            </p>
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="default">Default sorting</option>
                <option value="priceLowToHigh">Price: Low to High</option>
                <option value="priceHighToLow">Price: High to Low</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Product grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.itemId}
                  itemId={product.itemId}
                  imageUrls={[product.imageUrls[0] || 'https://via.placeholder.com/150']}
                  itemName={product.itemName}
                  price={product.price.toFixed(2)}
                  discountPrice={product.discountPrice ? product.discountPrice.toFixed(2) : undefined}
                  itemDescription={product.itemDescription}
                  farmerName={product.farmerName}
                  onViewDetails={() => fetchProductDetails(product.itemId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                Reset all filters
              </Button>
            </div>
          )}
        </div>
        <div className="lg:w-64">


          <div className={`bg-white p-6 rounded-lg shadow-md ${isFilterOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Reset all
              </Button>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Price Range</h3>
              <Slider
                value={priceRange}
                onValueChange={(value) => setPriceRange([value[0], value[1]])}
                min={0}
                max={10000}
                step={5}
                className="my-4"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="h-4 w-4 text-green-600 rounded"
                    />
                    <label htmlFor={`category-${category}`} className="ml-2 capitalize">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full flex items-center justify-between border-green-600 text-green-600 hover:bg-green-50"
                onClick={() => navigate('/cart')}
              >
                <div className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <span>My Cart</span>
                </div>
                {totalItems > 0 && (
                  <span className="ml-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>

            {/* Close button for mobile */}
            <div className="lg:hidden">
              <Button
                variant="default"
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => setIsFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>

      </div>
      

      {/* Product Details Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-gradient-to-b from-green-0 to-green-100 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 font-sans">{selectedProduct.itemName}</h3>
              <Button
                variant="ghost"
                onClick={handleCloseModal}
                className="text-gray-600 hover:text-gray-900"
              >
                <FaTimes className="h-5 w-5" />
              </Button>
            </div>

            {/* Product Image */}
            <div className="mb-4">
              <img
                src={selectedProduct.imageUrls[0] || 'https://via.placeholder.com/150'}
                alt={selectedProduct.itemName}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>

            {/* Product Details */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 font-sans">Description</h4>
                <p className="text-gray-600 text-sm font-sans">{selectedProduct.itemDescription}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 font-sans">Price</h4>
                <div className="flex items-center space-x-2">
                  {selectedProduct.discountPrice ? (
                    <>
                      <p className="text-gray-600 text-sm font-sans line-through">₹{selectedProduct.price.toFixed(2)}</p>
                      <p className="text-green-600 text-sm font-sans font-semibold">
                        ₹{selectedProduct.discountPrice.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-sm font-sans">₹{selectedProduct.price.toFixed(2)}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 font-sans">Category</h4>
                <p className="text-gray-600 text-sm font-sans">{selectedProduct.category || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 font-sans">Farmer</h4>
                <p className="text-gray-600 text-sm font-sans">{selectedProduct.farmerName}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 font-sans"
              >
                Close
              </Button>
              <Button
                onClick={handleAddToCart}
                className="bg-green-600 hover:bg-green-700 text-white font-sans"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Modal */}
      {modalLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="text-white text-lg font-medium">Loading product details...</div>
        </div>
      )}
    </div>
  );
};

export default MarketPlace;