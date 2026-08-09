import { serveReviewFollowup } from "../_shared/review-followup.ts";

serveReviewFollowup({
  edgeName: "send-avis-j10",
  dayOffset: 10,
  flagColumn: "review_j10_sent",
  stage: "j10",
});
