import type { ServiceDefinition } from '@/config/services';
import { getService, isLiveService } from '@/lib/services/catalog';
import { APPLICATION_FIELDS } from '@/lib/validations/application';
import type { Selection } from './selection';

/**
 * Step model of the apply wizard: which steps a service needs, which fields
 * each step validates, and where a (possibly prefilled) visitor starts.
 * Pure functions, so the form component stays declarative and this is tested.
 */

export const STEP_IDS = ['service', 'plan', 'details'] as const;
export type StepId = (typeof STEP_IDS)[number];
export type ApplicationField = (typeof APPLICATION_FIELDS)[number];

/** The step that collects each field. A new schema field fails to compile until it is placed. */
const FIELD_STEP = {
  service: 'service',
  plan: 'plan',
  brandName: 'details',
  contactName: 'details',
  contactEmail: 'details',
  phone: 'details',
  branchCount: 'details',
} as const satisfies Record<ApplicationField, StepId>;

const INTEREST_STEPS: readonly StepId[] = ['service', 'details'];

/**
 * Steps for the chosen service. Coming-soon services are interest
 * registrations, so there is no plan to pick. Until a service is chosen the
 * full path is shown.
 */
export function getSteps(service: ServiceDefinition | undefined): readonly StepId[] {
  return service && !isLiveService(service) ? INTEREST_STEPS : STEP_IDS;
}

/** Fields to validate before leaving `step`, in form order. */
export function getStepFields(step: StepId): ApplicationField[] {
  return APPLICATION_FIELDS.filter((field) => FIELD_STEP[field] === step);
}

export function getStepForField(field: ApplicationField): StepId {
  return FIELD_STEP[field];
}

/** First step that still needs input, so prefilled links skip what is already chosen. */
export function getFirstIncompleteStep({ service, plan }: Selection): StepId {
  if (!service) return 'service';
  return isLiveService(getService(service)) && !plan ? 'plan' : 'details';
}
