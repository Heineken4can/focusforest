-- Support Auth refresh/logout lookup by hashed token while ignoring revoked rows.
CREATE INDEX "idx_refresh_token_hash_active_created"
ON "RefreshToken" ("tokenHash", "createdAt" DESC)
WHERE "revokedAt" IS NULL;
