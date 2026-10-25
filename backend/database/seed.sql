-- ============================================================================
-- CLOUD-BASED SMART EV CHARGING AND RESERVATION PLATFORM
-- Seed Data for Supabase PostgreSQL
-- ============================================================================

-- Clean up existing sample data if needed (optional)
-- TRUNCATE TABLE public.payments, public.bookings, public.charging_slots, public.stations CASCADE;

-- ----------------------------------------------------------------------------
-- INSERT REALISTIC SAMPLE CHARGING STATIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.stations (id, name, address, latitude, longitude, connector_type, price_per_kwh, total_slots, status)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Tech Park HyperCharge Hub',
    'Building 4, Electronic City Phase 1, Bangalore, Karnataka',
    12.8399,
    77.6770,
    'CCS2 / Type 2',
    18.50,
    4,
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Airport Express Supercharger',
    'Terminal 2 Parking Area P3, International Airport, Bangalore',
    13.1986,
    77.7066,
    'CCS2 / CHAdeMO',
    22.00,
    4,
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Downtown Central Mall EV Station',
    'Lower Basement Parking B2, MG Road, Bangalore',
    12.9756,
    77.6067,
    'CCS2 / Type 2',
    16.00,
    3,
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Highway Oasis Fast Charging Station',
    'NH 44 Highway Rest Stop, KM Milestone 42, Devanahalli',
    13.2450,
    77.7120,
    'CCS2 Fast DC',
    20.00,
    4,
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Metro Station Green Power Point',
    'Indiranagar 100 Feet Road, Metro Station Gate 2, Bangalore',
    12.9784,
    77.6408,
    'Type 2 AC Fast',
    14.00,
    2,
    'active'
  )
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  connector_type = EXCLUDED.connector_type,
  price_per_kwh = EXCLUDED.price_per_kwh,
  total_slots = EXCLUDED.total_slots,
  status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- INSERT CHARGING SLOTS (Physical connectors per station)
-- ----------------------------------------------------------------------------
-- Station 1: Tech Park HyperCharge Hub (4 slots)
INSERT INTO public.charging_slots (id, station_id, slot_number, connector_type, power_output_kw, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'CCS2 DC Fast', 60.00, 'available'),
  ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 2, 'CCS2 DC Fast', 60.00, 'available'),
  ('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 3, 'Type 2 AC Fast', 22.00, 'available'),
  ('a1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 4, 'Type 2 AC Fast', 22.00, 'available')
ON CONFLICT (station_id, slot_number) DO UPDATE
SET connector_type = EXCLUDED.connector_type, power_output_kw = EXCLUDED.power_output_kw, status = EXCLUDED.status;

-- Station 2: Airport Express Supercharger (4 slots)
INSERT INTO public.charging_slots (id, station_id, slot_number, connector_type, power_output_kw, status)
VALUES
  ('b2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 1, 'CCS2 Ultra-Fast', 120.00, 'available'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 2, 'CCS2 Ultra-Fast', 120.00, 'available'),
  ('b2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 3, 'CHAdeMO DC Fast', 50.00, 'available'),
  ('b2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 4, 'CCS2 DC Fast', 60.00, 'available')
ON CONFLICT (station_id, slot_number) DO UPDATE
SET connector_type = EXCLUDED.connector_type, power_output_kw = EXCLUDED.power_output_kw, status = EXCLUDED.status;

-- Station 3: Downtown Central Mall (3 slots)
INSERT INTO public.charging_slots (id, station_id, slot_number, connector_type, power_output_kw, status)
VALUES
  ('c3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 1, 'CCS2 DC Fast', 50.00, 'available'),
  ('c3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 2, 'Type 2 AC Fast', 22.00, 'available'),
  ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 3, 'Type 2 AC Fast', 22.00, 'available')
ON CONFLICT (station_id, slot_number) DO UPDATE
SET connector_type = EXCLUDED.connector_type, power_output_kw = EXCLUDED.power_output_kw, status = EXCLUDED.status;

-- Station 4: Highway Oasis Fast Charging Station (4 slots)
INSERT INTO public.charging_slots (id, station_id, slot_number, connector_type, power_output_kw, status)
VALUES
  ('d4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 1, 'CCS2 High Power', 150.00, 'available'),
  ('d4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 2, 'CCS2 High Power', 150.00, 'available'),
  ('d4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 3, 'CCS2 DC Fast', 60.00, 'available'),
  ('d4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 4, 'CCS2 DC Fast', 60.00, 'available')
ON CONFLICT (station_id, slot_number) DO UPDATE
SET connector_type = EXCLUDED.connector_type, power_output_kw = EXCLUDED.power_output_kw, status = EXCLUDED.status;

-- Station 5: Metro Station Green Power Point (2 slots)
INSERT INTO public.charging_slots (id, station_id, slot_number, connector_type, power_output_kw, status)
VALUES
  ('e5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 1, 'Type 2 AC Fast', 22.00, 'available'),
  ('e5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 2, 'Type 2 AC Fast', 22.00, 'available')
ON CONFLICT (station_id, slot_number) DO UPDATE
SET connector_type = EXCLUDED.connector_type, power_output_kw = EXCLUDED.power_output_kw, status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- HOW TO CREATE / ELEVATE AN ADMINISTRATOR:
-- 1. Register a user through POST /api/auth/register or Supabase Auth UI
--    Example email: admin@evplatform.com
-- 2. Execute the following SQL query in the Supabase SQL Editor:
--    UPDATE public.profiles
--    SET role = 'admin'
--    WHERE email = 'admin@evplatform.com';
-- ----------------------------------------------------------------------------
