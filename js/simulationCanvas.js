/**
 * 메인 포물선 발사 시뮬레이터 캔버스 엔진
 */
import { PhysicsEngine, COLORS } from './physics.js';

export class SimulationCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.projectiles = []; // 현재 시뮬레이션 중인 투사체 목록
    this.trajectoriesData = []; // 계산된 물리 데이터
    this.currentTime = 0;
    this.maxSimulationTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.playbackSpeed = 1.0;

    // 시각화 옵션
    this.showVectors = true;
    this.showTrail = true;
    this.showGrid = true;
    this.splitView = false; // 궤적 분리 보기 모드

    // 뷰포트 좌표 변환
    this.padding = { left: 60, right: 60, top: 50, bottom: 50 };
    this.scale = 1; // 픽셀 per 미터 (자동 조정)
    this.origin = { x: 60, y: 400 };

    this.animationFrameId = null;
    this.lastTimestamp = null;
    this.onUpdateCallback = null;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;

    this.origin.x = this.padding.left;
    this.origin.y = this.displayHeight - this.padding.bottom;

    this.calculateViewportScale();
    this.render();
  }

  setProjectiles(configList, gravity = 9.8) {
    this.trajectoriesData = configList.map((cfg, index) => {
      const data = PhysicsEngine.calculateTrajectoryProperties(cfg.angle, cfg.v0, cfg.mass, gravity);
      return {
        ...data,
        id: index + 1,
        color: COLORS[index % COLORS.length]
      };
    });

    this.maxSimulationTime = Math.max(...this.trajectoriesData.map(d => d.totalTime), 1);
    this.calculateViewportScale();
    this.reset();
  }

  calculateViewportScale() {
    if (!this.trajectoriesData.length) return;

    const maxRange = Math.max(...this.trajectoriesData.map(d => d.range), 10);
    const maxHeight = Math.max(...this.trajectoriesData.map(d => d.maxHeight), 10);

    const availableWidth = this.displayWidth - (this.padding.left + this.padding.right);
    const availableHeight = this.displayHeight - (this.padding.top + this.padding.bottom);

    const scaleX = availableWidth / (maxRange * 1.15);
    const scaleY = availableHeight / (maxHeight * 1.25);

    this.scale = Math.min(scaleX, scaleY);
  }

  worldToScreen(x, y, offsetYPx = 0) {
    return {
      x: this.origin.x + x * this.scale,
      y: (this.origin.y - y * this.scale) + offsetYPx
    };
  }

  launch() {
    this.currentTime = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = null;
    this.animate();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.lastTimestamp = null;
    this.animate();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.lastTimestamp = null;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.render();
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
  }

  animate() {
    if (!this.isRunning || this.isPaused) return;

    const step = (timestamp) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = ((timestamp - this.lastTimestamp) / 1000) * this.playbackSpeed;
      this.lastTimestamp = timestamp;

      this.currentTime += dt;

      if (this.currentTime >= this.maxSimulationTime) {
        this.currentTime = this.maxSimulationTime;
        this.isRunning = false;
      }

      this.render();

      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentTime, !this.isRunning);
      }

      if (this.isRunning && !this.isPaused) {
        this.animationFrameId = requestAnimationFrame(step);
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
  }

  render() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.clearRect(0, 0, w, h);

    // 배경
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, w, h);

    // 1. 그리드 및 축 그리기
    if (this.showGrid) {
      this.drawGridAndAxes(ctx);
    }

    const count = this.trajectoriesData.length;

    // 2. 투사체별 궤적 잔상 그리기
    this.trajectoriesData.forEach((props, idx) => {
      const offsetPx = this.splitView ? (idx - (count - 1) / 2) * 16 : 0;
      this.drawTrajectoryLine(ctx, props, idx, offsetPx);
    });

    // 3. 투사체 본체 및 라벨 렌더링
    this.drawProjectilesGroup(ctx);

    // 4. 발사대 (대포/원점)
    this.drawLauncher(ctx);
  }

  drawGridAndAxes(ctx) {
    const origin = this.origin;
    const w = this.displayWidth;
    const h = this.displayHeight;

    let gridStepMeters = 10;
    if (this.scale > 15) gridStepMeters = 5;
    if (this.scale < 3) gridStepMeters = 50;
    if (this.scale < 1) gridStepMeters = 100;

    const gridStepPx = gridStepMeters * this.scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

    // 세로선 (x 축 눈금)
    for (let x = origin.x; x < w - 20; x += gridStepPx) {
      const mVal = ((x - origin.x) / this.scale).toFixed(0);
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, origin.y + 10);
      ctx.stroke();
      if (mVal !== '0') {
        ctx.fillText(`${mVal}m`, x - 8, origin.y + 20);
      }
    }

    // 가로선 (y 축 눈금)
    for (let y = origin.y; y > 20; y -= gridStepPx) {
      const mVal = ((origin.y - y) / this.scale).toFixed(0);
      ctx.beginPath();
      ctx.moveTo(origin.x - 10, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
      if (mVal !== '0') {
        ctx.fillText(`${mVal}m`, origin.x - 38, y + 3);
      }
    }

    // 메인 x, y 축
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    // X축 (지면)
    ctx.beginPath();
    ctx.moveTo(origin.x - 20, origin.y);
    ctx.lineTo(w - 20, origin.y);
    ctx.stroke();

    // Y축 (높이)
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y + 20);
    ctx.lineTo(origin.x, 20);
    ctx.stroke();

    // 원점 라벨
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('0,0 (원점)', origin.x - 45, origin.y + 18);
  }

  drawTrajectoryLine(ctx, props, idx, offsetPx) {
    const isCompleted = this.currentTime >= props.totalTime;
    const currentT = Math.min(this.currentTime, props.totalTime);

    // 1. 전체 이론적 궤적선 (연한 점선)
    ctx.strokeStyle = props.color.hex;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    ctx.setLineDash([3, 4]);

    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * props.totalTime;
      const pos = PhysicsEngine.getPositionAtTime(props, t);
      const scr = this.worldToScreen(pos.x, pos.y, offsetPx);
      if (i === 0) ctx.moveTo(scr.x, scr.y);
      else ctx.lineTo(scr.x, scr.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    // 2. 현재까지 지나온 궤적 (잔상)
    if (this.showTrail && currentT > 0) {
      ctx.strokeStyle = props.color.hex;
      ctx.shadowColor = props.color.glow;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3 + (this.trajectoriesData.length - idx) * 0.8;

      ctx.beginPath();
      const trailSteps = Math.min(70, Math.ceil(currentT * 35) + 1);
      for (let i = 0; i <= trailSteps; i++) {
        const t = (i / trailSteps) * currentT;
        const pos = PhysicsEngine.getPositionAtTime(props, t);
        const scr = this.worldToScreen(pos.x, pos.y, offsetPx);
        if (i === 0) ctx.moveTo(scr.x, scr.y);
        else ctx.lineTo(scr.x, scr.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawProjectilesGroup(ctx) {
    const count = this.trajectoriesData.length;
    if (!count) return;

    // 모든 투사체의 각도 및 속도가 같은지 검사
    const first = this.trajectoriesData[0];
    const isAllIdenticalMotion = this.trajectoriesData.every(
      p => Math.abs(p.angleDeg - first.angleDeg) < 0.001 && Math.abs(p.v0 - first.v0) < 0.001
    );

    // 1. 최고점 및 착지 마커
    this.trajectoriesData.forEach((props) => {
      const currentT = Math.min(this.currentTime, props.totalTime);
      const isCompleted = this.currentTime >= props.totalTime;

      // 최고점 마커
      if (currentT >= props.timePeak) {
        const peakWorld = {
          x: props.v0x * props.timePeak,
          y: props.maxHeight
        };
        const peakScr = this.worldToScreen(peakWorld.x, peakWorld.y);
        ctx.fillStyle = props.color.hex;
        ctx.beginPath();
        ctx.arc(peakScr.x, peakScr.y, 4, 0, Math.PI * 2);
        ctx.fill();

        if (count <= 3 || isAllIdenticalMotion) {
          ctx.fillStyle = props.color.hex;
          ctx.font = 'bold 10px Pretendard, sans-serif';
          const label = isAllIdenticalMotion && props.id !== 1 ? '' : `★ #${props.id} H=${props.maxHeight.toFixed(1)}m`;
          if (label) {
            ctx.fillText(label, peakScr.x - 30, peakScr.y - 8);
          }
        }
      }

      // 착지 마커
      if (isCompleted) {
        const landScr = this.worldToScreen(props.range, 0);
        ctx.fillStyle = props.color.hex;
        ctx.beginPath();
        ctx.arc(landScr.x, landScr.y, 5, 0, Math.PI * 2);
        ctx.fill();

        if (count <= 3 || isAllIdenticalMotion) {
          ctx.fillStyle = props.color.hex;
          ctx.font = 'bold 10px Pretendard, sans-serif';
          const label = isAllIdenticalMotion && props.id !== 1 ? '' : `🚩 #${props.id} R=${props.range.toFixed(1)}m (${props.totalTime.toFixed(2)}s)`;
          if (label) {
            ctx.fillText(label, landScr.x - 35, landScr.y + 18);
          }
        }
      }
    });

    // 2. 투사체 본체 렌더링
    if (this.splitView || !isAllIdenticalMotion) {
      // 궤적이 다르거나 분리 뷰인 경우: 각각 개별 위치에 렌더링
      this.trajectoriesData.forEach((props, idx) => {
        const offsetPx = this.splitView ? (idx - (count - 1) / 2) * 16 : 0;
        const currentT = Math.min(this.currentTime, props.totalTime);
        const currentPos = PhysicsEngine.getPositionAtTime(props, currentT);
        const scrPos = this.worldToScreen(currentPos.x, currentPos.y, offsetPx);
        this.drawSingleProjectile(ctx, props, scrPos, currentPos, idx);
      });
    } else {
      // 궤적이 동일하고 분리 뷰가 아닌 경우: 동심원 링 결합 모드
      const baseProps = this.trajectoriesData[0];
      const currentT = Math.min(this.currentTime, baseProps.totalTime);
      const isCompleted = this.currentTime >= baseProps.totalTime;

      const sortedByMassDesc = [...this.trajectoriesData].sort((a, b) => b.mass - a.mass);
      const currentPos = PhysicsEngine.getPositionAtTime(baseProps, currentT);
      const scrPos = this.worldToScreen(currentPos.x, currentPos.y, 0);

      sortedByMassDesc.forEach((props, rank) => {
        const radius = 22 - rank * 3.5;
        ctx.save();
        ctx.translate(scrPos.x, scrPos.y);

        ctx.shadowColor = props.color.glow;
        ctx.shadowBlur = 10;

        ctx.strokeStyle = props.color.hex;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(6, radius), 0, Math.PI * 2);
        ctx.stroke();

        if (rank === sortedByMassDesc.length - 1) {
          ctx.fillStyle = props.color.hex;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(5, radius - 1), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      this.drawMergedMultiTagBadge(ctx, scrPos, this.trajectoriesData);

      if (this.showVectors && !isCompleted && this.isRunning) {
        this.drawVectors(ctx, scrPos, currentPos.vx, currentPos.vy);
      }
    }
  }

  drawSingleProjectile(ctx, props, scrPos, currentPos, idx) {
    const isCompleted = this.currentTime >= props.totalTime;
    ctx.save();
    ctx.translate(scrPos.x, scrPos.y);

    const radius = 10;
    ctx.fillStyle = props.color.hex;
    ctx.shadowColor = props.color.glow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${props.id}`, 0, 0);

    // 각도, 속도 또는 질량 태그 라벨
    ctx.fillStyle = props.color.hex;
    ctx.font = 'bold 10px monospace';
    const massStr = props.mass >= 1000 ? `${(props.mass/1000).toFixed(1)}kg` : `${props.mass}g`;
    ctx.fillText(`#${props.id} (${props.angleDeg}°, ${props.v0}m/s, ${massStr})`, 0, -16);

    ctx.restore();

    if (this.showVectors && !isCompleted && this.isRunning) {
      this.drawVectors(ctx, scrPos, currentPos.vx, currentPos.vy);
    }
  }

  drawMergedMultiTagBadge(ctx, scrPos, list) {
    ctx.save();
    const badgeY = scrPos.y - 28;
    const badgeX = scrPos.x;

    const itemWidth = 54;
    const totalWidth = list.length * itemWidth + 8;
    const startX = badgeX - totalWidth / 2;

    ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, badgeY - 14, totalWidth, 20, 6);
    ctx.fill();
    ctx.stroke();

    list.forEach((p, i) => {
      const chipX = startX + 6 + i * itemWidth;
      
      ctx.fillStyle = p.color.hex;
      ctx.beginPath();
      ctx.arc(chipX + 4, badgeY - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px Pretendard, monospace';
      ctx.textAlign = 'left';
      const mText = p.mass >= 1000 ? `${(p.mass/1000).toFixed(0)}kg` : `${p.mass}g`;
      ctx.fillText(`#${p.id} ${mText}`, chipX + 11, badgeY);
    });

    ctx.restore();
  }

  drawVectors(ctx, screenPos, vx, vy) {
    const vectorScale = 1.8;
    const endX = screenPos.x + vx * vectorScale;
    const endY = screenPos.y - vy * vectorScale;

    // 수평 속도 벡터 (vx - 녹색)
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(screenPos.x + vx * vectorScale, screenPos.y);
    ctx.stroke();

    // 수직 속도 벡터 (vy - 노란색)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(screenPos.x, screenPos.y - vy * vectorScale);
    ctx.stroke();

    // 합성 속도 벡터 (v - 흰색)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  drawLauncher(ctx) {
    const origin = this.origin;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
