-- ADMIN USER SEEDING INSTRUCTIONS
-- ================================
-- This is the ONLY seed needed. Everything else (vehicles, drivers, trips, etc.)
-- is added through the application UI after login.

-- Step 1: Create a user via Supabase Auth
--    Go to: Authentication → Users → Add User
--    Email: admin@safaritour.com
--    Password: Admin@123 (or your preferred password)
--    Click "Create user" and copy the UUID.

-- Step 2: Run the INSERT below, replacing the UUID:

-- INSERT INTO users (id, email, role, full_name, phone, is_active)
-- VALUES ('UUID-FROM-STEP-1', 'admin@safaritour.com', 'admin', 'System Admin', '+256700000000', true);

-- You can now log in at http://localhost:5173/login
-- and manage everything from the dashboard UI.
