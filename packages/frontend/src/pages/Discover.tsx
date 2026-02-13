import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Profile {
  id: string;
  display_name: string;
  age: number;
  bio: string;
  location: string;
  interests: string[];
  photos: string[];
}

export const Discover = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/discovery/feed`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= profiles.length) return;

    const currentProfile = profiles[currentIndex];
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`${API_URL}/discovery/swipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          swipedId: currentProfile.id,
          direction,
        }),
      });

      const data = await response.json();
      if (data.match) {
        setShowMatch(true);
        setTimeout(() => setShowMatch(false), 3000);
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      console.error('Swipe failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No more profiles</h2>
          <p className="text-gray-600">Check back later for new matches!</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <AnimatePresence>
        {showMatch && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          >
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">💕</div>
              <h2 className="text-3xl font-bold text-primary mb-2">It's a Match!</h2>
              <p className="text-gray-600">You can now message each other</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md">
        <motion.div
          key={currentProfile.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="relative h-96">
            <img
              src={currentProfile.photos[0] || 'https://via.placeholder.com/400'}
              alt={currentProfile.display_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 text-white">
              <h2 className="text-3xl font-bold">
                {currentProfile.display_name}, {currentProfile.age}
              </h2>
              <p className="text-sm">{currentProfile.location}</p>
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 mb-4">{currentProfile.bio}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {currentProfile.interests?.map((interest, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {interest}
                </span>
              ))}
            </div>

            <div className="flex justify-center gap-6">
              <button
                onClick={() => handleSwipe('left')}
                className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl hover:bg-gray-300 transition"
              >
                ✕
              </button>
              <button
                onClick={() => handleSwipe('right')}
                className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl text-white hover:bg-opacity-90 transition"
              >
                ♥
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
