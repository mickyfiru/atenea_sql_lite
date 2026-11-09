import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius } from '../constants/theme';
import { ALERT_CATEGORIES, createAlert } from '../services/alerts';
import { uploadAlertMedia } from '../services/media';
import { AlertCategory, CommunityGroup } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';
import { PrimaryButton } from './PrimaryButton';

type AlertComposerModalProps = {
  groups: CommunityGroup[];
  initialCategory?: AlertCategory;
  initialDescription?: string;
  initialGroupId?: string;
  initialTitle?: string;
  onClose: () => void;
  onCreateFailed?: () => void;
  onCreated?: () => void;
  userId?: string;
  visible: boolean;
};

export function AlertComposerModal({
  groups,
  initialCategory = 'Seguridad',
  initialDescription = '',
  initialGroupId = '',
  initialTitle = '',
  onClose,
  onCreateFailed,
  onCreated,
  userId,
  visible,
}: AlertComposerModalProps) {
  const [category, setCategory] = useState<AlertCategory>(initialCategory);
  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory);
      setDescription(initialDescription);
      setGroupId(initialGroupId);
      setTitle(initialTitle);
    }
  }, [initialCategory, initialDescription, initialGroupId, initialTitle, visible]);

  const selectedGroupId = groupId || groups[0]?.id || '';

  const close = () => {
    if (saving) {
      return;
    }

    setError('');
    onClose();
  };

  const submit = async () => {
    if (!userId || saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      let mediaUrl: string | undefined;
      let mediaUploadFailed = false;

      if (media) {
        try {
          mediaUrl = await uploadAlertMedia({
            uri: media.uri,
            userId,
            contentType: getMediaContentType(media),
          });
        } catch (mediaError) {
          mediaUploadFailed = true;
          console.warn('No se pudo adjuntar la imagen de la alerta.', mediaError);
        }
      }

      await createAlert({
        userId,
        groupId: selectedGroupId,
        category,
        title,
        description,
        mediaUrl,
        mediaType: mediaUrl ? getAlertMediaType(media) : '',
      });
      onCreated?.();
      setTitle('');
      setDescription('');
      setGroupId('');
      setMedia(undefined);

      if (mediaUploadFailed) {
        setError('La alerta se guardo, pero no pudimos adjuntar la imagen. Intenta con otra foto mas tarde.');
        return;
      }

      onClose();
    } catch (submitError) {
      onCreateFailed?.();
      setError(submitError instanceof Error ? submitError.message : 'No pudimos crear la alerta.');
    } finally {
      setSaving(false);
    }
  };

  function getAlertMediaType(asset?: ImagePicker.ImagePickerAsset) {
    return asset?.type === 'video' ? 'video' : asset ? 'image' : '';
  }

  function getMediaContentType(asset: ImagePicker.ImagePickerAsset) {
    if (asset.mimeType) {
      return asset.mimeType;
    }

    return asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
  }

  const takePhoto = async () => {
    if (saving) {
      return;
    }

    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setError('ATENEA necesita permiso de camara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  const pickImage = async () => {
    if (saving) {
      return;
    }

    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('ATENEA necesita permiso de galeria para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.72,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Crear alerta</Text>
          <Text style={styles.subtitle}>Selecciona categoria y grupo asociado.</Text>

          <View style={styles.categoryRow}>
            {ALERT_CATEGORIES.map((nextCategory) => {
              const tone = getAlertCategoryTone(nextCategory);
              const active = nextCategory === category;

              return (
                <Pressable
                  key={nextCategory}
                  onPress={() => setCategory(nextCategory)}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: active ? tone.color : tone.backgroundColor },
                  ]}
                >
                  <Ionicons
                    name={tone.icon}
                    size={18}
                    color={active ? colors.background : tone.color}
                  />
                  <Text style={[styles.categoryText, { color: active ? colors.background : tone.color }]}>
                    {nextCategory}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroller}>
            {groups.map((group) => {
              const active = selectedGroupId === group.id;

              return (
                <Pressable
                  key={group.id}
                  onPress={() => setGroupId(group.id)}
                  style={[styles.groupChip, active && styles.groupChipActive]}
                >
                  <Text style={[styles.groupChipText, active && styles.groupChipTextActive]}>
                    {group.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!groups.length ? (
            <Text style={styles.emptyHint}>
              Necesitas pertenecer a un grupo para crear alertas.
            </Text>
          ) : null}

          <TextInput
            editable={!saving}
            onChangeText={setTitle}
            placeholder="Titulo de la alerta"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
          />
          <TextInput
            editable={!saving}
            multiline
            onChangeText={setDescription}
            placeholder="Descripcion"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textArea]}
            value={description}
          />

          <View style={styles.mediaActions}>
            <Pressable disabled={saving} onPress={takePhoto} style={styles.mediaButton}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.mediaButtonText}>Tomar foto</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={pickImage} style={styles.mediaButton}>
              <Ionicons name="image-outline" size={20} color={colors.primary} />
              <Text style={styles.mediaButtonText}>Galeria</Text>
            </Pressable>
          </View>

          {media ? (
            <View style={styles.previewWrap}>
              {media.type === 'video' ? (
                <View style={styles.videoPreview}>
                  <Ionicons name="videocam-outline" size={28} color={colors.primary} />
                  <Text style={styles.videoPreviewText}>Video seleccionado</Text>
                </View>
              ) : (
                <Image source={{ uri: media.uri }} style={styles.previewImage} />
              )}
              <Pressable
                disabled={saving}
                onPress={() => setMedia(undefined)}
                style={styles.removeMediaButton}
              >
                <Ionicons name="close" size={18} color={colors.background} />
              </Pressable>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              disabled={saving || !userId || !groups.length}
              label={saving ? 'Guardando...' : 'Guardar alerta'}
              onPress={submit}
              style={styles.actionButton}
            />
            <PrimaryButton
              disabled={saving}
              label="Cancelar"
              onPress={close}
              style={styles.actionButton}
              variant="light"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 20, 43, 0.38)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    gap: 12,
    maxHeight: '88%',
    padding: 20,
    width: '100%',
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '900',
  },
  groupScroller: {
    flexGrow: 0,
  },
  groupChip: {
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  groupChipActive: {
    backgroundColor: colors.primary,
  },
  groupChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  groupChipTextActive: {
    color: colors.background,
  },
  input: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  mediaButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  previewWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  previewImage: {
    backgroundColor: colors.soft,
    height: 150,
    width: '100%',
  },
  videoPreview: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    gap: 8,
    height: 150,
    justifyContent: 'center',
    width: '100%',
  },
  videoPreviewText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  removeMediaButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 20, 43, 0.72)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyHint: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    padding: 12,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    minHeight: 50,
  },
});
