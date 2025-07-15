import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QueueAnalytics {
  today_stats: {
    total_appointments: number;
    completed: number;
    waiting: number;
    ready: number;
    cancelled: number;
  };
  department_stats: Array<{
    department_id: string;
    department_name: string;
    current_token: number;
    total_tokens: number;
    waiting_count: number;
    avg_wait_time: number;
  }>;
  hourly_bookings: Array<{
    hour: number;
    count: number;
  }>;
}

interface QueueAnalyticsProps {
  hospitalId: string;
}

const QueueAnalytics: React.FC<QueueAnalyticsProps> = ({ hospitalId }) => {
  const [analytics, setAnalytics] = useState<QueueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    
    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [hospitalId]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_queue_analytics', {
        hospital_id_param: hospitalId
      });

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { today_stats, department_stats, hourly_bookings } = analytics;

  // Calculate completion rate
  const completionRate = today_stats.total_appointments > 0 
    ? Math.round((today_stats.completed / today_stats.total_appointments) * 100)
    : 0;

  // Find peak hour
  const peakHour = hourly_bookings?.reduce((max, current) => 
    current.count > max.count ? current : max, { hour: 0, count: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Today's Overview</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-[#2A5D9B]">
              {today_stats.total_appointments}
            </div>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-[#3EA96F]">
              {today_stats.completed}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-[#F7941D]">
              {today_stats.waiting}
            </div>
            <p className="text-sm text-gray-600">Waiting</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {today_stats.ready}
            </div>
            <p className="text-sm text-gray-600">Ready</p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {today_stats.cancelled}
            </div>
            <p className="text-sm text-gray-600">Cancelled</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-[#3EA96F]" />
            <div>
              <div className="text-xl font-bold text-gray-900">{completionRate}%</div>
              <p className="text-sm text-gray-600">Completion Rate</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Clock className="h-8 w-8 text-[#F7941D]" />
            <div>
              <div className="text-xl font-bold text-gray-900">
                {peakHour?.hour || 0}:00
              </div>
              <p className="text-sm text-gray-600">Peak Hour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="h-5 w-5 text-[#2A5D9B]" />
          <h2 className="text-xl font-semibold text-gray-900">Department Performance</h2>
        </div>

        <div className="space-y-4">
          {department_stats?.map((dept) => {
            const efficiency = dept.total_tokens > 0 
              ? Math.round((dept.current_token / dept.total_tokens) * 100)
              : 0;

            return (
              <div key={dept.department_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.department_name}</h3>
                    <p className="text-sm text-gray-600">
                      Avg. {dept.avg_wait_time} min per patient
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#2A5D9B]">
                      {efficiency}%
                    </div>
                    <p className="text-xs text-gray-600">Efficiency</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-[#2A5D9B]">
                      {dept.current_token}
                    </div>
                    <p className="text-xs text-gray-600">Current</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[#F7941D]">
                      {dept.waiting_count}
                    </div>
                    <p className="text-xs text-gray-600">Waiting</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-600">
                      {dept.total_tokens}
                    </div>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#2A5D9B] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${efficiency}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Booking Chart */}
      {hourly_bookings && hourly_bookings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="h-5 w-5 text-[#2A5D9B]" />
            <h2 className="text-xl font-semibold text-gray-900">Hourly Bookings</h2>
          </div>

          <div className="flex items-end space-x-2 h-32">
            {Array.from({ length: 24 }, (_, hour) => {
              const booking = hourly_bookings.find(b => b.hour === hour);
              const count = booking?.count || 0;
              const maxCount = Math.max(...hourly_bookings.map(b => b.count));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={hour} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-[#2A5D9B] rounded-t transition-all duration-300 min-h-[4px]"
                    style={{ height: `${height}%` }}
                    title={`${hour}:00 - ${count} bookings`}
                  ></div>
                  <div className="text-xs text-gray-600 mt-1">
                    {hour}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueAnalytics;