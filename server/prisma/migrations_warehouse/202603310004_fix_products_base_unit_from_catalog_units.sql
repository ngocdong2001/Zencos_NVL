-- Migration: normalize global product units and repair invalid products.base_unit values
-- Context:
-- - products.base_unit moved from text code to bigint unit id
-- - legacy rows became 0/invalid after type change

-- 1) Ensure global units have a usable code
UPDATE product_units
SET unit_code_name = UPPER(TRIM(unit_name))
WHERE product_id IS NULL
  AND (unit_code_name IS NULL OR TRIM(unit_code_name) = '');

-- 2) Backfill missing global units from catalog_units (active rows only)
INSERT INTO product_units
  (product_id, parent_unit_id, unit_code_name, unit_name, unit_memo, conversion_to_base, is_purchase_unit, is_default_display, created_at, updated_at)
SELECT
  NULL,
  NULL,
  cu.code,
  cu.name,
  NULL,
  1,
  0,
  0,
  NOW(3),
  NOW(3)
FROM catalog_units cu
WHERE cu.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM product_units pu
    WHERE pu.product_id IS NULL
      AND UPPER(COALESCE(pu.unit_code_name, pu.unit_name)) = UPPER(cu.code)
  );

-- 3) Repair invalid base_unit references in products
--    Priority: unit code GR -> default display unit -> first global unit
UPDATE products p
SET p.base_unit = COALESCE(
  (
    SELECT pu_gr.id
    FROM product_units pu_gr
    WHERE pu_gr.product_id IS NULL
      AND UPPER(COALESCE(pu_gr.unit_code_name, pu_gr.unit_name)) = 'GR'
    ORDER BY pu_gr.is_default_display DESC, pu_gr.id ASC
    LIMIT 1
  ),
  (
    SELECT pu_def.id
    FROM product_units pu_def
    WHERE pu_def.product_id IS NULL
    ORDER BY pu_def.is_default_display DESC, pu_def.id ASC
    LIMIT 1
  )
)
WHERE p.base_unit IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM product_units pu
     WHERE pu.id = p.base_unit
   );
