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
import { template as welcome } from './welcome.tsx'
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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'report-resolved': reportResolved,
  'welcome': welcome,
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
}
