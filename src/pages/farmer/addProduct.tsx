import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import { Button } from '../../components/ui/button';
import { FaPlus, FaCheckCircle, FaHandshake } from 'react-icons/fa';
import { LayoutDashboard, Leaf, ListCheckIcon, Loader2, LucideSprout, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import Sidebar from '../../components/ui/sidebar';
import { useTranslation } from 'react-i18next';

interface ProductItem {
  id: string;
  ownerUserId: string;
  itemName: string;
  itemDescription: string;
  price: number;
  discountPrice?: number;
  stock: number;
  itemType: string;
  category?: string;
  imageUrls: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  ratings: any[];
  totalSales: number;
}

const AddProductForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [itemType, setItemType] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const productTypes = [
    t('productTypes.fruits'),
    t('productTypes.vegetables'),
    t('productTypes.dairy'),
    t('productTypes.grains'),
    t('productTypes.meat'),
    t('productTypes.poultry'),
    t('productTypes.seafood'),
    t('productTypes.herbs'),
    t('productTypes.other'),
  ];

  const categoryOptions = [
    { value: 'Organic', label: t('organic') },
    { value: 'Premium', label: t('premium') },
  ];

  // Fetch existing products
  useEffect(() => {
    if (!user) {
      setError(t('error.notLoggedIn'));
      setLoading(false);
      return;
    }

    const farmerId = user.uid;
    const q = query(collection(db, 'items'), where('ownerUserId', '==', farmerId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const itemsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ProductItem[];
        setProducts(itemsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching products:', err);
        setError(t('error.loadProducts'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, t]);

  // Calculate form completion progress
  const requiredFields = [itemName, itemDescription, price, stock, itemType];
  const filledFields = requiredFields.filter((field) => field !== '').length;
  const totalFields = requiredFields.length;
  const progress = (filledFields / totalFields) * 100;

  const handleAddImageField = () => {
    setImageUrls([...imageUrls, '']);
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newImageUrls = [...imageUrls];
    newImageUrls[index] = value;
    setImageUrls(newImageUrls);
  };

  const handleSubmit = () => {
    if (!itemName || !itemDescription || !price || !stock || !itemType) {
      setFormError(t('error.requiredFields'));
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedDiscountPrice = discountPrice ? parseFloat(discountPrice) : null;
    const parsedStock = parseInt(stock);

    if (parsedPrice <= 0) {
      setFormError(t('error.invalidPrice'));
      return;
    }

    if (parsedDiscountPrice && parsedDiscountPrice >= parsedPrice) {
      setFormError(t('error.invalidDiscountPrice'));
      return;
    }

    if (parsedStock < 0) {
      setFormError(t('error.invalidStock'));
      return;
    }

    if (imageUrls.every((url) => !url.trim())) {
      setFormError(t('error.noImages'));
      return;
    }

    setShowConfirmation(true);
  };

  const handleFinalizeDetails = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Filter out empty image URLs
      const filteredImageUrls = imageUrls.filter((url) => url.trim() !== '');

      if (filteredImageUrls.length === 0) {
        setFormError(t('error.noImages'));
        setLoading(false);
        return;
      }

      // Save product data to Firestore
      await addDoc(collection(db, 'items'), {
        ownerUserId: user.uid,
        itemName,
        itemDescription,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        stock: parseInt(stock),
        itemType,
        category: category || null,
        imageUrls: filteredImageUrls,
        status: t('status.active'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ratings: [],
        totalSales: 0,
      });

      // Reset form and close modal
      setItemName('');
      setItemDescription('');
      setPrice('');
      setDiscountPrice('');
      setStock('');
      setItemType('');
      setCategory('');
      setImageUrls(['']);
      setIsModalOpen(false);
      setShowConfirmation(false);
      alert(t('success.productAdded'));
    } catch (err: any) {
      console.error('Error adding product:', err);
      setFormError(t('error.addProductFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#2CD14D]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600 font-sans">{error}</h2>
        </div>
      </div>
    );
  }

  const getMenuItems = () => {
    return [
      {
        label: t('dashboard'),
        onClick: () => navigate('/farmer/homePage'),
        icon: <LayoutDashboard className="text-white" />,
      },
      {
        label: t('addProduct'),
        onClick: () => navigate('/farmer/add-product'),
        icon: <LucideSprout className="text-white" />,
      },
      {
        label: t('orders'),
        onClick: () => navigate('/farmer/orders'),
        icon: <ListCheckIcon className="text-white" />,
      },
      {
        label: t('biding'),
        onClick: () => navigate('/farmer/biding'),
        icon: <FaHandshake className="text-white" />,
      },
      {
        label: t('advisory'),
        onClick: () => navigate('/farmer/advisory'),
        icon: <Leaf className="text-white" />,
      },
      {
        label: t('settings'),
        onClick: () => navigate('/farmer/settings'),
        icon: <Settings className="text-white" />,
      },
    ];
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar menuItems={getMenuItems()} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-800">{t('addNewProduct')}</h1>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2CD14D] hover:bg-[#24B042] text-white flex items-center space-x-2"
          >
            <FaPlus className="h-4 w-4" />
            <span>{t('addProduct')}</span>
          </Button>
        </div>

        {/* Modal for Adding Product */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-green-50 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] overflow-y-auto relative">
              {!showConfirmation ? (
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 font-sans">{t('addNewProduct')}</h2>
                  {/* Progress Indicator */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 font-sans">{t('formProgress')}</span>
                      <span className="text-sm font-medium text-[#2CD14D] font-sans">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[#2CD14D] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {formError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 font-sans">
                      {formError}
                    </div>
                  )}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                        {t('productName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                        placeholder={t('placeholder.productName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                        {t('description')} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={itemDescription}
                        onChange={(e) => setItemDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                        placeholder={t('placeholder.description')}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                          {t('price')} (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                          placeholder={t('placeholder.price')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                          {t('discountPrice')} (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discountPrice}
                          onChange={(e) => setDiscountPrice(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                          placeholder={t('placeholder.discountPrice')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                        {t('stock')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                        placeholder={t('placeholder.stock')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                        {t('productType')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={itemType}
                        onChange={(e) => setItemType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                      >
                        <option value="" disabled>
                          {t('placeholder.selectProductType')}
                        </option>
                        {productTypes.map((type, index) => (
                          <option
                            key={index}
                            value={Object.values(t('productTypes', { returnObjects: true }))[index]}
                          >
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                        {t('category')} ({t('optional')})
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                      >
                        <option value="">{t('selectCategory')}</option>
                        {categoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-sans mb-1">
                        {t('imageUrls')} <span className="text-red-500">*</span>
                      </label>
                      {imageUrls.map((url, index) => (
                        <div key={index} className="flex items-center space-x-2 mt-2">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => handleImageUrlChange(index, e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2CD14D] focus:border-transparent font-sans"
                            placeholder={t('placeholder.imageUrl', { index: index + 1 })}
                          />
                        </div>
                      ))}
                      <Button
                        onClick={handleAddImageField}
                        className="mt-2 bg-gray-600 hover:bg-gray-700 text-white flex items-center space-x-2"
                      >
                        <FaPlus className="h-4 w-4" />
                        <span>{t('addAnotherUrl')}</span>
                      </Button>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => setIsModalOpen(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-sans"
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        className="bg-[#2CD14D] hover:bg-[#24B042] text-white font-sans flex items-center space-x-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <FaCheckCircle className="h-4 w-4" />
                            <span>{t('submitProduct')}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 font-sans">{t('confirmProductDetails')}</h2>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-600 font-sans">{t('productName')}:</span>
                      <p className="text-lg text-gray-800 font-sans">{itemName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 font-sans">{t('description')}:</span>
                      <p className="text-gray-700 font-sans">{itemDescription}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600 font-sans">{t('price')}:</span>
                        <p className="text-gray-700 font-sans">₹{price}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600 font-sans">{t('discountPrice')}:</span>
                        <p className="text-gray-700 font-sans">{discountPrice ? `₹${discountPrice}` : t('na')}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 font-sans">{t('stock')}:</span>
                      <p className="text-gray-700 font-sans">{stock} {t('units')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 font-sans">{t('productType')}:</span>
                      <p className="text-gray-700 font-sans">{itemType}</p>
                    </div>
                    {category && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 font-sans">{t('category')}:</span>
                        <p className="text-gray-700 font-sans">{category}</p>
                      </div>
                    )}
                    {imageUrls.some((url) => url.trim() !== '') && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 font-sans">{t('images')}:</span>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {imageUrls
                            .filter((url) => url.trim() !== '')
                            .map((url, index) => (
                              <img
                                key={`url-${index}`}
                                src={url}
                                alt={t('productImageFromUrl')}
                                className="w-full h-20 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/80?text=Invalid+URL';
                                }}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-sans"
                    >
                      {t('back')}
                    </Button>
                    <Button
                      onClick={handleFinalizeDetails}
                      className="bg-[#2CD14D] hover:bg-[#24B042] text-white font-sans flex items-center space-x-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <FaCheckCircle className="h-4 w-4" />
                          <span>{t('confirmAndAdd')}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Display Existing Products */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 font-sans">{t('yourProducts')}</h2>
          {products.length === 0 ? (
            <div className="text-center text-gray-600 font-sans py-12 bg-white rounded-2xl shadow-lg">
              {t('noProductsFound')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    {product.imageUrls[0] ? (
                      <img
                        src={product.imageUrls[0]}
                        alt={product.itemName}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 font-sans">{t('noImage')}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-800 font-sans">{product.itemName}</div>
                      <div className="text-sm text-gray-600 font-sans line-clamp-2">{product.itemDescription}</div>
                      <div className="text-sm text-gray-600 font-sans mt-1">
                        {t('price')}: ₹{product.price}{' '}
                        {product.discountPrice && <span className="text-[#2CD14D]">(₹{product.discountPrice})</span>}
                      </div>
                      <div className="text-sm text-gray-600 font-sans">{t('stock')}: {product.stock} {t('units')}</div>
                      <div className="text-sm text-gray-600 font-sans">{t('productType')}: {product.itemType}</div>
                      {product.category && (
                        <div className="text-sm text-gray-600 font-sans">{t('category')}: {product.category}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProductForm;