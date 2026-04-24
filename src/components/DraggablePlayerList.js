import { useRef, useState } from 'react';
import { View, Text, Pressable, PanResponder, StyleSheet } from 'react-native';
import { T } from '../theme';
import { hTap, hPress } from '../haptics';

const ITEM_HEIGHT = 62; // row + margin, kept in sync with styles.row + marginBottom

export default function DraggablePlayerList({ names, setNames }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragDy, setDragDy] = useState(0);
  const dragStateRef = useRef(null); // { idx, dy }
  const namesRef = useRef(names);
  namesRef.current = names;

  const makeResponder = (startIdx) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        hPress();
        dragStateRef.current = { idx: startIdx, dy: 0 };
        setDragIdx(startIdx);
        setDragDy(0);
      },
      onPanResponderMove: (_, g) => {
        const ds = dragStateRef.current;
        if (!ds) return;
        const steps = Math.round(g.dy / ITEM_HEIGHT);
        const desiredIdx = Math.max(0, Math.min(namesRef.current.length - 1, startIdx + steps));
        const newIdx = desiredIdx;
        if (newIdx !== ds.idx) {
          const from = ds.idx;
          setNames((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(newIdx, 0, moved);
            return next;
          });
          hTap();
          // Visual offset: position the dragged item relative to its *new* slot.
          const residualDy = g.dy - (newIdx - startIdx) * ITEM_HEIGHT;
          dragStateRef.current = { idx: newIdx, dy: residualDy };
          setDragIdx(newIdx);
          setDragDy(residualDy);
        } else {
          const residualDy = g.dy - (newIdx - startIdx) * ITEM_HEIGHT;
          dragStateRef.current = { idx: newIdx, dy: residualDy };
          setDragDy(residualDy);
        }
      },
      onPanResponderRelease: () => {
        dragStateRef.current = null;
        setDragIdx(null);
        setDragDy(0);
      },
      onPanResponderTerminate: () => {
        dragStateRef.current = null;
        setDragIdx(null);
        setDragDy(0);
      },
    });

  return (
    <View>
      {names.map((n, i) => {
        const isDragging = dragIdx === i;
        const responder = makeResponder(i);
        return (
          <View
            key={n}
            style={[
              styles.row,
              {
                backgroundColor: isDragging ? T.s3 : T.s2,
                borderColor: isDragging ? T.gold : T.border,
                transform: [{ translateY: isDragging ? dragDy : 0 }, { scale: isDragging ? 1.03 : 1 }],
                zIndex: isDragging ? 100 : 1,
                elevation: isDragging ? 8 : 0,
                shadowOpacity: isDragging ? 0.6 : 0,
              },
            ]}
          >
            <View {...responder.panHandlers} style={styles.handleHit}>
              <View style={styles.handleLine} />
              <View style={styles.handleLine} />
              <View style={styles.handleLine} />
            </View>
            <Text style={styles.num}>{i + 1}</Text>
            <Text style={styles.name} numberOfLines={1}>{n}</Text>
            <Pressable
              onPress={() => { hTap(); setNames((a) => a.filter((_, j) => j !== i)); }}
              style={styles.removeBtn}
              hitSlop={8}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingLeft: 4,
    paddingRight: 10,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
  },
  handleHit: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  handleLine: {
    width: 22,
    height: 3,
    backgroundColor: T.sub,
    borderRadius: 2,
  },
  num: {
    color: T.sub,
    fontSize: 13,
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  name: {
    flex: 1,
    color: T.text,
    fontSize: 16,
    fontWeight: '600',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: T.rFade,
  },
  removeText: {
    color: T.red,
    fontSize: 14,
    fontWeight: '700',
  },
});
