-- Pay cycle anchor day (1-31). Null = use calendar month.
alter table profiles
  add column if not exists pay_cycle_day smallint
  check (pay_cycle_day is null or (pay_cycle_day between 1 and 31));

comment on column profiles.pay_cycle_day is
  'Day of month salary lands. Dashboard/Reports use this as cycle start. Null = calendar month.';
