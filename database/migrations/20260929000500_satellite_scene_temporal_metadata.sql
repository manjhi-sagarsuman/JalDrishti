-- Explicit acquisition resolution and observation period for satellite scenes.
-- Existing records remain NULL where this metadata was not supplied.

alter table public.satellite_scenes
  add column resolution_m numeric(10, 3),
  add column observation_start date,
  add column observation_end date;

alter table public.satellite_scenes
  add constraint satellite_scenes_resolution_positive
    check (resolution_m is null or resolution_m > 0),
  add constraint satellite_scenes_observation_period_order
    check (observation_end is null or observation_start is null or observation_end >= observation_start);

comment on column public.satellite_scenes.resolution_m is 'Ground sampling resolution in metres when supplied by the data provider.';
comment on column public.satellite_scenes.observation_start is 'Start date of the observation/composite period when distinct from acquisition time.';
comment on column public.satellite_scenes.observation_end is 'End date of the observation/composite period when distinct from acquisition time.';
