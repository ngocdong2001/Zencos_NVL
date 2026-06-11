-- Migration: Add internal_name column to products_outputs table
-- Run this script once against the database before deploying the corresponding code changes.

ALTER TABLE products_outputs
  ADD COLUMN internal_name VARCHAR(255) NULL AFTER name;
