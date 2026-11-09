import { CommandIntent, ParsedCommand } from '../types/commands';

const COMMAND_PATTERNS: Array<{
  intent: CommandIntent;
  patterns: RegExp[];
}> = [
  {
    intent: 'CREATE_ALERT',
    patterns: [
      /\bcrear alerta\b/,
      /\bcrear una alerta\b/,
      /\bquiero crear una alerta\b/,
      /\breportar incidente\b/,
      /\bnueva alerta\b/,
    ],
  },
  {
    intent: 'OPEN_SUMMARY',
    patterns: [
      /\bresumir mi sector\b/,
      /\bresumen de mi zona\b/,
      /\bque esta pasando cerca\b/,
      /\bque pasa cerca\b/,
      /\bresumen\b/,
    ],
  },
  {
    intent: 'OPEN_MAP',
    patterns: [
      /\bver mapa\b/,
      /\babrir mapa\b/,
      /\bmapa\b/,
    ],
  },
  {
    intent: 'OPEN_GROUPS',
    patterns: [
      /\bver grupos\b/,
      /\babrir grupos\b/,
      /\bmostrar comunidades\b/,
      /\bcomunidades\b/,
    ],
  },
  {
    intent: 'OPEN_ALERTS',
    patterns: [
      /\bver alertas\b/,
      /\bmostrar alertas\b/,
      /\bhistorial de alertas\b/,
    ],
  },
  {
    intent: 'OPEN_SOUND_SETTINGS',
    patterns: [
      /\bconfigurar sonidos\b/,
      /\bsonidos\b/,
      /\bcambiar sonidos\b/,
    ],
  },
  {
    intent: 'OPEN_LOCATION',
    patterns: [
      /\bmi ubicacion\b/,
      /\bconfigurar ubicacion\b/,
      /\bubicacion\b/,
    ],
  },
  {
    intent: 'OPEN_PROFILE',
    patterns: [
      /\bperfil\b/,
      /\babrir perfil\b/,
    ],
  },
  {
    intent: 'HELP',
    patterns: [
      /\bayuda\b/,
      /\bque puedes hacer\b/,
      /\bcomandos\b/,
    ],
  },
];

function normalizeInput(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00bf?\u00a1!.,;:]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function parseCommand(input: string): ParsedCommand {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput) {
    return {
      intent: 'UNKNOWN',
      input,
    };
  }

  const match = COMMAND_PATTERNS.find((command) =>
    command.patterns.some((pattern) => pattern.test(normalizedInput)),
  );

  return {
    intent: match?.intent ?? 'UNKNOWN',
    input,
  };
}
