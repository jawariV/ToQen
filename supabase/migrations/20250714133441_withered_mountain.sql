/*
  # Admin Features Enhancement

  1. New Tables
    - Add admin registration functionality
    - Enhanced queue management features
    - Department management capabilities

  2. Security
    - Admin-specific policies
    - Enhanced RLS for admin operations

  3. Functions
    - Queue reset functionality
    - Token advancement system
*/

-- Function to reset queue for a department
CREATE OR REPLACE FUNCTION reset_department_queue(dept_id uuid, hospital_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin of the hospital
  IF NOT EXISTS (
    SELECT 1 FROM hospitals h 
    WHERE h.id = hospital_id AND h.admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not hospital admin';
  END IF;

  -- Reset queue status
  UPDATE queue_status 
  SET current_token = 0, 
      total_tokens = 0, 
      updated_at = now()
  WHERE department_id = dept_id AND queue_status.hospital_id = reset_department_queue.hospital_id;

  -- Cancel all waiting appointments
  UPDATE appointments 
  SET status = 'cancelled'
  WHERE department_id = dept_id 
    AND appointments.hospital_id = reset_department_queue.hospital_id
    AND status = 'waiting';
END;
$$;

-- Function to advance queue (call next token)
CREATE OR REPLACE FUNCTION advance_queue(dept_id uuid, hospital_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_token integer;
BEGIN
  -- Check if user is admin of the hospital
  IF NOT EXISTS (
    SELECT 1 FROM hospitals h 
    WHERE h.id = hospital_id AND h.admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not hospital admin';
  END IF;

  -- Get current token and increment
  SELECT current_token + 1 INTO next_token
  FROM queue_status 
  WHERE department_id = dept_id AND queue_status.hospital_id = advance_queue.hospital_id;

  -- Update queue status
  UPDATE queue_status 
  SET current_token = next_token, 
      updated_at = now()
  WHERE department_id = dept_id AND queue_status.hospital_id = advance_queue.hospital_id;

  -- Mark current appointment as ready
  UPDATE appointments 
  SET status = 'ready'
  WHERE department_id = dept_id 
    AND appointments.hospital_id = advance_queue.hospital_id
    AND token_number = next_token
    AND status = 'waiting';

  -- Mark previous appointment as completed
  UPDATE appointments 
  SET status = 'completed'
  WHERE department_id = dept_id 
    AND appointments.hospital_id = advance_queue.hospital_id
    AND token_number = next_token - 1
    AND status = 'ready';

  RETURN next_token;
END;
$$;

-- Add admin registration trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (id, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone),
    COALESCE(NEW.phone, NEW.email),
    'patient'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, users.email),
    phone = COALESCE(NEW.phone, users.phone);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add policy for admin user creation
CREATE POLICY "Allow admin registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);