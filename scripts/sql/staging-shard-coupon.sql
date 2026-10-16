-- Apply only to lore-db-staging after 0024_repeatable_coupons.sql.
INSERT INTO coupons(code,amount,max_uses,expires_at,repeatable)
VALUES('LORE30000',30000,NULL,NULL,1)
ON CONFLICT(code) DO UPDATE SET amount=30000,max_uses=NULL,expires_at=NULL,repeatable=1;
