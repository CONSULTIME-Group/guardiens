import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const sql = readFileSync(".lovable/0019_home_counts_and_social_proof.sql", "utf8");
assert.match(sql, /RETURNS TABLE\(gardiens_count integer, helpers_count integer\)/);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.home_social_proof\(\)/);
assert.match(sql, /ur\.user_id IN \(r\.reviewer_id, r\.reviewee_id\)/);
assert.match(sql, /ur\.user_id IN \(f\.giver_id, f\.receiver_id\)/);
assert.match(sql, /LIMIT 6/);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.home_social_proof\(\) TO anon, authenticated, service_role/);
console.log("H1 SQL contracts OK");