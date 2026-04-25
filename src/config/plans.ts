export const PLANS = {
    starter: { max_branches: 3, max_users: 10, label: 'Starter' },
    growth: { max_branches: 10, max_users: 30, label: 'Growth' },
    enterprise: { max_branches: 999, max_users: 50, label: 'Enterprise' },
} as const;

export type PlanKey = keyof typeof PLANS;