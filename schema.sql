-- ============================================================
-- MDAAD — SPRINT 1 SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor (Settings → SQL Editor)
-- ============================================================

-- ── Shared trigger function ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ============================================================
-- EXTEND user_profiles (already exists from app.js schema)
-- ============================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS org_id       UUID,
  ADD COLUMN IF NOT EXISTS skills       TEXT[],
  ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS volunteer_hours INT DEFAULT 0;

-- ============================================================
-- ORGANIZATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Identity
  owner_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  category            TEXT CHECK (category IN ('ngo','hospital','shelter','coordination')) NOT NULL,
  description         TEXT CHECK (char_length(description) <= 2000),
  logo_url            TEXT,

  -- Contact
  phone               TEXT,
  whatsapp            TEXT,
  email               TEXT,
  website             TEXT,

  -- Location
  address             TEXT,
  location_coords     JSONB,        -- { "lat": 37.066, "lng": 37.383 }
  service_area        TEXT[],       -- e.g. ['District 3', 'Sector A']

  -- Verification & Trust
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending','under_review','verified','suspended')),
  trust_score         INT DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  verified_at         TIMESTAMPTZ,
  verified_by         UUID REFERENCES auth.users(id),
  rejection_reason    TEXT,

  -- Trust Score Inputs (stored for full auditability)
  docs_submitted      BOOLEAN DEFAULT FALSE,
  un_ocha_registered  BOOLEAN DEFAULT FALSE,
  has_field_contact   BOOLEAN DEFAULT FALSE,
  community_reports   INT DEFAULT 0,
  campaigns_fulfilled INT DEFAULT 0,
  days_active         INT DEFAULT 0
);

CREATE TRIGGER orgs_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_orgs_status   ON organizations(verification_status);
CREATE INDEX IF NOT EXISTS idx_orgs_category ON organizations(category);
CREATE INDEX IF NOT EXISTS idx_orgs_owner    ON organizations(owner_id);

-- ── RLS: ORGANIZATIONS ──────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Public: read verified orgs only
CREATE POLICY "public_read_verified_orgs" ON organizations
  FOR SELECT USING (verification_status = 'verified');

-- Admins: read all
CREATE POLICY "admin_read_all_orgs" ON organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Owner: read own at any status
CREATE POLICY "owner_read_own_org" ON organizations
  FOR SELECT USING (owner_id = auth.uid());

-- Auth users: create ONE org application
CREATE POLICY "auth_insert_org" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = owner_id
    AND NOT EXISTS (SELECT 1 FROM organizations WHERE owner_id = auth.uid())
  );

-- Owner: update own pending org (cannot self-promote status)
CREATE POLICY "owner_update_pending_org" ON organizations
  FOR UPDATE
  USING (owner_id = auth.uid() AND verification_status IN ('pending','under_review'))
  WITH CHECK (verification_status IN ('pending','under_review'));

-- Admin: update any org (for verification decisions)
CREATE POLICY "admin_update_any_org" ON organizations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- CAMPAIGNS TABLE ("Live Needs")
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at          TIMESTAMPTZ,

  -- Ownership
  org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  posted_by           UUID REFERENCES auth.users(id) NOT NULL,

  -- Content
  title               TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  description         TEXT NOT NULL CHECK (char_length(description) <= 3000),
  category            TEXT CHECK (
    category IN ('Food','Health','Shelter','Safety','WASH','Education','Protection')
  ) NOT NULL,

  -- Urgency & Status
  urgency_level       TEXT DEFAULT 'Medium'
    CHECK (urgency_level IN ('Low','Medium','High','Critical')),
  status              TEXT DEFAULT 'active'
    CHECK (status IN ('draft','active','fulfilled','expired','suspended')),

  -- Geospatial
  location_coords     JSONB NOT NULL,     -- { "lat": 37.066, "lng": 37.383 }
  location_label      TEXT,
  is_location_masked  BOOLEAN DEFAULT FALSE,

  -- Resource Tracking
  resource_type       TEXT,
  quantity_needed     INT,
  quantity_unit       TEXT DEFAULT 'units',
  quantity_fulfilled  INT DEFAULT 0,

  -- Media
  image_urls          TEXT[],

  -- Engagement
  view_count          INT DEFAULT 0,
  volunteer_slots     INT DEFAULT 0,
  volunteers_claimed  INT DEFAULT 0,

  -- Trust
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_by         UUID REFERENCES auth.users(id),
  verified_at         TIMESTAMPTZ
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_campaigns_org      ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_urgency  ON campaigns(urgency_level);
CREATE INDEX IF NOT EXISTS idx_campaigns_status   ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);

-- ── RLS: CAMPAIGNS ──────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Public: read active campaigns from verified orgs
CREATE POLICY "public_read_active_campaigns" ON campaigns
  FOR SELECT USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = org_id AND verification_status = 'verified'
    )
  );

-- Verified org owner: insert campaigns for their org
CREATE POLICY "verified_org_insert_campaign" ON campaigns
  FOR INSERT WITH CHECK (
    auth.uid() = posted_by
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = org_id
        AND owner_id = auth.uid()
        AND verification_status = 'verified'
    )
  );

-- Owner: update own campaigns
CREATE POLICY "owner_update_campaign" ON campaigns
  FOR UPDATE USING (posted_by = auth.uid());

-- Admin: update any campaign
CREATE POLICY "admin_update_campaign" ON campaigns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- ACTIVITY LOG TABLE  (Trust Layer — public accountability)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('organization','campaign','update','user')),
  entity_id    UUID NOT NULL,
  action       TEXT NOT NULL,  -- e.g. 'auto_verified', 'trust_score_updated', 'campaign_fulfilled'
  actor_id     UUID REFERENCES auth.users(id),
  metadata     JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON activity_log(action);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
-- Public can read the activity log (transparency by design)
CREATE POLICY "public_read_activity_log" ON activity_log
  FOR SELECT USING (true);
-- Only service role (Edge Functions) can insert
CREATE POLICY "service_insert_activity_log" ON activity_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- COMPUTED TRUST SCORE VIEW (convenience read)
-- ============================================================
CREATE OR REPLACE VIEW org_trust_breakdown AS
SELECT
  id,
  name,
  verification_status,
  trust_score,
  docs_submitted,
  un_ocha_registered,
  has_field_contact,
  community_reports,
  campaigns_fulfilled,
  days_active,
  -- Derived score components for UI breakdown
  CASE WHEN docs_submitted     THEN 25 ELSE 0 END AS pts_docs,
  CASE WHEN un_ocha_registered THEN 20 ELSE 0 END AS pts_ocha,
  CASE WHEN has_field_contact  THEN 20 ELSE 0 END AS pts_contact,
  LEAST(10, community_reports  * 1)               AS pts_community,
  LEAST(15, campaigns_fulfilled * 2)              AS pts_campaigns,
  LEAST(10, ROUND(days_active  * 0.1))            AS pts_longevity
FROM organizations;
