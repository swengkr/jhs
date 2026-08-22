/**
 * 상단 진공 챔버 자유낙하 무한 루프 애니메이션
 */

export class IntroFreeFallAnimation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.isSlow = false;
    this.time = 0;
    this.g = 9.8; // m/s^2
    this.scale = 80; // 픽셀 / 미터
    this.fallHeightMeters = 2.4; // 챔버 높이 (m)
    this.dropDuration = Math.sqrt((2 * this.fallHeightMeters) / this.g); // 약 0.7초
    this.pauseDuration = 1.2; // 바닥에 닿은 후 대기 시간
    this.cycleDuration = this.dropDuration + this.pauseDuration;
    
    this.lastTimestamp = null;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.start();
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
  }

  toggleSlow() {
    this.isSlow = !this.isSlow;
    return this.isSlow;
  }

  reset() {
    this.time = 0;
  }

  start() {
    const animate = (timestamp) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      const timeSpeed = this.isSlow ? 0.35 : 1.0;
      this.time = (this.time + dt * timeSpeed) % this.cycleDuration;

      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  render() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. 배경 진공 챔버 스타일
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0e1a');
    grad.addColorStop(1, '#05070d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 챔버 그리드 및 눈금선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const topY = 40;
    const groundY = h - 35;
    const heightPx = groundY - topY;

    for (let i = 0; i <= 5; i++) {
      const y = topY + (heightPx / 5) * i;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 30, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '10px monospace';
      const mVal = ((5 - i) * (this.fallHeightMeters / 5)).toFixed(1);
      ctx.fillText(`${mVal}m`, 8, y + 3);
    }

    // 바닥 플랫폼
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(30, groundY, w - 60, 4);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.fillRect(30, groundY + 4, w - 60, 2);

    // 2. 현재 낙하 위치 및 속도 계산
    let currentFallTime = Math.min(this.time, this.dropDuration);
    let fallDistMeters = 0.5 * this.g * currentFallTime * currentFallTime;
    if (fallDistMeters > this.fallHeightMeters) fallDistMeters = this.fallHeightMeters;

    const currentY = topY + (fallDistMeters / this.fallHeightMeters) * heightPx;
    const currentVelocity = this.g * currentFallTime; // v = g * t

    const xFeather = w * 0.32;
    const xBall = w * 0.68;

    // 3. 깃털 그리기 (Feather - 10g)
    this.drawFeather(ctx, xFeather, currentY, currentFallTime);

    // 4. 쇠구슬 그리기 (Heavy Ball - 5000g)
    this.drawIronBall(ctx, xBall, currentY);

    // 5. 공통 속도 벡터 및 텔레메트리
    this.drawTelemetry(ctx, xFeather, xBall, currentY, currentVelocity, currentFallTime, groundY);
  }

  drawFeather(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    // 진공이므로 깃털도 팔랑거리지 않고 수직으로 정직하게 떨어짐 (핵심 물리적 사실 강조)
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 10;

    // 깃털 형태 렌더링
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 깃대
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 24);
    ctx.stroke();

    ctx.restore();
  }

  drawIronBall(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // 구체 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(-5, -6, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawTelemetry(ctx, x1, x2, y, v, t, groundY) {
    ctx.save();
    // 두 물체를 잇는 수평 기준선 (동일 높이임을 강조)
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 중간에 "동일 높이/동일 속도" 라벨
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 11px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    const midX = (x1 + x2) / 2;
    ctx.fillText(`동일 속도 v = ${v.toFixed(1)} m/s`, midX, y - 8);

    // 하단 상태 텍스트
    const isLanded = t >= this.dropDuration;
    ctx.fillStyle = isLanded ? '#fcd34d' : 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Pretendard, sans-serif';
    if (isLanded) {
      ctx.fillText(`✨ 동시 착지 완료! (체공 시간: ${this.dropDuration.toFixed(2)}초)`, midX, groundY + 22);
    } else {
      ctx.fillText(`낙하 시간: ${t.toFixed(2)}s | 가속도 a = 9.8 m/s² (질량 무관)`, midX, groundY + 22);
    }

    ctx.restore();
  }
}
