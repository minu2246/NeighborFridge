import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DatePickerModal({ visible, value, onClose, onSelect }: { visible: boolean; value: string; onClose: () => void; onSelect: (date: string) => void }) {
  const today = useMemo(() => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }, []);
  const [month, setMonth] = useState(() => value ? new Date(`${value}T00:00:00`) : today);
  const [selected, setSelected] = useState(value || toDateKey(today));
  useEffect(() => {
    if (!visible) return;
    const date = value ? new Date(`${value}T00:00:00`) : today;
    setMonth(date); setSelected(value || toDateKey(today));
  }, [today, value, visible]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [month]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.sheet}>
      <Text style={styles.title}>소비기한 선택</Text><Text style={styles.caption}>포장지에 표시된 날짜를 선택해 주세요.</Text>
      <View style={styles.monthRow}><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable><Text style={styles.month}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable></View>
      <View style={styles.week}>{['일', '월', '화', '수', '목', '금', '토'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
      <View style={styles.grid}>{cells.map((date) => {
        const key = toDateKey(date); const disabled = date < today; const outside = date.getMonth() !== month.getMonth(); const active = key === selected;
        return <Pressable key={key} disabled={disabled} onPress={() => setSelected(key)} style={[styles.day, active && styles.dayActive]}><Text style={[styles.dayText, outside && styles.outside, disabled && styles.disabled, active && styles.dayTextActive]}>{date.getDate()}</Text></Pressable>;
      })}</View>
      <View style={styles.actions}><Pressable onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>취소</Text></Pressable><Pressable onPress={() => onSelect(selected)} style={styles.confirm}><Text style={styles.confirmText}>선택 완료</Text></Pressable></View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,39,29,.48)', alignItems: 'center', justifyContent: 'center', padding: 20 }, sheet: { width: '100%', maxWidth: 390, borderRadius: 24, backgroundColor: '#FFF', padding: 22 },
  title: { fontSize: 21, fontWeight: '900', color: '#173C2D' }, caption: { color: '#7B8D83', fontSize: 12, marginTop: 5 }, monthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 12 }, month: { flex: 1, textAlign: 'center', color: '#29483A', fontWeight: '900', fontSize: 16 }, arrow: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EDF5F0', alignItems: 'center', justifyContent: 'center' }, arrowText: { color: '#19734B', fontSize: 27, lineHeight: 29 },
  week: { flexDirection: 'row' }, weekday: { width: '14.285%', textAlign: 'center', color: '#91A098', fontSize: 11, fontWeight: '700', paddingVertical: 7 }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, day: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }, dayActive: { backgroundColor: '#19734B' }, dayText: { color: '#344D40', fontWeight: '700' }, dayTextActive: { color: '#FFF', fontWeight: '900' }, outside: { color: '#BCC6C0' }, disabled: { color: '#D9DEDB', textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', marginTop: 18 }, cancel: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#EFF3F1', alignItems: 'center', justifyContent: 'center', marginRight: 8 }, confirm: { flex: 1.4, height: 48, borderRadius: 14, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#587065', fontWeight: '800' }, confirmText: { color: '#FFF', fontWeight: '900' },
});
