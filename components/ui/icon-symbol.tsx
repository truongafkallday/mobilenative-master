// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'cart.fill': 'shopping-cart',
  'cart.badge.plus': 'add-shopping-cart',
  'bag.fill': 'shopping-bag',
  'building.2.fill': 'storefront',
  'sparkles': 'auto-awesome',
  'star.fill': 'star',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  'magnifyingglass': 'search',
  'tag.fill': 'local-offer',
  'gift.fill': 'card-giftcard',
  'shield.checkerboard': 'verified-user',
  'person.fill': 'person',
  'xmark': 'close',
  'plus': 'add',
  'minus': 'remove',
  'trash.fill': 'delete',
  'phone.fill': 'phone',
  'location.fill': 'location-on',
  'clock.fill': 'access-time',
  'checkmark.circle.fill': 'check-circle',
  'person.circle.fill': 'account-circle',
  'person.crop.circle': 'account-circle',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'chart.bar.fill': 'bar-chart',
  'cube.box.fill': 'all-inbox',
  'shippingbox.fill': 'local-shipping',
  'pencil': 'edit',
  'arrow.right.square': 'exit-to-app',
  'bell.fill': 'notifications',
  'arrow.clockwise': 'refresh',
} as const;

type IconSymbolName = keyof typeof MAPPING | string;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={(MAPPING as Record<string, any>)[name] || 'category'} style={style} />;
}
