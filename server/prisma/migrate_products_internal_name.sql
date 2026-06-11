-- Migration: Add internal_name column to products table
-- Run this script once against the database before deploying the corresponding code changes.

ALTER TABLE products
  ADD COLUMN internal_name VARCHAR(255) NULL AFTER name;
