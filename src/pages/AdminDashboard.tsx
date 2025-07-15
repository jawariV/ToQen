import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  Play, 
  RotateCcw,
  Settings,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Hospital, Department, Appointment, QueueStatus } from '../types';
import DepartmentModal from '../components/DepartmentModal';
import QueueAnalytics from '../components/QueueAnalytics';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalAppointments: number;
  activeQueues: number;
  completedToday: number;
  averageWaitTime: number;
}

interface QueueWithDetails extends QueueStatus {
  department: Department;
  waitingCount: number;
  readyCount: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queues, setQueues] = useState<QueueWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    activeQueues: 0,
    completedToday: 0,
    averageWaitTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchHospitalData();
    }
  }, [user]);

  useEffect(() => {
    if (hospital) {
      const subscription = supabase
        .channel('admin_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'queue_status',
            filter: `hospital_id=eq.${hospital.id}`,
          },
          () => {
            fetchQueueData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `hospital_id=eq.${hospital.id}`,
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [hospital]);

  const fetchHospitalData = async () => {
    try {
      setLoading(true);
      
      // Fetch hospital
      const { data: hospitalData, error: hospitalError } = await supabase
        .from('hospitals')
        .select('*')
        .eq('admin_id', user?.id)
        .single();

      if (hospitalError) throw hospitalError;
      setHospital(hospitalData);

      // Fetch departments
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('hospital_id', hospitalData.id)
        .order('name');

      if (deptError) throw deptError;
      setDepartments(departmentsData || []);

      await fetchQueueData(hospitalData.id);
      await fetchStats(hospitalData.id);
    } catch (error) {
      console.error('Error fetching hospital data:', error);
      toast.error('Failed to load hospital data');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueData = async (hospitalId?: string) => {
    const targetHospitalId = hospitalId || hospital?.id;
    if (!targetHospitalId) return;

    try {
      const { data: queueData, error } = await supabase
        .from('queue_status')
        .select(`
          *,
          department:departments(*)
        `)
        .eq('hospital_id', targetHospitalId);

      if (error) throw error;

      // Get appointment counts for each department
      const queuesWithCounts = await Promise.all(
        (queueData || []).map(async (queue) => {
          const { data: waitingCount } = await supabase
            .from('appointments')
            .select('id', { count: 'exact' })
            .eq('department_id', queue.department_id)
            .eq('status', 'waiting');

          const { data: readyCount } = await supabase
            .from('appointments')
            .select('id', { count: 'exact' })
            .eq('department_id', queue.department_id)
            .eq('status', 'ready');

          return {
            ...queue,
            waitingCount: waitingCount?.length || 0,
            readyCount: readyCount?.length || 0,
          };
        })
      );

      setQueues(queuesWithCounts as QueueWithDetails[]);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast.error('Failed to load queue data');
    }
  };

  const fetchStats = async (hospitalId?: string) => {
    const targetHospitalId = hospitalId || hospital?.id;
    if (!targetHospitalId) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Total appointments today
      const { data: totalData } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('hospital_id', targetHospitalId)
        .gte('created_at', `${today}T00:00:00`);

      // Completed appointments today
      const { data: completedData } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('hospital_id', targetHospitalId)
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`);

      // Active queues (departments with waiting patients)
      const { data: activeData } = await supabase
        .from('queue_status')
        .select('id', { count: 'exact' })
        .eq('hospital_id', targetHospitalId)
        .gt('total_tokens', 0);

      setStats({
        totalAppointments: totalData?.length || 0,
        completedToday: completedData?.length || 0,
        activeQueues: activeData?.length || 0,
        averageWaitTime: 25, // This would be calculated based on actual data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAdvanceQueue = async (departmentId: string) => {
    if (!hospital) return;

    try {
      const { data, error } = await supabase.rpc('advance_queue', {
        dept_id: departmentId,
        hospital_id: hospital.id,
      });

      if (error) throw error;

      toast.success(`Advanced to token #${data}`);
      await fetchQueueData();
      await fetchStats();
    } catch (error) {
      console.error('Error advancing queue:', error);
      toast.error('Failed to advance queue');
    }
  };

  const handleResetQueue = async (departmentId: string) => {
    if (!hospital) return;
    
    if (!confirm('Are you sure you want to reset this queue? This will cancel all waiting appointments.')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('reset_department_queue', {
        dept_id: departmentId,
        hospital_id: hospital.id,
      });

      if (error) throw error;

      toast.success('Queue reset successfully');
      await fetchQueueData();
      await fetchStats();
    } catch (error) {
      console.error('Error resetting queue:', error);
      toast.error('Failed to reset queue');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQueueData();
    await fetchStats();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleDepartmentModalClose = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
  };

  const handleDepartmentSuccess = () => {
    fetchHospitalData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2A5D9B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Hospital Found</h2>
          <p className="text-gray-600 mb-6">
            You don't have a hospital associated with your admin account.
          </p>
          <a
            href="/admin/register"
            className="bg-[#F7941D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Register Hospital
          </a>
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
            <h1 className="text-3xl font-bold text-gray-900">{hospital.name}</h1>
            <p className="text-gray-600 mt-1">{hospital.location}</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowDepartmentModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#2A5D9B] text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-[#2A5D9B]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-[#3EA96F]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Queues</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeQueues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-[#F7941D]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageWaitTime}m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Management */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Queue Management</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {queues.map((queue) => (
                    <div key={queue.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {queue.department.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Avg. {queue.department.avg_time_per_patient} min per patient
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingDepartment(queue.department)}
                            className="p-2 text-gray-400 hover:text-[#2A5D9B]"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#2A5D9B]">
                            {queue.current_token}
                          </div>
                          <p className="text-xs text-gray-600">Current Token</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#F7941D]">
                            {queue.waitingCount}
                          </div>
                          <p className="text-xs text-gray-600">Waiting</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#3EA96F]">
                            {queue.readyCount}
                          </div>
                          <p className="text-xs text-gray-600">Ready</p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAdvanceQueue(queue.department_id)}
                          disabled={queue.total_tokens === 0}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-[#3EA96F] text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play className="h-4 w-4" />
                          <span>Next Token</span>
                        </button>
                        <button
                          onClick={() => handleResetQueue(queue.department_id)}
                          className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="xl:col-span-1">
            <QueueAnalytics hospitalId={hospital.id} />
          </div>
        </div>
      </div>

      {/* Department Modal */}
      <DepartmentModal
        isOpen={showDepartmentModal || !!editingDepartment}
        onClose={handleDepartmentModalClose}
        department={editingDepartment}
        hospitalId={hospital?.id || ''}
        onSuccess={handleDepartmentSuccess}
      />
    </div>
  );
};

export default AdminDashboard;