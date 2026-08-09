import { serveReviewFollowup } from "../_shared/review-followup.ts";

serveReviewFollowup({
  edgeName: "send-avis-j20",
  dayOffset: 20,
  flagColumn: "review_j20_sent",
  stage: "j20",
});
