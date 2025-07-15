import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AppointmentHistoryItem {
  appointment_id: string;
  hospital_name: string;
  department_name: string;
  token_number: number;
  status: 'waiting' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  estimated_time: string;
}

const AppointmentHistory: React.FC = () => {
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_patient_history', {
        patient_id_param: user.id
      });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-[#3EA96F]" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'ready':
        return <AlertCircle className="h-5 w-5 text-[#F7941D]" />;
      default:
        return <Clock className="h-5 w-5 text-[#2A5D9B]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-[#3EA96F] bg-green-50';
      case 'cancelled':
        return 'text-red-500 bg-red-50';
      case 'ready':
        return 'text-[#F7941D] bg-orange-50';
      default:
        return 'text-[#2A5D9B] bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Appointment History</h2>
      
      {history.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No appointment history found</p>
          <p className="text-sm text-gray-500 mt-1">Your past appointments will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((appointment) => (
            <div
              key={appointment.appointment_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-[#2A5D9B]">
                        T#{appointment.token_number}
                      </span>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusIcon(appointment.status)}
                        <span className="capitalize">{appointment.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{appointment.hospital_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{appointment.department_name}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Booked: {new Date(appointment.created_at).toLocaleDateString()} at{' '}
                    {new Date(appointment.created_at).toLocaleTimeString()}
                  </div>
                </div>
                
                {appointment.status === 'waiting' && (
                  <a
                    href={`/track?appointment=${appointment.appointment_id}`}
                    className="ml-4 px-3 py-1 bg-[#2A5D9B] text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Track
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentHistory;