-- =====================================================
-- INSERARE MATERIALE
-- =====================================================
-- Materialele sunt GLOBALE - folosite de toate companiile
-- Categorii: feros, neferos, deee, altele
-- =====================================================

INSERT INTO public.materials (name, unit, category, is_active) VALUES
-- FEROASE
('FIER', 'kg', 'feros', true),
('INOX', 'kg', 'feros', true),
('SPAN FIER', 'kg', 'feros', true),
('STANTA', 'kg', 'feros', true),
('RABLA AMESTEC', 'kg', 'feros', true),

-- NEFEROASE
('ALUMINIU', 'kg', 'neferos', true),
('ALUMINIU BOBINE', 'kg', 'neferos', true),
('ALUMINIU GENTI', 'kg', 'neferos', true),
('ALUMINIU PROFILE', 'kg', 'neferos', true),
('ALUMINIU SARMA', 'kg', 'neferos', true),
('SPAN ALUMINIU', 'kg', 'neferos', true),
('CUPRU', 'kg', 'neferos', true),
('CABLURI CUPRU', 'kg', 'neferos', true),
('RADIATOARE CUPRU', 'kg', 'neferos', true),
('CABLU CUPRU/PLUMB', 'kg', 'neferos', true),
('CABLURI CUPRU/FIER', 'kg', 'neferos', true),
('RADIATOARE CUPRU/ALUMINIU', 'kg', 'neferos', true),
('PLUMB', 'kg', 'neferos', true),
('ALAMA', 'kg', 'neferos', true),
('RADIATOR ALAMA', 'kg', 'neferos', true),
('RADIATOR ALUMINIU', 'kg', 'neferos', true),
('CABLURI ALUMINIU', 'kg', 'neferos', true),
('BATERII AUTO', 'kg', 'neferos', true),
('ZAMAC', 'kg', 'neferos', true),
('BOBINE', 'kg', 'neferos', true),
('CABLU', 'kg', 'neferos', true),

-- DEEE (Deseuri de Echipamente Electrice si Electronice)
('DEEE', 'kg', 'deee', true),
('MOTOARE ELECTRICE', 'kg', 'deee', true),
('MOTOARE DIN MASINI', 'kg', 'deee', true),
('CIRCUITE IMPRIMATE', 'kg', 'deee', true),
('CONDENSATORI NON PCB', 'kg', 'deee', true),
('HARDURI', 'kg', 'deee', true),
('PLACI', 'kg', 'deee', true),
('SURSE', 'kg', 'deee', true),
('CATALIZATOR', 'kg', 'deee', true),

-- ALTELE
('PALET ALB', 'buc', 'altele', true),
('PALET NEGRU', 'buc', 'altele', true),
('PALET NON EURO', 'buc', 'altele', true),
('PALET COLOR', 'buc', 'altele', true),
('BALOT CARTON MIC', 'kg', 'altele', true),
('BALOT CARTON MARE', 'kg', 'altele', true),
('CARTON KG', 'kg', 'altele', true),
('HARTIE', 'kg', 'altele', true),
('ANVELOPE', 'kg', 'altele', true),
('FOLIE', 'kg', 'altele', true),
('PLASTIC', 'kg', 'altele', true),
('LEMN', 'kg', 'altele', true),
('STICLA', 'kg', 'altele', true),
('STICLA CIOB', 'kg', 'altele', true),
('GUNOI', 'kg', 'altele', true)

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- VERIFICARE
-- =====================================================
-- SELECT name, category, unit FROM materials ORDER BY category, name;
