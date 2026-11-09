import {
  AIAssistantProvider,
  AIAssistantIntent,
  AIMessageResponse,
  EmergencyGroupId,
  ParsedAlertCommand,
} from './types';

type AlertMatch = {
  pattern: RegExp;
  category: ParsedAlertCommand['category'];
  title: string;
  emergencyGroupId?: EmergencyGroupId;
  confidence: number;
};

function normalize(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?\u00bf\u00a1]/g, ' ')
    .replace(/\s+/g, ' ');
}

function getNavigationIntent(normalized: string): AIAssistantIntent | undefined {
  if (/\b(abre|abrir|mostrar|muestrame|ver)\b.*\b(grupos|comunidades)\b/.test(normalized)) {
    return 'open_groups';
  }

  if (/\b(muestrame|mostrar|abre|abrir|ver)\b.*\bmapa\b/.test(normalized) || normalized === 'mapa') {
    return 'show_map';
  }

  return undefined;
}

function buildEmergencyGroup(normalized: string): EmergencyGroupId | undefined {
  if (/\b(bombero|bomberos|incendio|fuego|humo|gas)\b/.test(normalized)) {
    return 'default-firefighters';
  }

  if (/\b(ambulancia|herido|herida|salud|medico|medica)\b/.test(normalized)) {
    return 'default-ambulance';
  }

  if (/\b(carabineros|policia|robo|asalto|sospechoso|seguridad|pelea)\b/.test(normalized)) {
    return 'default-police';
  }

  return undefined;
}

function getEmergencyCall(normalized: string): EmergencyGroupId | undefined {
  if (/\b(llama|llamar|necesito)\b.*\b(bombero|bomberos)\b/.test(normalized)) {
    return 'default-firefighters';
  }

  if (/\b(llama|llamar|necesito)\b.*\b(carabineros|policia)\b/.test(normalized)) {
    return 'default-police';
  }

  if (
    /\b(llama|llamar|necesito)\b.*\bambulancia\b/.test(normalized) ||
    /\bemergencia medica\b/.test(normalized)
  ) {
    return 'default-ambulance';
  }

  return undefined;
}

function isEmergencyContactsCommand(normalized: string) {
  return /\b(contactos sos|contactos de emergencia|abrir emergencia|abrir contactos)\b/.test(normalized);
}

const ALERT_MATCHES: AlertMatch[] = [
  {
    pattern: /\b(crear alerta de emergencia|reporte de emergencia|emergency report)\b/,
    category: 'Seguridad',
    title: 'Reporte de emergencia',
    emergencyGroupId: 'default-police',
    confidence: 0.8,
  },
  {
    pattern: /\b(hay un incidente|incidente en mi zona|reporte de incidente|incident report)\b/,
    category: 'Comunidad',
    title: 'Incidente reportado',
    confidence: 0.72,
  },
  {
    pattern: /\b(hay un robo|hay robo|me robaron|robo|asalto)\b/,
    category: 'Seguridad',
    title: 'Robo reportado',
    emergencyGroupId: 'default-police',
    confidence: 0.84,
  },
  {
    pattern: /\b(pelea|hay una pelea|hay pelea)\b/,
    category: 'Seguridad',
    title: 'Pelea reportada',
    emergencyGroupId: 'default-police',
    confidence: 0.82,
  },
  {
    pattern: /\b(persona sospechosa|sospechoso|sospechosa)\b/,
    category: 'Seguridad',
    title: 'Persona sospechosa',
    emergencyGroupId: 'default-police',
    confidence: 0.78,
  },
  {
    pattern: /\b(incendio|fuego|humo|quemando)\b/,
    category: 'Seguridad',
    title: 'Incendio reportado',
    emergencyGroupId: 'default-firefighters',
    confidence: 0.86,
  },
  {
    pattern: /\b(accidente|choque|colision|atropello)\b/,
    category: 'Tr\u00e1nsito',
    title: 'Accidente vehicular',
    emergencyGroupId: 'default-ambulance',
    confidence: 0.82,
  },
  {
    pattern: /\b(taco|trafico|transito lento|congestion)\b/,
    category: 'Tr\u00e1nsito',
    title: 'Congesti\u00f3n vehicular',
    confidence: 0.76,
  },
  {
    pattern: /\b(vehiculo detenido|auto detenido|calle bloqueada|via bloqueada|avenida bloqueada)\b/,
    category: 'Tr\u00e1nsito',
    title: 'Calle bloqueada',
    confidence: 0.78,
  },
  {
    pattern: /\bbasura acumulada\b/,
    category: 'Comunidad',
    title: 'Basura acumulada',
    confidence: 0.74,
  },
  {
    pattern: /\bruido molesto\b/,
    category: 'Comunidad',
    title: 'Ruido molesto',
    confidence: 0.74,
  },
  {
    pattern: /\bperro perdido\b/,
    category: 'Comunidad',
    title: 'Perro perdido',
    confidence: 0.74,
  },
  {
    pattern: /\bproblema vecinal\b/,
    category: 'Comunidad',
    title: 'Problema vecinal',
    confidence: 0.72,
  },
  {
    pattern: /\b(corte de luz|sin luz)\b/,
    category: 'Servicios',
    title: 'Corte de luz',
    confidence: 0.82,
  },
  {
    pattern: /\b(sin agua|corte de agua)\b/,
    category: 'Servicios',
    title: 'Corte de agua',
    confidence: 0.8,
  },
  {
    pattern: /\b(fuga de gas|olor a gas)\b/,
    category: 'Servicios',
    title: 'Fuga de gas',
    emergencyGroupId: 'default-firefighters',
    confidence: 0.86,
  },
  {
    pattern: /\b(poste caido|poste en el suelo|alumbrado)\b/,
    category: 'Servicios',
    title: 'Poste ca\u00eddo',
    confidence: 0.78,
  },
];

function buildDescription(originalText: string, title: string) {
  const trimmedText = originalText.trim();

  if (!trimmedText) {
    return title;
  }

  return `${title}. Reporte del usuario: "${trimmedText}"`;
}

export async function parseMockAlertCommand(text: string): Promise<ParsedAlertCommand> {
  const normalized = normalize(text);

  if (!normalized) {
    return {
      intent: 'unknown',
      confidence: 0,
    };
  }

  const emergencyGroupId = getEmergencyCall(normalized);
  if (emergencyGroupId) {
    return {
      intent: 'call_emergency',
      emergencyGroupId,
      confidence: 0.86,
    };
  }

  if (isEmergencyContactsCommand(normalized)) {
    return {
      intent: 'call_emergency',
      confidence: 0.76,
    };
  }

  const navigationIntent = getNavigationIntent(normalized);
  if (navigationIntent) {
    return {
      intent: navigationIntent,
      confidence: 0.78,
    };
  }

  const alertMatch = ALERT_MATCHES.find((match) => match.pattern.test(normalized));

  if (alertMatch) {
    return {
      intent: 'create_alert',
      category: alertMatch.category,
      title: alertMatch.title,
      description: buildDescription(text, alertMatch.title),
      emergencyGroupId: alertMatch.emergencyGroupId ?? buildEmergencyGroup(normalized),
      confidence: alertMatch.confidence,
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.25,
  };
}

function getEmergencyGroupLabel(groupId?: EmergencyGroupId) {
  switch (groupId) {
    case 'default-firefighters':
      return 'bomberos';
    case 'default-police':
      return 'carabineros';
    case 'default-ambulance':
      return 'ambulancia';
    default:
      return 'emergencia';
  }
}

function buildMockResponse(parsedCommand: ParsedAlertCommand, sector: string): AIMessageResponse {
  if (parsedCommand.intent === 'create_alert') {
    return {
      text: `Detecte una posible alerta de ${parsedCommand.category?.toLowerCase()}${sector}. Revisa la previsualizacion antes de crearla.`,
      parsedCommand,
    };
  }

  if (parsedCommand.intent === 'open_groups') {
    return {
      text: 'Abriendo grupos...',
      parsedCommand,
    };
  }

  if (parsedCommand.intent === 'show_map') {
    return {
      text: 'Abriendo mapa...',
      parsedCommand,
    };
  }

  if (parsedCommand.intent === 'call_emergency') {
    return {
      text: `Prepare el contacto de emergencia: ${getEmergencyGroupLabel(parsedCommand.emergencyGroupId)}.`,
      parsedCommand,
    };
  }

  return {
    text: 'No entendi el comando. Puedes decir: hay un accidente, llama a bomberos o abre grupos.',
    parsedCommand,
  };
}

export const mockProvider: AIAssistantProvider = {
  provider: 'mock',
  async sendMessage(prompt, context) {
    const parsedCommand = await parseMockAlertCommand(prompt);
    const sector = context?.sector ? ` en ${context.sector}` : '';

    return buildMockResponse(parsedCommand, sector);
  },
  parseAlertCommand: parseMockAlertCommand,
};
