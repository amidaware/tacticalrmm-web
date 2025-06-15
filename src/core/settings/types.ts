export interface Schedule {
  id: number;
  name: string;
  run_time: string;
  run_time_weekdays: number[];
  monthly_months_of_year: number[];
  monthly_days_of_month: number[];
  monthly_weeks_of_month: number[];
  schedule_type: "daily" | "weekly" | "monthly";
  monthly_type: "days" | "weeks";
}
