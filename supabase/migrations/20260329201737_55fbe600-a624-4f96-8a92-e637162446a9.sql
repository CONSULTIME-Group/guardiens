ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skill_categories TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_for_help BOOLEAN DEFAULT false;