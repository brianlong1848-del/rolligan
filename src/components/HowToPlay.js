import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme';
import { hTap } from '../haptics';

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 18 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Bullet = ({ children }) => (
  <View style={{ flexDirection: 'row', marginBottom: 6 }}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

export default function HowToPlay({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.wrap, { paddingTop: insets.top + 14 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How to Play</Text>
          <Pressable onPress={() => { hTap(); onClose(); }} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
          <Section title="The Goal">
            <Text style={styles.p}>
              Build the highest bank across all rounds. You win by banking points before a 7 wipes them out.
            </Text>
          </Section>

          <Section title="Each Round">
            <Bullet>Players take turns rolling two dice and entering the total.</Bullet>
            <Bullet>Every roll adds to a shared pot that every un-banked player holds a stake in.</Bullet>
            <Bullet>A round ends when a 7 is rolled after roll 3, or when every player has banked.</Bullet>
          </Section>

          <Section title="The First 3 Rolls">
            <Bullet>Banking is locked until 3 rolls have been made.</Bullet>
            <Bullet>A roll of 7 during the first 3 rolls adds <Text style={{ color: T.gold, fontWeight: '800' }}>70 points</Text> to the pot (instead of ending the round).</Bullet>
            <Bullet>All other rolls add their face value to the pot.</Bullet>
          </Section>

          <Section title="After Roll 3 — Bank Opens">
            <Bullet>On any turn, any un-banked player can tap their name and bank the full current pot into their total.</Bullet>
            <Bullet>Once a player banks, they sit out for the rest of the round — safe from a 7.</Bullet>
            <Bullet>If a 7 is rolled, every un-banked player loses their pot stake and the round ends.</Bullet>
            <Bullet>If the roller rolls doubles, they may choose the Doubles action to double their banked total.</Bullet>
          </Section>

          <Section title="Ending the Game">
            <Text style={styles.p}>
              After all rounds are played, whoever has the largest bank wins. Ties break by bank total — play another round to settle it.
            </Text>
          </Section>

          <Section title="Tips">
            <Bullet>Early in the round the pot is small — banking immediately after roll 3 is safe but rarely the best play.</Bullet>
            <Bullet>The longer the round goes, the more likely a 7. Watch the vibe of the table.</Bullet>
            <Bullet>If a roll was entered wrong, tap ↩ Redo on the next screen to restore the previous state.</Bullet>
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: { color: T.gold, fontSize: 22, fontWeight: '900' },
  closeBtn: { padding: 6 },
  closeText: { color: T.gold, fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    color: T.sub,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: '700',
  },
  p: { color: T.text, fontSize: 15, lineHeight: 22 },
  bulletDot: { color: T.gold, fontSize: 15, width: 16, fontWeight: '900' },
  bulletText: { color: T.text, fontSize: 15, lineHeight: 22, flex: 1 },
});
