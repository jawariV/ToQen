import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Calendar, MapPin, User, Phone, Mail, Clock } from 'lucide-react';
import { useHospitals, useDepartments } from '../hooks/useHospitals';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const bookingSchema = yup.object({
  hospitalId: yup.string().required('Please select a hospital'),
  departmentId: yup.string().required('Please select a department'),
  patientName: yup.string().required('Patient name is required'),
  patientPhone: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'),
  patientEmail: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
});

interface BookingFormData {
  hospitalId: string;
  departmentId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
}

const BookAppointment: React.FC = () => {
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { hospitals, loading: hospitalsLoading } = useHospitals();
  const { departments, loading: departmentsLoading } = useDepartments(selectedHospital);
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BookingFormData>({
    resolver: yupResolver(bookingSchema),
  });

  const watchedHospitalId = watch('hospitalId');

  React.useEffect(() => {
    if (watchedHospitalId !== selectedHospital) {
      setSelectedHospital(watchedHospitalId);
      setValue('departmentId', '');
    }
  }, [watchedHospitalId, selectedHospital, setValue]);

  const generateTokenNumber = async (hospitalId: string, departmentId: string): Promise<number> => {
    // Get current queue status
    const { data: queueData, error: queueError } = await supabase
      .from('queue_status')
      .select('total_tokens')
      .eq('hospital_id', hospitalId)
      .eq('department_id', departmentId)
      .single();

    if (queueError) {
      // If no queue status exists, create one
      const { error: insertError } = await supabase
        .from('queue_status')
        .insert({
          hospital_id: hospitalId,
          department_id: departmentId,
          current_token: 0,
          total_tokens: 1,
        });

      if (insertError) throw insertError;
      return 1;
    }

    const newTokenNumber = (queueData.total_tokens || 0) + 1;

    // Update total tokens
    const { error: updateError } = await supabase
      .from('queue_status')
      .update({ 
        total_tokens: newTokenNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('hospital_id', hospitalId)
      .eq('department_id', departmentId);

    if (updateError) throw updateError;

    return newTokenNumber;
  };

  const calculateEstimatedTime = async (
    hospitalId: string,
    departmentId: string,
    tokenNumber: number
  ): Promise<string> => {
    // Get current queue position
    const { data: queueData } = await supabase
      .from('queue_status')
      .select('current_token')
      .eq('hospital_id', hospitalId)
      .eq('department_id', departmentId)
      .single();

    // Get department average time
    const { data: deptData } = await supabase
      .from('departments')
      .select('avg_time_per_patient')
      .eq('id', departmentId)
      .single();

    const currentToken = queueData?.current_token || 0;
    const avgTime = deptData?.avg_time_per_patient || 15;
    const tokensAhead = Math.max(0, tokenNumber - currentToken - 1);
    const estimatedMinutes = tokensAhead * avgTime;

    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + estimatedMinutes);

    return estimatedTime.toISOString();
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!user) {
      toast.error('Please log in to book an appointment');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate token number
      const tokenNumber = await generateTokenNumber(data.hospitalId, data.departmentId);

      // Calculate estimated time
      const estimatedTime = await calculateEstimatedTime(
        data.hospitalId,
        data.departmentId,
        tokenNumber
      );

      // Create appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          hospital_id: data.hospitalId,
          department_id: data.departmentId,
          token_number: tokenNumber,
          patient_name: data.patientName,
          patient_phone: data.patientPhone,
          patient_email: data.patientEmail,
          status: 'waiting',
          estimated_time: estimatedTime,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Appointment booked successfully!');
      navigate(`/track?appointment=${appointment.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedHospitalData = hospitals.find(h => h.id === selectedHospital);
  const selectedDepartmentData = departments.find(d => d.id === watch('departmentId'));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Book Your Appointment
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select your preferred hospital and department to get your queue token instantly.
            No more waiting in crowded rooms!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Hospital Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Select Hospital
                  </label>
                  <select
                    {...register('hospitalId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    disabled={hospitalsLoading}
                  >
                    <option value="">Choose a hospital...</option>
                    {hospitals.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name} - {hospital.location}
                      </option>
                    ))}
                  </select>
                  {hospitalsLoading && (
                    <p className="mt-1 text-sm text-gray-500">Loading hospitals...</p>
                  )}
                  {errors.hospitalId && (
                    <p className="mt-1 text-sm text-red-600">{errors.hospitalId.message}</p>
                  )}
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Select Department
                  </label>
                  <select
                    {...register('departmentId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                    disabled={!selectedHospital || departmentsLoading}
                  >
                    <option value="">Choose a department...</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} (Avg. {department.avg_time_per_patient} min/patient)
                      </option>
                    ))}
                  </select>
                  {departmentsLoading && (
                    <p className="mt-1 text-sm text-gray-500">Loading departments...</p>
                  )}
                  {!selectedHospital && (
                    <p className="mt-1 text-sm text-gray-500">Please select a hospital first</p>
                  )}
                  {errors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">{errors.departmentId.message}</p>
                  )}
                </div>

                {/* Patient Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline h-4 w-4 mr-1" />
                        Full Name
                      </label>
                      <input
                        {...register('patientName')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                        placeholder="Enter patient's full name"
                      />
                      {errors.patientName && (
                        <p className="mt-1 text-sm text-red-600">{errors.patientName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Phone Number
                      </label>
                      <input
                        {...register('patientPhone')}
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                        placeholder="+1234567890"
                      />
                      {errors.patientPhone && (
                        <p className="mt-1 text-sm text-red-600">{errors.patientPhone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email Address
                    </label>
                    <input
                      {...register('patientEmail')}
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                      placeholder="patient@example.com"
                    />
                    {errors.patientEmail && (
                      <p className="mt-1 text-sm text-red-600">{errors.patientEmail.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#F7941D] text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F7941D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Booking Appointment...' : 'Book Appointment'}
                </button>
              </form>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hospital</p>
                    <p className="text-sm text-gray-600">
                      {selectedHospitalData ? selectedHospitalData.name : 'Not selected'}
                    </p>
                    {selectedHospitalData && (
                      <p className="text-xs text-gray-500">{selectedHospitalData.location}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Department</p>
                    <p className="text-sm text-gray-600">
                      {selectedDepartmentData ? selectedDepartmentData.name : 'Not selected'}
                    </p>
                    {selectedDepartmentData && (
                      <p className="text-xs text-gray-500">
                        Avg. {selectedDepartmentData.avg_time_per_patient} min per patient
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-[#2A5D9B] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Estimated Wait</p>
                    <p className="text-sm text-gray-600">
                      Will be calculated after booking
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-[#2A5D9B] mb-2">What happens next?</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• You'll receive a unique token number</li>
                  <li>• Track your queue position in real-time</li>
                  <li>• Get notified when your turn approaches</li>
                  <li>• Arrive at the hospital when ready</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;