import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Building, User, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const adminRegisterSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'),
  hospitalName: yup
    .string()
    .required('Hospital name is required')
    .min(3, 'Hospital name must be at least 3 characters'),
  hospitalLocation: yup
    .string()
    .required('Hospital location is required')
    .min(5, 'Please provide a detailed location'),
  avgConsultationTime: yup
    .number()
    .required('Average consultation time is required')
    .min(5, 'Minimum 5 minutes')
    .max(120, 'Maximum 120 minutes'),
});

interface AdminRegisterFormData {
  email: string;
  phone: string;
  hospitalName: string;
  hospitalLocation: string;
  avgConsultationTime: number;
}

const AdminRegister: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminRegisterFormData>({
    resolver: yupResolver(adminRegisterSchema),
    defaultValues: {
      avgConsultationTime: 20,
    },
  });

  const onSubmit = async (data: AdminRegisterFormData) => {
    setIsSubmitting(true);

    try {
      // First, sign up the admin user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        phone: data.phone,
        options: {
          data: {
            role: 'admin',
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Update user role to admin
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: data.email,
          phone: data.phone,
          role: 'admin',
        });

      if (userError) throw userError;

      // Create hospital record
      const { data: hospitalData, error: hospitalError } = await supabase
        .from('hospitals')
        .insert({
          name: data.hospitalName,
          location: data.hospitalLocation,
          admin_id: authData.user.id,
          avg_consultation_time: data.avgConsultationTime,
        })
        .select()
        .single();

      if (hospitalError) throw hospitalError;

      // Create default departments
      const defaultDepartments = [
        { name: 'General Medicine', avg_time_per_patient: 15 },
        { name: 'Emergency', avg_time_per_patient: 10 },
        { name: 'Cardiology', avg_time_per_patient: 30 },
        { name: 'Orthopedics', avg_time_per_patient: 25 },
        { name: 'Pediatrics', avg_time_per_patient: 12 },
      ];

      const { error: deptError } = await supabase
        .from('departments')
        .insert(
          defaultDepartments.map(dept => ({
            hospital_id: hospitalData.id,
            name: dept.name,
            avg_time_per_patient: dept.avg_time_per_patient,
          }))
        );

      if (deptError) throw deptError;

      // Initialize queue status for all departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id')
        .eq('hospital_id', hospitalData.id);

      if (departments) {
        const { error: queueError } = await supabase
          .from('queue_status')
          .insert(
            departments.map(dept => ({
              hospital_id: hospitalData.id,
              department_id: dept.id,
              current_token: 0,
              total_tokens: 0,
            }))
          );

        if (queueError) throw queueError;
      }

      toast.success('Hospital admin account created successfully!');
      toast.success('Please check your email to verify your account');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Building className="h-12 w-12 text-[#2A5D9B]" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Register Hospital Admin
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create an admin account for your hospital
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Admin Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    placeholder="admin@hospital.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    placeholder="+1234567890"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hospital Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Hospital Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700">
                    <Building className="inline h-4 w-4 mr-1" />
                    Hospital Name
                  </label>
                  <input
                    {...register('hospitalName')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    placeholder="City General Hospital"
                  />
                  {errors.hospitalName && (
                    <p className="mt-1 text-sm text-red-600">{errors.hospitalName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="hospitalLocation" className="block text-sm font-medium text-gray-700">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Hospital Location
                  </label>
                  <input
                    {...register('hospitalLocation')}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    placeholder="123 Main St, Downtown, City"
                  />
                  {errors.hospitalLocation && (
                    <p className="mt-1 text-sm text-red-600">{errors.hospitalLocation.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="avgConsultationTime" className="block text-sm font-medium text-gray-700">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Average Consultation Time (minutes)
                  </label>
                  <input
                    {...register('avgConsultationTime')}
                    type="number"
                    min="5"
                    max="120"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    placeholder="20"
                  />
                  {errors.avgConsultationTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.avgConsultationTime.message}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2A5D9B] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2A5D9B] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
            <div className="mt-6">
              <a
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;