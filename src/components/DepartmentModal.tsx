import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Department } from '../types';
import toast from 'react-hot-toast';

const departmentSchema = yup.object({
  name: yup
    .string()
    .required('Department name is required')
    .min(2, 'Name must be at least 2 characters'),
  avgTimePerPatient: yup
    .number()
    .required('Average time per patient is required')
    .min(5, 'Minimum 5 minutes')
    .max(120, 'Maximum 120 minutes'),
});

interface DepartmentFormData {
  name: string;
  avgTimePerPatient: number;
}

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
  hospitalId: string;
  onSuccess: () => void;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  hospitalId,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isEditing = !!department;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DepartmentFormData>({
    resolver: yupResolver(departmentSchema),
  });

  useEffect(() => {
    if (department) {
      reset({
        name: department.name,
        avgTimePerPatient: department.avg_time_per_patient,
      });
    } else {
      reset({
        name: '',
        avgTimePerPatient: 15,
      });
    }
  }, [department, reset]);

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditing && department) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({
            name: data.name,
            avg_time_per_patient: data.avgTimePerPatient,
          })
          .eq('id', department.id);

        if (error) throw error;
        toast.success('Department updated successfully');
      } else {
        // Create new department
        const { data: newDept, error } = await supabase
          .from('departments')
          .insert({
            hospital_id: hospitalId,
            name: data.name,
            avg_time_per_patient: data.avgTimePerPatient,
          })
          .select()
          .single();

        if (error) throw error;

        // Initialize queue status for new department
        const { error: queueError } = await supabase
          .from('queue_status')
          .insert({
            hospital_id: hospitalId,
            department_id: newDept.id,
            current_token: 0,
            total_tokens: 0,
          });

        if (queueError) throw queueError;
        toast.success('Department created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!department) return;

    if (!confirm('Are you sure you want to delete this department? This will cancel all appointments and cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      // Delete department (cascade will handle related records)
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);

      if (error) throw error;

      toast.success('Department deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Department' : 'Add Department'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Name
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                placeholder="e.g., Cardiology"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Average Time per Patient (minutes)
              </label>
              <input
                {...register('avgTimePerPatient')}
                type="number"
                min="5"
                max="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A5D9B] focus:border-[#2A5D9B]"
                placeholder="15"
              />
              {errors.avgTimePerPatient && (
                <p className="mt-1 text-sm text-red-600">{errors.avgTimePerPatient.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
            
            <div className={`flex space-x-3 ${!isEditing ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 bg-[#2A5D9B] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;