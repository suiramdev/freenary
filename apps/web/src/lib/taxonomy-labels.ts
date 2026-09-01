import {
  isCategoryGroup,
  isSpendingCategory,
} from "@freenary/api/lib/taxonomy";
import type {
  CategoryGroup,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";

import { m } from "@/paraglide/messages.js";

/**
 * The tables hold the message *functions*: calling one here would freeze the
 * locale of whichever request loaded this module first. `satisfies` is what
 * makes a new slug in the taxonomy a compile error rather than a blank label.
 */
const GROUP_MESSAGES = {
  "daily-living": m.category_group_daily_living,
  education: m.category_group_education,
  financial: m.category_group_financial,
  health: m.category_group_health,
  housing: m.category_group_housing,
  income: m.category_group_income,
  investments: m.category_group_investments,
  leisure: m.category_group_leisure,
  other: m.category_group_other,
  shopping: m.category_group_shopping,
  subscriptions: m.category_group_subscriptions,
  taxes: m.category_group_taxes,
  transfers: m.category_group_transfers,
  transport: m.category_group_transport,
  travel: m.category_group_travel,
  utilities: m.category_group_utilities,
} satisfies Record<CategoryGroup, () => string>;

const CATEGORY_MESSAGES = {
  accommodation: m.category_accommodation,
  "bank-fees": m.category_bank_fees,
  "bars-cafes": m.category_bars_cafes,
  benefits: m.category_benefits,
  "cash-withdrawal": m.category_cash_withdrawal,
  "child-support": m.category_child_support,
  childcare: m.category_childcare,
  clothing: m.category_clothing,
  courses: m.category_courses,
  crypto: m.category_crypto,
  culture: m.category_culture,
  donations: m.category_donations,
  electronics: m.category_electronics,
  energy: m.category_energy,
  flights: m.category_flights,
  fuel: m.category_fuel,
  furniture: m.category_furniture,
  gifts: m.category_gifts,
  groceries: m.category_groceries,
  "health-insurance": m.category_health_insurance,
  hobbies: m.category_hobbies,
  "home-charges": m.category_home_charges,
  "home-insurance": m.category_home_insurance,
  "home-maintenance": m.category_home_maintenance,
  "household-supplies": m.category_household_supplies,
  "income-tax": m.category_income_tax,
  "internal-transfer": m.category_internal_transfer,
  "investment-income": m.category_investment_income,
  "life-insurance": m.category_life_insurance,
  "loan-repayment": m.category_loan_repayment,
  medical: m.category_medical,
  memberships: m.category_memberships,
  mortgage: m.category_mortgage,
  "other-daily-living": m.category_other_daily_living,
  "other-education": m.category_other_education,
  "other-financial": m.category_other_financial,
  "other-health": m.category_other_health,
  "other-housing": m.category_other_housing,
  "other-income": m.category_other_income,
  "other-insurance": m.category_other_insurance,
  "other-investment": m.category_other_investment,
  "other-leisure": m.category_other_leisure,
  "other-shopping": m.category_other_shopping,
  "other-subscription": m.category_other_subscription,
  "other-taxes": m.category_other_taxes,
  "other-transfer": m.category_other_transfer,
  "other-transport": m.category_other_transport,
  "other-travel": m.category_other_travel,
  "other-utilities": m.category_other_utilities,
  "parking-tolls": m.category_parking_tolls,
  "personal-care": m.category_personal_care,
  pets: m.category_pets,
  pharmacy: m.category_pharmacy,
  "property-tax": m.category_property_tax,
  "public-transport": m.category_public_transport,
  refunds: m.category_refunds,
  rent: m.category_rent,
  "rental-income": m.category_rental_income,
  restaurants: m.category_restaurants,
  retirement: m.category_retirement,
  salary: m.category_salary,
  savings: m.category_savings,
  securities: m.category_securities,
  "self-employment": m.category_self_employment,
  software: m.category_software,
  sports: m.category_sports,
  streaming: m.category_streaming,
  takeaway: m.category_takeaway,
  taxi: m.category_taxi,
  telecom: m.category_telecom,
  tuition: m.category_tuition,
  uncategorised: m.category_uncategorised,
  "vehicle-insurance": m.category_vehicle_insurance,
  "vehicle-maintenance": m.category_vehicle_maintenance,
  water: m.category_water,
} satisfies Record<SpendingCategory, () => string>;

export const categoryGroupLabel = (group: CategoryGroup): string =>
  GROUP_MESSAGES[group]();

export const categoryLabel = (category: SpendingCategory): string =>
  CATEGORY_MESSAGES[category]();

/** A category tree entry: built-in keys are translated, a custom entry's own name is not. */
export const categoryEntryLabel = (entry: {
  isCustom: boolean;
  key: string;
  label: string;
}): string => {
  if (entry.isCustom) {
    return entry.label;
  }
  if (isCategoryGroup(entry.key)) {
    return categoryGroupLabel(entry.key);
  }
  if (isSpendingCategory(entry.key)) {
    return categoryLabel(entry.key);
  }
  return entry.label;
};
