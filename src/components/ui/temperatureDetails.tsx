
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Sun, Droplet, Sunrise, Thermometer } from 'lucide-react';
import { useAuth } from '../../context/authContext';


interface WeatherData {
  temp_c: number;
  condition: string;
  humidity: number;
  sunrise: string;
  sunset: string;
  temp_high: number;
  temp_low: number;
  location: string;
  region: string;
  country: string;
}

const TemperatureDetail = () => {
  const { user } = useAuth();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchUserLocationAndWeather = async () => {
      if (!user || !user.role) {
        setError('User not authenticated or role not defined.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch user location from Firestore based on role
        let city = 'Indore'; // Fallback location
        const collectionName = user.role === 'farmer' ? 'farmer' : 'buyer';
        const userDoc = await getDoc(doc(db, collectionName, user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          city = userData.address || userData.location || city;
        } else {
          throw new Error('User data not found in Firestore.');
        }

        // Fetch weather data from WeatherAPI.com
        const weatherApiKey = '611a13394ba74614994144351252905';
        const weatherResponse = await fetch(
          `http://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${encodeURIComponent(
            city
          )}&days=1&aqi=no&alerts=no`
        );
        if (!weatherResponse.ok) {
          throw new Error('Failed to fetch weather data');
        }
        const weatherJson = await weatherResponse.json();

        // Map API response to WeatherData interface
        const weather: WeatherData = {
          temp_c: weatherJson.current.temp_c,
          condition: weatherJson.current.condition.text,
          humidity: weatherJson.current.humidity,
          sunrise: weatherJson.forecast.forecastday[0].astro.sunrise,
          sunset: weatherJson.forecast.forecastday[0].astro.sunset,
          temp_high: weatherJson.forecast.forecastday[0].day.maxtemp_c,
          temp_low: weatherJson.forecast.forecastday[0].day.mintemp_c,
          location: weatherJson.location.name,
          region: weatherJson.location.region,
          country: weatherJson.location.country,
        };

        setWeatherData(weather);
      } catch (err) {
        setError('Unable to load weather data. Please try again later.');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocationAndWeather();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full">
        <p className="text-gray-600 font-medium text-sm font-sans">Loading weather data...</p>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full">
        <p className="text-red-600 font-medium text-sm font-sans">{error || 'No weather data available.'}</p>
      </div>
    );
  }

  const isGoodForHarvesting = weatherData.temp_c >= 20 && weatherData.temp_c <= 30;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center font-sans">
          <Sun className="text-green-600 mr-3 text-2xl" />
          Weather Forecast
        </h2>
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-4xl font-bold text-gray-800 font-sans">{weatherData.temp_c}°C</p>
            <p className="text-gray-600 text-sm font-sans">{weatherData.condition}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-800 font-sans">{weatherData.location}</p>
            <p className="text-gray-600 text-sm font-sans">{`${weatherData.region}, ${weatherData.country}`}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center">
            <Droplet className="text-blue-500 mr-3 h-5 w-5" />
            <div>
              <p className="text-gray-600 text-sm font-sans">Humidity</p>
              <p className="font-medium text-gray-800 font-sans">{weatherData.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center">
            <Sunrise className="text-yellow-500 mr-3 h-5 w-5" />
            <div>
              <p className="text-gray-600 text-sm font-sans">Sunrise</p>
              <p className="font-medium text-gray-800 font-sans">{weatherData.sunrise}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Thermometer className="text-red-500 mr-3 h-5 w-5" />
            <div>
              <p className="text-gray-600 text-sm font-sans">High</p>
              <p className="font-medium text-gray-800 font-sans">{weatherData.temp_high}°C</p>
            </div>
          </div>
          <div className="flex items-center">
            <Sun className="text-orange-500 mr-3 h-5 w-5" />
            <div>
              <p className="text-gray-600 text-sm font-sans">Location</p>
              <p className="font-medium text-gray-800 font-sans">{weatherData.region}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="text-green-700 text-sm font-sans">
            {isGoodForHarvesting ? 'Perfect for harvesting' : 'Check weather conditions for optimal harvesting'}
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowDetails(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-full text-base font-sans transition-colors duration-200"
          >
            View Details
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="fixed inset-0 bg-green-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto relative scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 font-sans"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-sans">
              Weather Details - {weatherData.location}
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-4xl font-bold text-gray-800 font-sans">{weatherData.temp_c}°C</p>
                <p className="text-gray-600 text-sm font-sans">{weatherData.condition}</p>
                <p className="text-gray-600 text-sm font-sans mt-2">{`${weatherData.region}, ${weatherData.country}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center">
                  <Droplet className="text-blue-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Humidity</p>
                    <p className="font-medium text-gray-800 font-sans">{weatherData.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Sunrise className="text-yellow-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Sunrise</p>
                    <p className="font-medium text-gray-800 font-sans">{weatherData.sunrise}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Thermometer className="text-red-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">High</p>
                    <p className="font-medium text-gray-800 font-sans">{weatherData.temp_high}°C</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Sun className="text-orange-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Location</p>
                    <p className="font-medium text-gray-800 font-sans">{weatherData.region}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Sun className="text-yellow-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Sunset</p>
                    <p className="font-medium text-gray-800 font-sans">{weatherData.sunset}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Thermometer className="text-blue-500 mr-3 h-5 w-5" />
                  <div>
                    <p className="text-gray-600 text-sm font-sans">Low</p>
                    <p className="font-medium text-gray-800 font-sans">{weatherData.temp_low}°C</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-green-700 text-sm font-sans">
                  {isGoodForHarvesting
                    ? 'Perfect for harvesting. Consider scheduling outdoor activities in the morning.'
                    : 'Weather may not be ideal for harvesting. Check conditions before planning.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemperatureDetail;