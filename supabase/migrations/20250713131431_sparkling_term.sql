/*
  # Initial ToQen Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) 
      - `email` (text, unique)
      - `phone` (text, unique)
      - `role` (enum: patient, admin)
      - `created_at` (timestamp)
    
    - `hospitals`
      - `id` (uuid, primary key)
      - `name` (text)
      - `location` (text)
      - `admin_id` (uuid, foreign key to users)
      - `avg_consultation_time` (integer, minutes)
      - `created_at` (timestamp)
    
    - `departments`
      - `id` (uuid, primary key)
      - `hospital_id` (uuid, foreign key to hospitals)
      - `name` (text)
      - `avg_time_per_patient` (integer, minutes)
      - `created_at` (timestamp)
    
    - `appointments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `hospital_id` (uuid, foreign key to hospitals)
      - `department_id` (uuid, foreign key to departments)
      - `token_number` (integer)
      - `patient_name` (text)
      - `patient_phone` (text)
      - `patient_email` (text)
      - `status` (enum: waiting, ready, completed, cancelled)
      - `estimated_time` (timestamp)
      - `created_at` (timestamp)
    
    - `queue_status`
      - `id` (uuid, primary key)
      - `hospital_id` (uuid, foreign key to hospitals)
      - `department_id` (uuid, foreign key to departments)
      - `current_token` (integer, default 0)
      - `total_tokens` (integer, default 0)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Patients can only see their own appointments
    - Admins can manage their hospital's data
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('patient', 'admin');
CREATE TYPE appointment_status AS ENUM ('waiting', 'ready', 'completed', 'cancelled');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  created_at timestamptz DEFAULT now()
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
  avg_consultation_time integer DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  avg_time_per_patient integer DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  token_number integer NOT NULL,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  patient_email text NOT NULL,
  status appointment_status DEFAULT 'waiting',
  estimated_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Queue status table
CREATE TABLE IF NOT EXISTS queue_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  current_token integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id, department_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for hospitals
CREATE POLICY "Anyone can read hospitals"
  ON hospitals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage their hospitals"
  ON hospitals
  FOR ALL
  TO authenticated
  USING (admin_id = auth.uid());

-- RLS Policies for departments
CREATE POLICY "Anyone can read departments"
  ON departments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospital admins can manage departments"
  ON departments
  FOR ALL
  TO authenticated
  USING (
    hospital_id IN (
      SELECT id FROM hospitals WHERE admin_id = auth.uid()
    )
  );

-- RLS Policies for appointments
CREATE POLICY "Patients can read own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Patients can create appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hospital admins can read their hospital appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    hospital_id IN (
      SELECT id FROM hospitals WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Hospital admins can update their hospital appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    hospital_id IN (
      SELECT id FROM hospitals WHERE admin_id = auth.uid()
    )
  );

-- RLS Policies for queue_status
CREATE POLICY "Anyone can read queue status"
  ON queue_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospital admins can manage queue status"
  ON queue_status
  FOR ALL
  TO authenticated
  USING (
    hospital_id IN (
      SELECT id FROM hospitals WHERE admin_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_department_id ON appointments(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_queue_status_hospital_dept ON queue_status(hospital_id, department_id);

-- Insert sample data for testing
INSERT INTO users (id, email, phone, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@cityhospital.com', '+1234567890', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@generalhospital.com', '+1234567891', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO hospitals (id, name, location, admin_id, avg_consultation_time) VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', 'City General Hospital', '123 Main St, Downtown', '550e8400-e29b-41d4-a716-446655440000', 20),
  ('660e8400-e29b-41d4-a716-446655440001', 'Metro Medical Center', '456 Oak Ave, Midtown', '550e8400-e29b-41d4-a716-446655440001', 25)
ON CONFLICT DO NOTHING;

INSERT INTO departments (hospital_id, name, avg_time_per_patient) VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', 'General Medicine', 15),
  ('660e8400-e29b-41d4-a716-446655440000', 'Cardiology', 30),
  ('660e8400-e29b-41d4-a716-446655440000', 'Dermatology', 20),
  ('660e8400-e29b-41d4-a716-446655440001', 'General Medicine', 18),
  ('660e8400-e29b-41d4-a716-446655440001', 'Orthopedics', 25),
  ('660e8400-e29b-41d4-a716-446655440001', 'Pediatrics', 12)
ON CONFLICT DO NOTHING;

-- Initialize queue status for all departments
INSERT INTO queue_status (hospital_id, department_id, current_token, total_tokens)
SELECT h.id, d.id, 0, 0
FROM hospitals h
CROSS JOIN departments d
WHERE d.hospital_id = h.id
ON CONFLICT (hospital_id, department_id) DO NOTHING;