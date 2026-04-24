import { View, Text, Pressable, StyleSheet } from 'react-native';
import { T } from '../theme';
import { hTap, hPress } from '../haptics';

const KEYS = ['7','8','9','4','5','6','1','2','3','⌫','0','↵'];

export default function NumPad({ setVal, onEnter }) {
  const tap = (k) => {
    if (k === '↵') { hPress(); onEnter(); return; }
    hTap();
    if (k === '⌫') { setVal((v) => v.slice(0, -1)); return; }
    setVal((v) => (v.length < 2 ? v + k : v));
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((k) => {
        const isEnter = k === '↵';
        const isBack = k === '⌫';
        return (
          <Pressable
            key={k}
            onPress={() => tap(k)}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: isEnter ? T.gold : isBack ? T.s2 : T.s3 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.keyText,
                { color: isEnter ? '#000' : T.text, fontSize: isEnter || isBack ? 20 : 26 },
              ]}
            >
              {k}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 6,
  },
  key: {
    width: '32.3%',
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontWeight: '800',
  },
});
