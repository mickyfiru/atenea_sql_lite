export type CommandIntent =
  | 'CREATE_ALERT'
  | 'OPEN_GROUPS'
  | 'OPEN_ALERTS'
  | 'OPEN_SUMMARY'
  | 'OPEN_MAP'
  | 'OPEN_LOCATION'
  | 'OPEN_SOUND_SETTINGS'
  | 'OPEN_PROFILE'
  | 'HELP'
  | 'UNKNOWN';

export type ParsedCommand = {
  intent: CommandIntent;
  input: string;
};
