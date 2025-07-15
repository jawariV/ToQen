import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AppointmentHistory from '../components/AppointmentHistory';
import { Appointment, Hospital, Department } from '../types';

interface ActiveAppointment extends Appointment {
  hospital: Hospital;
  department: Department;
  queue_position?: number;
}

const PatientDashboard: React.FC = () => {
  const [activeAppointments, setActiveAppointments] = useState<ActiveAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchActiveAppointments();
    }
  }, [user]);

  const fetchActiveAppointments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          hospital:hospitals(*),
          department:departments(*)
        `)
        .eq('user_id', user.id)
        .in('status', ['waiting', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveAppointments(data as ActiveAppointment[] || []);
    } catch (error) {
      console.error('Error fetching active appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-[#3EA96F] text-white';
      case 'waiting':
        return 'bg-[#F7941D] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready - Please proceed to department';
      case 'waiting':
        return 'Waiting in queue';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's your appointment overview.
            </p>
          </div>
          <Link
            to="/book"
            className="mt-4 md:mt-0 flex items-center space-x-2 bg-[#F7941D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Book New Appointment</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Appointments */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Appointments</h2>
              
              {activeAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No active appointments</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Book an appointment to start tracking your queue position
                  </p>
                  <Link
                    to="/book"
                    className="inline-flex items-center space-x-2 bg-[#2A5D9B] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Book Appointment</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#2A5D9B]">
                              T#{appointment.token_number}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              {getStatusMessage(appointment.status)}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {appointment.hospital.name}
                            </h3>
                            <p className="text-gray-600">{appointment.department.name}</p>
                            <p className="text-sm text-gray-500">
                              {appointment.hospital.location}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/track?appointment=${appointment.id}`}
                          className="bg-[#2A5D9B] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Track Queue
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            Booked: {new Date(appointment.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>
                            Est. {appointment.department.avg_time_per_patient} min/patient
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>Patient: {appointment.patient_name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment History */}
            <AppointmentHistory />
          </div>

          {/* Quick Actions & Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/book"
                  className="w-full flex items-center space-x-3 p-3 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Book New Appointment</span>
                </Link>
                <Link
                  to="/track"
                  className="w-full flex items-center space-x-3 p-3 bg-[#2A5D9B] text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Clock className="h-5 w-5" />
                  <span>Track Current Queue</span>
                </Link>
              </div>
            </div>

            {/* Tips & Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for Better Experience</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-[#3EA96F] rounded-full mt-2 flex-shrink-0"></div>
                  <p>Arrive 5-10 minutes before your estimated time</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-[#F7941D] rounded-full mt-2 flex-shrink-0"></div>
                  <p>Keep your phone notifications enabled for updates</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-[#2A5D9B] rounded-full mt-2 flex-shrink-0"></div>
                  <p>Bring valid ID and insurance documents</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Contact hospital directly for emergencies</p>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-gradient-to-br from-[#2A5D9B] to-blue-700 text-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Our support team is available 24/7 to assist you with any questions.
              </p>
              <div className="space-y-2 text-sm">
                <p>📞 +1 (555) 123-4567</p>
                <p>📧 support@toqen.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;