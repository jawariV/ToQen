import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Hospital, Department } from '../types';
import toast from 'react-hot-toast';

export const useHospitals = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');

      if (error) throw error;
      setHospitals(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hospitals';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { hospitals, loading, error, refetch: fetchHospitals };
};

export const useDepartments = (hospitalId?: string) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hospitalId) {
      fetchDepartments(hospitalId);
    } else {
      setDepartments([]);
    }
  }, [hospitalId]);

  const fetchDepartments = async (hospitalId: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch departments';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { departments, loading, error };
};