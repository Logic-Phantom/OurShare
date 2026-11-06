import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

const LINE = '#33343C';
const ROOF = '#3F4250';
const SKIN = '#FFE2CF';

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Rect x="-3" y="20" width="6" height="22" rx="2" fill="#9A7B5F" />
      <Circle cx="0" cy="8" r="20" fill="#8CC77F" />
      <Circle cx="-12" cy="18" r="13" fill="#7CBB70" />
      <Circle cx="12" cy="18" r="13" fill="#9AD08C" />
    </G>
  );
}

/** Drawn to match the app icon's style. Decorative: screens carry the same message as text. */
export function WelcomeIllustration({ width = 320 }: { width?: number }) {
  return (
    <View style={{ width, height: (width * 280) / 340 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 340 280">
        <Circle cx="282" cy="52" r="22" fill="#DCEAF9" />
        <Circle cx="40" cy="96" r="14" fill="#DCEAF9" />
        <Ellipse cx="170" cy="258" rx="165" ry="22" fill="#E4F2DC" />
        <Tree x={42} y={186} />
        <Tree x={302} y={190} scale={0.9} />
        <Path d="M78 136 170 62l92 74v112H78Z" fill="#FFF8EE" />
        <Path d="M214 76V52h26v46Z" fill={ROOF} />
        <Path d="M56 146 170 54l114 92" stroke={ROOF} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Rect x="156" y="90" width="28" height="28" rx="5" fill="#CFE3F7" stroke={ROOF} strokeWidth="4" />
        <Path d="M170 90v28M156 104h28" stroke={ROOF} strokeWidth="3" />

        {/* Left person */}
        <Path d="M78 254c0-38 16-58 48-58s48 20 48 58Z" fill="#7FB2EA" />
        <Circle cx="124" cy="162" r="35" fill={SKIN} />
        <Circle cx="90" cy="168" r="7" fill={SKIN} />
        <Path d="M90 164c-6-32 16-44 36-42 22 1 34 17 31 41-4-11-10-18-18-21-13 8-34 10-49 22Z" fill={LINE} />
        <Circle cx="113" cy="167" r="4" fill={LINE} />
        <Circle cx="137" cy="167" r="4" fill={LINE} />
        <Path d="M117 179c4 6 12 6 16 0" stroke={LINE} strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Right person */}
        <Path d="M168 254c0-34 14-52 44-52s44 18 44 52Z" fill="#F49A92" />
        <Circle cx="238" cy="133" r="11" fill={LINE} />
        <Circle cx="216" cy="166" r="33" fill={SKIN} />
        <Circle cx="249" cy="172" r="7" fill={SKIN} />
        <Path d="M183 170c-6-30 13-46 34-45 21 1 33 20 29 45-5-13-14-22-26-27-6 12-20 21-37 27Z" fill={LINE} />
        <Circle cx="206" cy="172" r="4" fill={LINE} />
        <Circle cx="228" cy="172" r="4" fill={LINE} />
        <Path d="M211 183c4 5 11 5 15 0" stroke={LINE} strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Checklist */}
        <Rect x="130" y="204" width="84" height="62" rx="9" fill="#FFFFFF" stroke={LINE} strokeWidth="4" />
        <Path d="m142 222 5 5 9-10M142 243l5 5 9-10" stroke="#4CAF50" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Rect x="164" y="218" width="38" height="7" rx="3.5" fill="#C9C9CF" />
        <Rect x="164" y="239" width="38" height="7" rx="3.5" fill="#C9C9CF" />
      </Svg>
    </View>
  );
}

/** The little house on the "완료!" screen. */
export function DoneHouseIllustration({ width = 280 }: { width?: number }) {
  return (
    <View style={{ width, height: (width * 170) / 300 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 300 170">
        <Ellipse cx="150" cy="156" rx="148" ry="16" fill="#E4F2DC" />
        <Tree x={38} y={104} scale={0.95} />
        <Tree x={262} y={108} scale={0.85} />
        <Path d="M86 82 150 38l64 44v74H86Z" fill="#FFF8EE" />
        <Path d="M72 90 150 34l78 56" stroke={ROOF} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Rect x="102" y="104" width="22" height="52" rx="3" fill={ROOF} />
        <Rect x="138" y="100" width="30" height="26" rx="4" fill="#CFE3F7" stroke={ROOF} strokeWidth="3" />
        <Path d="M153 100v26M138 113h30" stroke={ROOF} strokeWidth="2.5" />
        <Rect x="178" y="100" width="24" height="26" rx="4" fill="#CFE3F7" stroke={ROOF} strokeWidth="3" />
        <Rect x="140" y="62" width="20" height="20" rx="4" fill="#CFE3F7" stroke={ROOF} strokeWidth="3" />
      </Svg>
    </View>
  );
}

const CONFETTI = [
  { x: 40, y: 20, r: 20, c: '#F6C945' }, { x: 92, y: 48, r: -30, c: '#F49A92' }, { x: 150, y: 14, r: 10, c: '#6FA8E8' },
  { x: 214, y: 40, r: 40, c: '#7CC47F' }, { x: 268, y: 18, r: -15, c: '#F49A92' }, { x: 20, y: 74, r: 60, c: '#6FA8E8' },
  { x: 282, y: 80, r: -50, c: '#F6C945' }, { x: 118, y: 86, r: 25, c: '#7CC47F' }, { x: 190, y: 92, r: -40, c: '#6FA8E8' },
];

/** Still confetti: celebratory without any motion, so Reduce Motion needs no special case. */
export function Confetti({ width = 300 }: { width?: number }) {
  return (
    <View style={{ width, height: (width * 110) / 300 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 300 110">
        {CONFETTI.map((piece, index) => (
          <Rect key={index} x={piece.x} y={piece.y} width="6" height="14" rx="2" fill={piece.c} transform={`rotate(${piece.r} ${piece.x + 3} ${piece.y + 7})`} />
        ))}
      </Svg>
    </View>
  );
}

export function BroomIllustration({ size = 72 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Path d="M88 8 56 48" stroke={LINE} strokeWidth="7" strokeLinecap="round" />
        <Path d="m50 40 18 15-6 8-20-17Z" fill="#7CBB70" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
        <Path d="M42 46 62 63c-4 13-18 25-46 29-4 0-5-3-3-5 4-3 8-7 9-11-3 1-6 1-9 0 10-5 21-16 29-30Z" fill="#F6D58B" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
        <Path d="M41 62c-3 6-7 11-11 15M50 67c-3 6-7 11-12 15" stroke="#C9A25A" strokeWidth="3" strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}
