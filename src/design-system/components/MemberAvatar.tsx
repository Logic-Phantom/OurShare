import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

import { memberPalette, type MemberColorKey } from '../tokens';

export const AVATAR_KEYS = ['short', 'bun', 'long', 'curly', 'side', 'cap'] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

const SKIN = '#FFE2CF';
const HAIR = '#33343C';
const LINE = '#33343C';

function Hair({ style }: { style: AvatarKey }) {
  switch (style) {
    case 'short':
      return <Path d="M26 48C22 26 38 17 51 19c14 1 23 11 21 29-3-9-8-14-14-16-9 5-22 7-32 16Z" fill={HAIR} />;
    case 'bun':
      return (
        <>
          <Circle cx="66" cy="19" r="9" fill={HAIR} />
          <Path d="M27 52c-5-22 9-34 25-33 15 1 24 15 21 33-4-10-11-17-20-20-5 9-15 15-26 20Z" fill={HAIR} />
        </>
      );
    case 'long':
      return <Path d="M23 70c-5-30 2-52 28-52 25 0 32 22 26 52-4 3-8 2-9-1 5-14 3-25-3-33-11 3-22 4-30 4-4 8-5 18-3 29-1 3-5 3-9 1Z" fill={HAIR} />;
    case 'curly':
      return <Path d="M26 49c-8-5-6-15 0-18-1-8 7-13 12-11 3-5 13-6 17-2 6-3 14 0 15 6 7 2 8 11 3 15 2 4 0 8-1 10-4-8-8-14-13-16-8 5-23 6-33 16Z" fill={HAIR} />;
    case 'side':
      return <Path d="M26 50c-4-20 7-32 25-32 16 0 25 12 22 31-2-8-6-13-10-15-13 1-27 5-37 16Z" fill={HAIR} />;
    case 'cap':
      return <Path d="M25 42c1-15 12-24 26-24s25 9 26 24c-16-4-36-4-52 0Zm44-3c6 0 13 1 18 4-7 2-14 1-20 0Z" fill="#6F7482" />;
  }
}

/** Built-in drawings only; the app never asks for a photo. Decorative, so the name beside it is what gets read. */
export function MemberAvatar({ avatarKey, colorKey, size = 56 }: { avatarKey: string; colorKey: string; size?: number }) {
  const palette = memberPalette[colorKey as MemberColorKey] ?? memberPalette.blue;
  const style = (AVATAR_KEYS as readonly string[]).includes(avatarKey) ? (avatarKey as AvatarKey) : 'short';
  const clipId = `avatar-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx="50" cy="50" r="50" />
          </ClipPath>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={palette.soft} />
        <G clipPath={`url(#${clipId})`}>
          <G transform="translate(50 56) scale(1.25) translate(-50 -50)">
            <Path d="M16 104c1-22 14-34 34-34s33 12 34 34Z" fill={palette.main} />
            <Circle cx="50" cy="47" r="24" fill={SKIN} />
            <Circle cx="26" cy="50" r="5" fill={SKIN} />
            <Circle cx="74" cy="50" r="5" fill={SKIN} />
            <Hair style={style} />
            <Circle cx="42" cy="50" r="2.8" fill={LINE} />
            <Circle cx="58" cy="50" r="2.8" fill={LINE} />
            <Path d="M44 58c3 4 9 4 12 0" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </G>
        </G>
      </Svg>
    </View>
  );
}
