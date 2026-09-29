-- Preserve exact GM/ladder transitions for result playback and reconnects.
ALTER TABLE ranked_results ADD COLUMN a_rank_before INTEGER;
ALTER TABLE ranked_results ADD COLUMN b_rank_before INTEGER;
ALTER TABLE ranked_results ADD COLUMN a_rank_after INTEGER;
ALTER TABLE ranked_results ADD COLUMN b_rank_after INTEGER;
