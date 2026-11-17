import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, spacing, typography } from '../../theme/tokens';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  unitSuffix?: string;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function AppInput({
  label,
  error,
  helperText,
  unitSuffix,
  isPassword = false,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const [focused, setFocused] = useState(false);
  const [visiblePassword, setVisiblePassword] = useState(false);

  const borderColor = error
    ? colors.semantic.danger
    : focused
      ? colors.brand.primary
      : colors.border.strong;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputBox,
          { borderColor },
          focused && styles.inputBoxFocused,
          rest.multiline && styles.multilineBox,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.text.muted}
          {...rest}
          secureTextEntry={isPassword ? !visiblePassword : rest.secureTextEntry}
          style={[
            styles.input,
            rest.multiline && styles.multilineInput,
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />

        {unitSuffix ? <Text style={styles.unitSuffix}>{unitSuffix}</Text> : null}

        {isPassword ? (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setVisiblePassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={visiblePassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons
              name={visiblePassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderRadius: radii.md,
    minHeight: 50,
  },
  inputBoxFocused: {
    backgroundColor: colors.surface.card,
  },
  multilineBox: {
    alignItems: 'flex-start',
    minHeight: 112,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 17,
    color: colors.text.primary,
  },
  multilineInput: {
    minHeight: 108,
    textAlignVertical: 'top',
  },
  unitSuffix: {
    paddingRight: spacing.md,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.muted,
  },
  eyeBtn: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.semantic.danger,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
