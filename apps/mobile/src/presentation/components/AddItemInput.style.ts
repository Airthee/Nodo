import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  suggestions: {
    marginTop: 8,
    maxHeight: 40,
  },
  suggestionsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {},
});
