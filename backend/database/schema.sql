-- ============================================================================
-- CLOUD-BASED SMART EV CHARGING AND RESERVATION PLATFORM
-- Database Schema for Supabase PostgreSQL
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Helper function to make UTC tsrange immutable for GiST exclusion constraint
CREATE OR REPLACE FUNCTION timestamptz_to_utc_tsrange(t1 TIMESTAMPTZ, t2 TIMESTAMPTZ)
RETURNS tsrange IMMUTABLE LANGUAGE sql PARALLEL SAFE AS $$
  SELECT tsrange(timezone('UTC', t1), timezone('UTC', t2), '[)');
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. STATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    connector_type TEXT NOT NULL,
    price_per_kwh NUMERIC(8, 2) NOT NULL DEFAULT 15.00 CHECK (price_per_kwh >= 0),
    total_slots INTEGER NOT NULL DEFAULT 4 CHECK (total_slots > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. CHARGING SLOTS TABLE (Physical EVSE connectors)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.charging_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    connector_type TEXT NOT NULL,
    power_output_kw NUMERIC(6, 2) NOT NULL DEFAULT 50.00 CHECK (power_output_kw > 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_station_slot_number UNIQUE (station_id, slot_number)
);

-- ----------------------------------------------------------------------------
-- 4. BOOKINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE RESTRICT,
    slot_id UUID NOT NULL REFERENCES public.charging_slots(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_booking_time_validity CHECK (end_time > start_time)
);

-- DATABASE-LEVEL DOUBLE-BOOKING PREVENTION
-- Enforces that no two bookings for the same slot can overlap if status is pending or confirmed.
-- Automatically frees slot reservation if booking is cancelled.
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS no_double_booking_exclusion;

ALTER TABLE public.bookings
ADD CONSTRAINT no_double_booking_exclusion
EXCLUDE USING gist (
    slot_id WITH =,
    timestamptz_to_utc_tsrange(start_time, end_time) WITH &&
)
WHERE (status IN ('pending', 'confirmed'));

-- ----------------------------------------------------------------------------
-- 5. PAYMENTS TABLE (Simulated Payment records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('success', 'failed', 'refunded')),
    payment_method TEXT NOT NULL DEFAULT 'simulated_card',
    transaction_reference TEXT NOT NULL UNIQUE,
    simulated_note TEXT NOT NULL DEFAULT 'SIMULATED PAYMENT: Academic testing only. No real funds were charged.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR QUERY OPTIMIZATION
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_stations_status ON public.stations(status);
CREATE INDEX IF NOT EXISTS idx_charging_slots_station ON public.charging_slots(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_station_id ON public.bookings(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_timerange ON public.bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_stations_updated_at ON public.stations;
CREATE TRIGGER trigger_stations_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_charging_slots_updated_at ON public.charging_slots;
CREATE TRIGGER trigger_charging_slots_updated_at
BEFORE UPDATE ON public.charging_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON public.bookings;
CREATE TRIGGER trigger_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON SUPABASE AUTH REGISTRATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- CLEANUP FUNCTION FOR EXPIRED UNPAID RESERVATIONS (15-Minute Expiry)
-- Cancels pending bookings that were never paid within 15 minutes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE status = 'pending'
      AND created_at < (now() - INTERVAL '15 minutes');
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- ATOMIC BOOKING FUNCTION (Concurrency Safe with Transactional Slot Lock)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_user_id UUID,
    p_station_id UUID,
    p_slot_id UUID,
    p_booking_date DATE,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_amount NUMERIC
)
RETURNS TABLE (
    booking_id UUID,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_slot_exists BOOLEAN;
    v_conflict_count INTEGER;
    v_new_booking_id UUID;
BEGIN
    -- 1. Free any stale pending bookings older than 15 minutes before checking conflicts
    PERFORM public.cleanup_expired_pending_bookings();

    -- 2. Advisory lock hashed by slot UUID to serialize bookings for the exact same slot
    PERFORM pg_advisory_xact_lock(hashtext(p_slot_id::text));

    -- 3. Check slot exists and belongs to the station
    SELECT EXISTS (
        SELECT 1 FROM public.charging_slots 
        WHERE id = p_slot_id AND station_id = p_station_id AND status != 'maintenance'
    ) INTO v_slot_exists;

    IF NOT v_slot_exists THEN
        RETURN QUERY SELECT NULL::UUID, 'ERROR'::TEXT, 'Charging slot not found or currently in maintenance'::TEXT;
        RETURN;
    END IF;

    -- 4. Check for overlapping active bookings (status 'pending' or 'confirmed')
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings
    WHERE slot_id = p_slot_id
      AND status IN ('pending', 'confirmed')
      AND (start_time < p_end_time AND end_time > p_start_time);

    IF v_conflict_count > 0 THEN
        RETURN QUERY SELECT NULL::UUID, 'CONFLICT'::TEXT, 'The selected charging slot is already reserved for this time window'::TEXT;
        RETURN;
    END IF;

    -- 5. Insert new booking
    INSERT INTO public.bookings (
        user_id,
        station_id,
        slot_id,
        booking_date,
        start_time,
        end_time,
        amount,
        status
    )
    VALUES (
        p_user_id,
        p_station_id,
        p_slot_id,
        p_booking_date,
        p_start_time,
        p_end_time,
        p_amount,
        'pending'
    )
    RETURNING id INTO v_new_booking_id;

    RETURN QUERY SELECT v_new_booking_id, 'SUCCESS'::TEXT, 'Booking reserved successfully. Please complete simulated payment within 15 minutes.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- SECURITY DEFINER HELPER: IS CURRENT USER AN ADMIN?
-- Prevents RLS recursive policy evaluation on public.profiles.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data access restrictions are enforced directly in PostgreSQL.
-- ----------------------------------------------------------------------------

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
-- Users can view their own profile; admins can view all profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- Users can update their own full_name and phone, but CANNOT self-elevate role to 'admin'
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (
        public.is_admin() OR
        (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    );

-- 2. STATIONS POLICIES
-- Anyone can view stations (public catalog)
DROP POLICY IF EXISTS "stations_public_select" ON public.stations;
CREATE POLICY "stations_public_select" ON public.stations
    FOR SELECT USING (true);

-- Only admins can insert, update, or delete stations
DROP POLICY IF EXISTS "stations_admin_all" ON public.stations;
CREATE POLICY "stations_admin_all" ON public.stations
    FOR ALL USING (public.is_admin());

-- 3. CHARGING SLOTS POLICIES
-- Anyone can view slots (public availability)
DROP POLICY IF EXISTS "slots_public_select" ON public.charging_slots;
CREATE POLICY "slots_public_select" ON public.charging_slots
    FOR SELECT USING (true);

-- Only admins can manage slots
DROP POLICY IF EXISTS "slots_admin_all" ON public.charging_slots;
CREATE POLICY "slots_admin_all" ON public.charging_slots
    FOR ALL USING (public.is_admin());

-- 4. BOOKINGS POLICIES
-- Users can view their own bookings; admins can view all bookings
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_admin" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Authenticated users can insert bookings for themselves
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own bookings; admins can modify any booking
DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- 5. PAYMENTS POLICIES
-- Users can view their own payments; admins can view all payments
DROP POLICY IF EXISTS "payments_select_own_or_admin" ON public.payments;
CREATE POLICY "payments_select_own_or_admin" ON public.payments
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Users can insert simulated payments for their own bookings
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
