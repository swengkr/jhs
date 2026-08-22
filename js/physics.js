/**
 * 물리학 및 수학 공식 계산 엔진
 */

export const COLORS = [
  { name: '네온 시안', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  { name: '로즈 핑크', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  { name: '에메랄드 그린', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { name: '앰버 골드', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { name: '바이올렛 퍼플', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' }
];

export class PhysicsEngine {
  /**
   * 포물선 운동의 주요 물리량 계산
   * @param {number} angleDeg 발사각 (도)
   * @param {number} v0 초기속도 (m/s)
   * @param {number} mass 질량 (g)
   * @param {number} g 중력가속도 (m/s^2)
   */
  static calculateTrajectoryProperties(angleDeg, v0, mass, g = 9.8) {
    const angleRad = (angleDeg * Math.PI) / 180;
    const v0x = v0 * Math.cos(angleRad);
    const v0y = v0 * Math.sin(angleRad);

    // 총 체공 시간 T = 2 * v0y / g
    const totalTime = angleDeg === 0 ? 0 : (2 * v0y) / g;

    // 최고점 도달 시간 t_peak = v0y / g
    const timePeak = v0y / g;

    // 최고점 높이 H = v0y^2 / (2 * g)
    const maxHeight = (v0y * v0y) / (2 * g);

    // 수평 도달 거리 R = v0x * T = (v0^2 * sin(2*theta)) / g
    const range = v0x * totalTime;

    // 이차함수 y = a * x^2 + b * x 의 계수
    // y = tan(theta)*x - (g / (2 * v0x^2)) * x^2
    const a = v0x !== 0 ? -g / (2 * v0x * v0x) : 0;
    const b = Math.tan(angleRad);

    return {
      angleDeg,
      angleRad,
      v0,
      v0x,
      v0y,
      mass,
      g,
      totalTime,
      timePeak,
      maxHeight,
      range,
      quadA: a,
      quadB: b,
      quadC: 0
    };
  }

  /**
   * 특정 시간 t에서의 위치 및 속도 계산
   */
  static getPositionAtTime(props, t) {
    if (t > props.totalTime) {
      t = props.totalTime;
    }
    const x = props.v0x * t;
    const y = Math.max(0, props.v0y * t - 0.5 * props.g * t * t);
    const vx = props.v0x;
    const vy = props.v0y - props.g * t;

    return { x, y, vx, vy, t };
  }

  /**
   * 이차함수 수식 텍스트 생성 (고등학생 친화형)
   */
  static getQuadraticFormulaString(props) {
    const aFormatted = props.quadA.toFixed(4);
    const bFormatted = props.quadB.toFixed(3);
    const sign = props.quadB >= 0 ? '+' : '-';
    const absB = Math.abs(props.quadB).toFixed(3);
    return `y = ${aFormatted}x² ${sign} ${absB}x`;
  }
}
