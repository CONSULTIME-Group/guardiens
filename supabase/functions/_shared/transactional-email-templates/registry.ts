/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as reportResolved } from './report-resolved.tsx'
import { template as newApplication } from './new-application.tsx'
import { template as applicationDeclined } from './application-declined.tsx'
import { template as applicationAccepted } from './application-accepted.tsx'
import { template as newMessage } from './new-message.tsx'
import { template as subscriptionExpires30d } from './subscription-expires-30d.tsx'
import { template as subscriptionExpires7d } from './subscription-expires-7d.tsx'
import { template as subscriptionExpired } from './subscription-expired.tsx'
import { template as identityVerified } from './identity-verified.tsx'
import { template as identityRejected } from './identity-rejected.tsx'
import { template as reviewReminder } from './review-reminder.tsx'
import { template as missionResponse } from './mission-response.tsx'
import { template as cancellationByOwner } from './cancellation-by-owner.tsx'
import { template as cancellationBySitter } from './cancellation-by-sitter.tsx'
import { template as cancellationReviewPublished } from './cancellation-review-published.tsx'
import { template as cancellationResponsePublished } from './cancellation-response-published.tsx'
import { template as onboardingJ1 } from './onboarding-j1.tsx'
import { template as contactReply } from './contact-reply.tsx'
import { template as relanceCpManquant } from './relance-cp-manquant.tsx'
import { template as reviewReceived } from './review-received.tsx'
import { template as disputeResolved } from './dispute-resolved.tsx'
import { template as relanceProfilIncomplet } from './relance-profil-incomplet.tsx'
import { template as nearbySitAlert } from './nearby-sit-alert.tsx'
import { template as sitConfirmed } from './sit-confirmed.tsx'
import { template as conseilsAnnoncePersonnalises } from './conseils-annonce-personnalises.tsx'
import { template as conseilsPublicationAnnonce } from './conseils-publication-annonce.tsx'
import { template as relancePieceIdentite } from './relance-piece-identite.tsx'
import { template as availabilityNudge } from './availability-nudge.tsx'
import { template as reactivationD30 } from './reactivation-d30.tsx'
import { template as sitterEncourageCandidature } from './sitter-encourage-candidature.tsx'
import { template as discoverMutualAid1 } from './discover-mutual-aid-1.tsx'
import { template as discoverMutualAid2 } from './discover-mutual-aid-2.tsx'
import { template as discoverMutualAid0 } from './discover-mutual-aid-0.tsx'
import { template as sitInvitation } from './sit-invitation.tsx'
import { template as listingUnpublishedFeedback } from './listing-unpublished-feedback.tsx'
import { template as missionInvitation } from './mission-invitation.tsx'
import { template as unreadMessagesReminder } from './unread-messages-reminder.tsx'
import { template as missionProposalAccepted } from './mission-proposal-accepted.tsx'
import { template as missionProposalDeclined } from './mission-proposal-declined.tsx'
import { template as ownerNoSitJ3 } from './owner-no-sit-j3.tsx'
import { template as ownerNoSitJ10 } from './owner-no-sit-j10.tsx'
import { template as referralBoostMonthly } from './referral-boost-monthly.tsx'
import { template as proProfileApproved } from './pro-profile-approved.tsx'
import { template as proProfileRejected } from './pro-profile-rejected.tsx'
import { template as summerListingReminder } from './summer-listing-reminder.tsx'
import { template as sitterMutualAidInvite } from './sitter-mutual-aid-invite.tsx'
import { template as analysisRequestsDigest } from './analysis-requests-digest.tsx'
import { template as sitDraftReminder } from './sit-draft-reminder.tsx'
import { template as sitterDailyDigest } from './sitter-daily-digest.tsx'


export const TEMPLATES: Record<string, TemplateEntry> = {
  'nearby-sit-alert': nearbySitAlert,
  'sit-confirmed': sitConfirmed,
  'dispute-resolved': disputeResolved,
  'report-resolved': reportResolved,
  'new-application': newApplication,
  'application-declined': applicationDeclined,
  'application-accepted': applicationAccepted,
  'new-message': newMessage,
  'subscription-expires-30d': subscriptionExpires30d,
  'subscription-expires-7d': subscriptionExpires7d,
  'subscription-expired': subscriptionExpired,
  'identity-verified': identityVerified,
  'identity-rejected': identityRejected,
  'review-reminder': reviewReminder,
  'mission-response': missionResponse,
  'cancellation-by-owner': cancellationByOwner,
  'cancellation-by-sitter': cancellationBySitter,
  'cancellation-review-published': cancellationReviewPublished,
  'cancellation-response-published': cancellationResponsePublished,
  'onboarding-j1': onboardingJ1,
  'contact-reply': contactReply,
  'relance-cp-manquant': relanceCpManquant,
  'review-received': reviewReceived,
  'relance-profil-incomplet': relanceProfilIncomplet,
  'conseils-annonce-personnalises': conseilsAnnoncePersonnalises,
  'conseils-publication-annonce': conseilsPublicationAnnonce,
  'relance-piece-identite': relancePieceIdentite,
  'availability-nudge': availabilityNudge,
  'reactivation-d30': reactivationD30,
  'sitter-encourage-candidature': sitterEncourageCandidature,
  'discover-mutual-aid-1': discoverMutualAid1,
  'discover-mutual-aid-2': discoverMutualAid2,
  'discover-mutual-aid-0': discoverMutualAid0,
  'sit-invitation': sitInvitation,
  'listing-unpublished-feedback': listingUnpublishedFeedback,
  'mission-invitation': missionInvitation,
  'unread-messages-reminder': unreadMessagesReminder,
  'mission-proposal-accepted': missionProposalAccepted,
  'mission-proposal-declined': missionProposalDeclined,
  'owner-no-sit-j3': ownerNoSitJ3,
  'owner-no-sit-j10': ownerNoSitJ10,
  'referral-boost-monthly': referralBoostMonthly,
  'pro-profile-approved': proProfileApproved,
  'pro-profile-rejected': proProfileRejected,
  'summer-listing-reminder': summerListingReminder,
  'sitter-mutual-aid-invite': sitterMutualAidInvite,
  'analysis-requests-digest': analysisRequestsDigest,
  'sit-draft-reminder': sitDraftReminder,
  'sitter-daily-digest': sitterDailyDigest,
}


