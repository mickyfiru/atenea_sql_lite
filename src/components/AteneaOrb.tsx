import { StyleSheet, View } from 'react-native';

import { colors } from '../constants/theme';

export function AteneaOrb() {
  return (
    <View style={styles.outer}>
      <View style={styles.dotted} />
      <View style={[styles.arc, styles.arcTop]} />
      <View style={[styles.arc, styles.arcBottom]} />
      <View style={[styles.dot, styles.dotOne]} />
      <View style={[styles.dot, styles.dotTwo]} />
      <View style={[styles.dot, styles.dotThree]} />
      <View style={styles.core}>
        <View style={styles.hexagon}>
          <View style={styles.nodeTop} />
          <View style={styles.nodeLeft} />
          <View style={styles.nodeRight} />
          <View style={styles.nodeBottom} />
          <View style={styles.center} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    height: 204,
    justifyContent: 'center',
    width: 204,
  },
  dotted: {
    borderColor: '#BBD3FF',
    borderRadius: 84,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 168,
    position: 'absolute',
    width: 168,
  },
  arc: {
    borderColor: '#8EB2FF',
    borderRadius: 72,
    borderWidth: 4,
    height: 144,
    position: 'absolute',
    width: 144,
  },
  arcTop: {
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-34deg' }],
  },
  arcBottom: {
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    transform: [{ rotate: '-12deg' }],
  },
  dot: {
    backgroundColor: '#8EB2FF',
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  dotOne: {
    left: 32,
    top: 48,
  },
  dotTwo: {
    right: 40,
    top: 80,
  },
  dotThree: {
    bottom: 38,
    left: 80,
  },
  core: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.36,
    shadowRadius: 30,
    width: 104,
  },
  hexagon: {
    alignItems: 'center',
    borderColor: '#AFC8FF',
    borderRadius: 10,
    borderWidth: 2,
    height: 54,
    justifyContent: 'center',
    transform: [{ rotate: '30deg' }],
    width: 54,
  },
  center: {
    backgroundColor: colors.background,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  nodeTop: {
    backgroundColor: '#CDE0FF',
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    top: -4,
    width: 6,
  },
  nodeLeft: {
    backgroundColor: '#CDE0FF',
    borderRadius: 3,
    height: 6,
    left: -4,
    position: 'absolute',
    width: 6,
  },
  nodeRight: {
    backgroundColor: '#CDE0FF',
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: -4,
    width: 6,
  },
  nodeBottom: {
    backgroundColor: '#CDE0FF',
    borderRadius: 3,
    bottom: -4,
    height: 6,
    position: 'absolute',
    width: 6,
  },
});
