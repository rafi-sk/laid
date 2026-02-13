import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Match {
  match_id: string;
  id: string;
  display_name: string;
  age: number;
  bio: string;
  photo: string;
  created_at: string;
}

export const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/matches`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Matches</h1>

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No matches yet</p>
            <button
              onClick={() => navigate('/discover')}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90"
            >
              Start Swiping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <div
                key={match.match_id}
                onClick={() => navigate(`/chat/${match.match_id}`)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition"
              >
                <img
                  src={match.photo || 'https://via.placeholder.com/300'}
                  alt={match.display_name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {match.display_name}, {match.age}
                  </h3>
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                    {match.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
