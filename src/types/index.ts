export interface User {
  id: string;
  email: string;
  phone: string;
  role: 'patient' | 'admin';
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  admin_id: string;
  avg_consultation_time: number; // in minutes
  created_at: string;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  avg_time_per_patient: number; // in minutes
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  hospital_id: string;
  department_id: string;
  token_number: number;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  status: 'waiting' | 'ready' | 'completed' | 'cancelled';
  estimated_time: string;
  created_at: string;
}

export interface QueueStatus {
  id: string;
  hospital_id: string;
  department_id: string;
  current_token: number;
  total_tokens: number;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}