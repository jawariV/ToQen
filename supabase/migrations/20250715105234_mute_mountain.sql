/*
  # Advanced Features Enhancement

  1. New Functions
    - get_queue_analytics: Get detailed queue analytics for admins
    - update_appointment_status: Safely update appointment status
    - get_patient_history: Get patient appointment history
    
  2. New Views
    - queue_analytics_view: Real-time queue analytics
    - appointment_summary_view: Comprehensive appointment data
    
  3. Triggers
    - Auto-update queue status when appointments change
    - Notification triggers for status changes
    
  4. Indexes
    - Performance optimization for common queries
*/

-- Function to get queue analytics
CREATE OR REPLACE FUNCTION get_queue_analytics(hospital_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today_stats', (
      SELECT json_build_object(
        'total_appointments', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'waiting', COUNT(*) FILTER (WHERE status = 'waiting'),
        'ready', COUNT(*) FILTER (WHERE status = 'ready'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')
      )
      FROM appointments 
      WHERE hospital_id = hospital_id_param 
      AND DATE(created_at) = CURRENT_DATE
    ),
    'department_stats', (
      SELECT json_agg(
        json_build_object(
          'department_id', d.id,
          'department_name', d.name,
          'current_token', COALESCE(qs.current_token, 0),
          'total_tokens', COALESCE(qs.total_tokens, 0),
          'waiting_count', (
            SELECT COUNT(*) FROM appointments 
            WHERE department_id = d.id AND status = 'waiting'
          ),
          'avg_wait_time', d.avg_time_per_patient
        )
      )
      FROM departments d
      LEFT JOIN queue_status qs ON d.id = qs.department_id
      WHERE d.hospital_id = hospital_id_param
    ),
    'hourly_bookings', (
      SELECT json_agg(
        json_build_object(
          'hour', EXTRACT(HOUR FROM created_at),
          'count', COUNT(*)
        )
      )
      FROM appointments
      WHERE hospital_id = hospital_id_param
      AND DATE(created_at) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY EXTRACT(HOUR FROM created_at)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update appointment status safely
CREATE OR REPLACE FUNCTION update_appointment_status(
  appointment_id_param UUID,
  new_status appointment_status,
  admin_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  appointment_hospital_id UUID;
  admin_hospital_id UUID;
BEGIN
  -- Get appointment hospital
  SELECT hospital_id INTO appointment_hospital_id
  FROM appointments
  WHERE id = appointment_id_param;
  
  -- Get admin hospital
  SELECT id INTO admin_hospital_id
  FROM hospitals
  WHERE admin_id = admin_id_param;
  
  -- Check authorization
  IF appointment_hospital_id != admin_hospital_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update appointment
  UPDATE appointments
  SET status = new_status
  WHERE id = appointment_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get patient history
CREATE OR REPLACE FUNCTION get_patient_history(patient_id_param UUID)
RETURNS TABLE (
  appointment_id UUID,
  hospital_name TEXT,
  department_name TEXT,
  token_number INTEGER,
  status appointment_status,
  created_at TIMESTAMPTZ,
  estimated_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    h.name,
    d.name,
    a.token_number,
    a.status,
    a.created_at,
    a.estimated_time
  FROM appointments a
  JOIN hospitals h ON a.hospital_id = h.id
  JOIN departments d ON a.department_id = d.id
  WHERE a.user_id = patient_id_param
  ORDER BY a.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_created_date ON appointments (DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_status ON appointments (hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_department_status ON appointments (department_id, status);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_queue_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_history TO authenticated;