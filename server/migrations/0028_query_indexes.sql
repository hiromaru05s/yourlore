-- Additive indexes for eligibility checks; preserve all match and account data.
CREATE INDEX IF NOT EXISTS idx_ranked_results_applied_a ON ranked_results(a_id,season) WHERE applied=1;
CREATE INDEX IF NOT EXISTS idx_ranked_results_applied_b ON ranked_results(b_id,season) WHERE applied=1;
CREATE INDEX IF NOT EXISTS idx_inquiries_user_created ON inquiries(user_id,created_at);
