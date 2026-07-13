
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin','fleet_manager','dispatcher','safety_officer','financial_analyst');
CREATE TYPE public.account_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.vehicle_status AS ENUM ('Available','On Trip','In Shop','Retired');
CREATE TYPE public.driver_status AS ENUM ('Available','On Trip','Off Duty','Suspended');
CREATE TYPE public.trip_status AS ENUM ('Draft','Dispatched','Completed','Cancelled');
CREATE TYPE public.maintenance_status AS ENUM ('Active','Completed');
CREATE TYPE public.expense_category AS ENUM ('Tolls','Misc','Consumables','Parking','Other');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status public.account_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- is_approved helper
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved');
$$;

-- can_manage_fleet: admin or fleet_manager
CREATE OR REPLACE FUNCTION public.can_manage_fleet(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'fleet_manager');
$$;

-- Profiles policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update basic" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND status = (SELECT status FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "admin update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- User roles policies
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Signup trigger: first user becomes admin+approved, rest pending+dispatcher
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
  assigned_status public.account_status;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
    assigned_status := 'approved';
  ELSE
    assigned_role := 'dispatcher';
    assigned_status := 'pending';
  END IF;

  INSERT INTO public.profiles(id, name, email, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email, assigned_status);
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity NUMERIC NOT NULL CHECK (capacity >= 0),
  odometer NUMERIC NOT NULL DEFAULT 0 CHECK (odometer >= 0),
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  status public.vehicle_status NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "fleet manage vehicles ins" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.can_manage_fleet(auth.uid()));
CREATE POLICY "fleet manage vehicles upd" ON public.vehicles FOR UPDATE TO authenticated USING (public.can_manage_fleet(auth.uid())) WITH CHECK (public.can_manage_fleet(auth.uid()));
CREATE POLICY "fleet manage vehicles del" ON public.vehicles FOR DELETE TO authenticated USING (public.can_manage_fleet(auth.uid()));

-- Drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license TEXT NOT NULL,
  category TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  contact TEXT NOT NULL,
  safety_score INT NOT NULL DEFAULT 100 CHECK (safety_score BETWEEN 0 AND 100),
  status public.driver_status NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read drivers" ON public.drivers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage drivers ins" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer'));
CREATE POLICY "manage drivers upd" ON public.drivers FOR UPDATE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer')) WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer'));
CREATE POLICY "manage drivers del" ON public.drivers FOR DELETE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer'));

-- Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  cargo_weight NUMERIC NOT NULL CHECK (cargo_weight >= 0),
  distance NUMERIC NOT NULL CHECK (distance >= 0),
  status public.trip_status NOT NULL DEFAULT 'Draft',
  revenue NUMERIC CHECK (revenue IS NULL OR revenue >= 0),
  fuel_consumed NUMERIC CHECK (fuel_consumed IS NULL OR fuel_consumed >= 0),
  final_odometer NUMERIC CHECK (final_odometer IS NULL OR final_odometer >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read trips" ON public.trips FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage trips ins" ON public.trips FOR INSERT TO authenticated WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'dispatcher'));
CREATE POLICY "manage trips upd" ON public.trips FOR UPDATE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'dispatcher')) WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'dispatcher'));
CREATE POLICY "manage trips del" ON public.trips FOR DELETE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'dispatcher'));

-- Maintenance logs
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  date DATE NOT NULL,
  status public.maintenance_status NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_logs TO authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read maint" ON public.maintenance_logs FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage maint ins" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer'));
CREATE POLICY "manage maint upd" ON public.maintenance_logs FOR UPDATE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer')) WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer'));
CREATE POLICY "manage maint del" ON public.maintenance_logs FOR DELETE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'safety_officer'));

-- Fuel logs
CREATE TABLE public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  liters NUMERIC NOT NULL CHECK (liters >= 0),
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  date DATE NOT NULL,
  station TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_logs TO authenticated;
GRANT ALL ON public.fuel_logs TO service_role;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read fuel" ON public.fuel_logs FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage fuel ins" ON public.fuel_logs FOR INSERT TO authenticated WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst'));
CREATE POLICY "manage fuel upd" ON public.fuel_logs FOR UPDATE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst')) WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst'));
CREATE POLICY "manage fuel del" ON public.fuel_logs FOR DELETE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst'));

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  category public.expense_category NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read exp" ON public.expenses FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage exp ins" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst'));
CREATE POLICY "manage exp upd" ON public.expenses FOR UPDATE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst')) WITH CHECK (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst'));
CREATE POLICY "manage exp del" ON public.expenses FOR DELETE TO authenticated USING (public.can_manage_fleet(auth.uid()) OR public.has_role(auth.uid(),'financial_analyst'));
