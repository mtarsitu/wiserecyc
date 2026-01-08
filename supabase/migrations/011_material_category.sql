-- Add category column to materials table
-- Categories: feros (ferrous), neferos (non-ferrous), deee (WEEE), altele (other)

-- Create enum type for material category
DO $$ BEGIN
    CREATE TYPE material_category AS ENUM ('feros', 'neferos', 'deee', 'altele');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add category column to materials
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS category material_category DEFAULT 'altele';

-- Update existing materials with their categories
-- Feroase (Ferrous metals)
UPDATE materials SET category = 'feros' WHERE name IN ('Fier', 'Otel inoxidabil');

-- Neferoase (Non-ferrous metals)
UPDATE materials SET category = 'neferos' WHERE name IN (
    'Alama',
    'Aluminiu',
    'Bronz',
    'Cablu aluminiu',
    'Cablu cupru',
    'Cositor',
    'Cupru',
    'Nichel',
    'Plumb',
    'Radiatoare aluminiu',
    'Radiatoare cupru',
    'Zinc',
    'Motoare electrice',
    'Transformatoare'
);

-- DEEE (Waste Electrical and Electronic Equipment)
UPDATE materials SET category = 'deee' WHERE name IN (
    'Electronice (DEEE)',
    'Baterii auto'
);

-- Altele (Other - plastic, paper, etc.)
UPDATE materials SET category = 'altele' WHERE name IN (
    'Hartie/Carton',
    'Plastic'
);

-- Make sure any remaining materials default to 'altele'
UPDATE materials SET category = 'altele' WHERE category IS NULL;
