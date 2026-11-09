import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertComposerModal } from '../components/AlertComposerModal';
import { AIAssistantPanel, AIAssistantPanelHandle } from '../components/AIAssistantPanel';
import { AppHeader } from '../components/AppHeader';
import { AteneaOrb } from '../components/AteneaOrb';
import { QuickActionCard } from '../components/QuickActionCard';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { AIAssistantIntent, ParsedAlertCommand } from '../services/ai/index';
import { subscribeAlertsForGroups } from '../services/alerts';
import { getGroupById, subscribeUserGroups } from '../services/groups';
import { AlertCategory, CommunityAlert, CommunityGroup } from '../types/domain';

const suggestions = ['"What happened today?"', '"Call an ambulance"', '"Start recording"'];
const helpResponse = `Puedo ayudarte con:

• Crear alertas
• Ver grupos
• Ver alertas
• Resumir tu sector
• Ver mapa
• Configurar sonidos
• Configurar ubicacion

Prueba escribiendo:

"crear alerta"
"ver grupos"
"resumir mi sector"`;
const unknownResponse = `Lo siento, todavia no entiendo esa instruccion.

Prueba escribiendo:

• crear alerta
• ver grupos
• ver alertas
• resumir mi sector
• ver mapa
• mi ubicacion`;

const quickActions = [
  {
    title: 'Emergency',
    subtitle: 'Report',
    kind: 'emergency_report',
    icon: 'warning-outline' as const,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  {
    title: 'Incident',
    subtitle: 'Report',
    kind: 'incident_report',
    icon: 'alert-circle-outline' as const,
    color: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  {
    title: 'Contactos',
    subtitle: 'SOS',
    kind: 'sos',
    icon: 'call-outline' as const,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  {
    title: 'Summarize',
    subtitle: 'My area',
    kind: 'summary',
    icon: 'document-text-outline' as const,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
  },
];

function buildLocalSummary(alerts: CommunityAlert[]) {
  const activeAlerts = alerts.slice(0, 50);

  if (!activeAlerts.length) {
    return {
      prompt: 'resumir mi sector',
      response: 'No encontré suficientes alertas cercanas para resumir.',
      status: 'fallido' as const,
      executedAction: 'resumen_sin_datos',
      spokenResponse: 'No encontré suficientes alertas cercanas para resumir.',
    };
  }

  const counts = activeAlerts.reduce<Record<AlertCategory, number>>(
    (accumulator, alert) => {
      accumulator[alert.category] += 1;
      return accumulator;
    },
    {
      Seguridad: 0,
      'Tr\u00e1nsito': 0,
      Comunidad: 0,
      Servicios: 0,
    },
  );

  return {
    prompt: 'resumir mi sector',
    response: [
      `Hay ${activeAlerts.length} alertas activas:`,
      `${counts.Seguridad} de seguridad`,
      `${counts['Tr\u00e1nsito']} de tránsito`,
      `${counts.Comunidad} de comunidad`,
      `${counts.Servicios} de servicios.`,
    ].join(' '),
    status: 'ejecutado' as const,
    executedAction: 'resumen_local_generado',
    spokenResponse: 'Resumen de tu zona preparado.',
  };
}

export function AteneaScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const aiPanelRef = useRef<AIAssistantPanelHandle>(null);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [alertCategory, setAlertCategory] = useState<AlertCategory>('Seguridad');
  const [alertComposerVisible, setAlertComposerVisible] = useState(false);
  const [alertDraft, setAlertDraft] = useState<ParsedAlertCommand>();
  const [alertDraftCallbacks, setAlertDraftCallbacks] = useState<{
    onCreated: () => Promise<void>;
    onCreateFailed: () => Promise<void>;
  }>();
  const [ateneaResponse, setAteneaResponse] = useState('');

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    return subscribeUserGroups(user.uid, setGroups, () => undefined);
  }, [user]);

  useEffect(() => {
    if (!user || !groups.length) {
      setAlerts([]);
      return undefined;
    }

    return subscribeAlertsForGroups(
      groups.map((group) => group.id),
      setAlerts,
      () => undefined,
      user.uid,
    );
  }, [groups, user]);

  async function handleAssistantIntent(intent: AIAssistantIntent, command?: ParsedAlertCommand) {
    switch (intent) {
      case 'open_groups':
        navigation.navigate('MainTabs', { screen: 'Groups' });
        return true;
      case 'show_map':
        navigation.navigate('Map');
        return true;
      case 'call_emergency':
        if (command?.emergencyGroupId) {
          const emergencyGroup = await getGroupById(command.emergencyGroupId);

          if (emergencyGroup) {
            navigation.navigate('Chat', { groupId: command.emergencyGroupId });
            return true;
          }

          setAteneaResponse('No encontramos ese grupo de emergencia todavia.');
          return false;
        }

        setAteneaResponse('Las llamadas reales todavia no estan activas.');
        return false;
      case 'create_alert':
      case 'show_summary':
      case 'unknown':
        return false;
    }
  }

  function handleCreateAlertDraft(
    command: ParsedAlertCommand,
    _historyEntryId?: string,
    callbacks?: {
      onCreated: () => Promise<void>;
      onCreateFailed: () => Promise<void>;
    },
  ) {
    setAlertDraft(command);
    setAlertDraftCallbacks(callbacks);
    setAlertCategory(command.category ?? 'Seguridad');
    setAteneaResponse('');
    setAlertComposerVisible(true);
  }

  async function handleQuickAction(kind: string) {
    switch (kind) {
      case 'emergency_report':
        await aiPanelRef.current?.runQuickActionCommand(
          'crear alerta de emergencia',
          'Preparé un reporte de emergencia.',
        );
        return;
      case 'incident_report':
        await aiPanelRef.current?.runQuickActionCommand(
          'hay un incidente en mi zona',
          'Preparé un reporte de incidente.',
        );
        return;
      case 'sos':
        await aiPanelRef.current?.runQuickActionCommand(
          'contactos sos',
          'Abriendo contactos de emergencia.',
        );
        return;
      case 'summary':
        await aiPanelRef.current?.showLocalSummary(buildLocalSummary(alerts));
        return;
    }
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <AppHeader title="ATENEA" subtitle="Tue, Jun 17 - River District" aiBadge showBell />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AteneaOrb />

        <View style={styles.heroCopy}>
          <Text style={styles.question}>How can I help you?</Text>
          <Text style={styles.prompt}>Speak or type a command</Text>
        </View>

        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <View key={suggestion} style={styles.suggestionPill}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>

        {ateneaResponse ? (
          <View style={styles.responseCard}>
            <Text style={styles.responseText}>{ateneaResponse}</Text>
          </View>
        ) : null}

        <AIAssistantPanel
          ref={aiPanelRef}
          onCreateAlertDraft={handleCreateAlertDraft}
          onIntent={handleAssistantIntent}
        />

        <View style={styles.quickBlock}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.title}
                title={action.title}
                subtitle={action.subtitle}
                icon={action.icon}
                color={action.color}
                backgroundColor={action.backgroundColor}
                onPress={() => {
                  void handleQuickAction(action.kind);
                }}
              />
            ))}
          </View>
        </View>

      </ScrollView>
      <AlertComposerModal
        groups={groups}
        initialCategory={alertCategory}
        initialDescription={alertDraft?.description}
        initialGroupId={alertDraft?.emergencyGroupId}
        initialTitle={alertDraft?.title}
        onClose={() => {
          setAlertComposerVisible(false);
          setAlertDraft(undefined);
          setAlertDraftCallbacks(undefined);
        }}
        onCreateFailed={() => {
          void alertDraftCallbacks?.onCreateFailed();
        }}
        onCreated={() => {
          void alertDraftCallbacks?.onCreated();
        }}
        userId={user?.uid}
        visible={alertComposerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 132,
    paddingHorizontal: 24,
  },
  heroCopy: {
    alignItems: 'center',
    marginTop: -8,
  },
  question: {
    color: colors.ink,
    fontSize: 27,
    fontWeight: '900',
  },
  prompt: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '500',
    marginTop: 8,
  },
  suggestions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  suggestionPill: {
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestionText: {
    color: '#263D5C',
    fontSize: 14,
    fontWeight: '700',
  },
  responseCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  responseText: {
    color: '#263D5C',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  quickBlock: {
    marginTop: 18,
    width: '100%',
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
