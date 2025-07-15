import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Users, MapPin, Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, QueueStatus, Hospital, Department } from '../types';
import toast from 'react-hot-toast';

interface AppointmentWithDetails extends Appointment {
  hospital: Hospital;
  department: Department;
  queue_position?: number;
}

const TrackQueue: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointment');
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails();
    } else if (user) {
      fetchLatestAppointment();
    }
  }, [appointmentId, user]);

  useEffect(() => {
    // Set up real-time subscription for queue updates
    if (appointment) {
      const subscription = supabase
        .channel('queue_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'queue_status',
            filter: `hospital_id=eq.${appointment.hospital_id}`,
          },
          () => {
            fetchQueueStatus();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [appointment]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          hospital:hospitals(*),
          department:departments(*)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      setAppointment(data as AppointmentWithDetails);
      await fetchQueueStatus(data.hospital_id, data.department_id);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestAppointment = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          hospital:hospitals(*),
          department:departments(*)
        `)
        .eq('user_id', user.id)
        .in('status', ['waiting', 'ready'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setAppointment(data as AppointmentWithDetails);
        await fetchQueueStatus(data.hospital_id, data.department_id);
      }
    } catch (error) {
      console.error('Error fetching latest appointment:', error);
      toast.error('Failed to load your appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStatus = async (hospitalId?: string, departmentId?: string) => {
    if (!hospitalId || !departmentId) return;

    try {
      const { data, error } = await supabase
        .from('queue_status')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('department_id', departmentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setQueueStatus(data || null);
    } catch (error) {
      console.error('Error fetching queue status:', error);
      toast.error('Failed to load queue status');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (appointment) {
      await fetchQueueStatus(appointment.hospital_id, appointment.department_id);
    }
    setRefreshing(false);
    toast.success('Queue status updated');
  };

  const getQueuePosition = () => {
    if (!appointment || !queueStatus) return 0;
    return Math.max(0, appointment.token_number - queueStatus.current_token);
  };

  const getEstimatedWaitTime = () => {
    if (!appointment || !queueStatus) return 0;
    const position = getQueuePosition();
    return position * (appointment.department.avg_time_per_patient || 15);
  };

  const getStatusColor = () => {
    const position = getQueuePosition();
    if (position === 0) return 'text-[#3EA96F]';
    if (position <= 2) return 'text-[#F7941D]';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    const position = getQueuePosition();
    if (position === 0) return CheckCircle;
    if (position <= 2) return AlertCircle;
    return Clock;
  };

  const getStatusMessage = () => {
    const position = getQueuePosition();
    if (position === 0) return "It's your turn! Please proceed to the department.";
    if (position === 1) return "You're next! Please be ready.";
    if (position <= 2) return "Your turn is approaching. Please be nearby.";
    return `You are #${position} in line. Please wait for your turn.`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2A5D9B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your appointment...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Appointment</h2>
          <p className="text-gray-600 mb-6">
            You don't have any active appointments to track. Book an appointment to get started.
          </p>
          <a
            href="/book"
            className="bg-[#F7941D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Book Appointment
          </a>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon();
  const queuePosition = getQueuePosition();
  const estimatedWait = getEstimatedWaitTime();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Track Your Queue
          </h1>
          <p className="text-lg text-gray-600">
            Real-time updates on your appointment status
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Queue Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Token Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2A5D9B] text-white rounded-full text-2xl font-bold mb-4">
                  T#{appointment.token_number}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Token Number</h2>
                <p className="text-gray-600">
                  {appointment.patient_name} • {appointment.patient_phone}
                </p>
              </div>
            </div>

            {/* Queue Status */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Queue Status</h3>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 text-[#2A5D9B] hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#2A5D9B] mb-2">
                    {queueStatus?.current_token || 0}
                  </div>
                  <p className="text-sm text-gray-600">Current Token</p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-2 ${getStatusColor()}`}>
                    {queuePosition}
                  </div>
                  <p className="text-sm text-gray-600">Your Position</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#F7941D] mb-2">
                    {estimatedWait}m
                  </div>
                  <p className="text-sm text-gray-600">Est. Wait Time</p>
                </div>
              </div>

              <div className={`mt-6 p-4 rounded-lg flex items-center space-x-3 ${
                queuePosition === 0 ? 'bg-green-50' : 
                queuePosition <= 2 ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <StatusIcon className={`h-6 w-6 ${getStatusColor()}`} />
                <p className={`font-medium ${getStatusColor()}`}>
                  {getStatusMessage()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Progress</h3>
              <div className="relative">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Token #{queueStatus?.current_token || 0}</span>
                  <span>Token #{appointment.token_number}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#2A5D9B] h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, Math.min(100, ((queueStatus?.current_token || 0) / appointment.token_number) * 100))}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appointment.hospital.name}</p>
                    <p className="text-sm text-gray-600">{appointment.hospital.location}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appointment.department.name}</p>
                    <p className="text-sm text-gray-600">
                      Avg. {appointment.department.avg_time_per_patient} min per patient
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Queue Info</p>
                    <p className="text-sm text-gray-600">
                      {queueStatus?.total_tokens || 0} total appointments today
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Booked At</p>
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-[#2A5D9B] mb-2">Important Notes</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Queue updates every 10 seconds automatically</li>
                  <li>• Arrive 5 minutes before your estimated time</li>
                  <li>• Bring valid ID and insurance documents</li>
                  <li>• Contact hospital if you need to reschedule</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackQueue;