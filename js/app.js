/**
 * 메인 애플리케이션 진입점 및 컨트롤러
 */
import { IntroFreeFallAnimation } from './introCanvas.js';
import { SimulationCanvas } from './simulationCanvas.js';
import { MathGraphManager } from './mathGraph.js';
import { COLORS, PhysicsEngine } from './physics.js';

class App {
  constructor() {
    this.numProjectiles = 3;
    this.globalLaunchAngle = 45;
    this.globalInitialVelocity = 25;
    this.gravity = 9.8;

    // 투사체별 개별 파라미터 (최대 5개 기본값 설정)
    this.projectilesConfig = [
      { angle: 45, v0: 25, mass: 10 },
      { angle: 45, v0: 25, mass: 500 },
      { angle: 45, v0: 25, mass: 5000 },
      { angle: 30, v0: 25, mass: 200 },
      { angle: 60, v0: 30, mass: 2000 }
    ];

    this.introAnimation = null;
    this.simCanvas = null;
    this.mathGraph = null;

    this.init();
  }

  init() {
    // 1. 수식 렌더링 (KaTeX)
    this.renderKaTeXFormulas();

    // 2. 인트로 자유낙하 애니메이션 초기화
    this.introAnimation = new IntroFreeFallAnimation('introCanvas');

    // 3. 메인 시뮬레이션 및 수학 그래프 초기화
    this.simCanvas = new SimulationCanvas('simCanvas');
    this.mathGraph = new MathGraphManager('mathChart', 'quadraticEquationList');

    // 4. 초기 투사체 카드 렌더링 및 시뮬레이션 동기화
    this.renderProjectileCards();
    this.syncSimulation();

    // 5. 이벤트 리스너 바인딩
    this.bindEvents();

    // 6. 텔레메트리 업데이트 콜백 연결
    this.simCanvas.onUpdateCallback = (t, finished) => {
      document.getElementById('teleTime').textContent = t.toFixed(2);
      if (finished) {
        document.getElementById('btnLaunch').disabled = false;
        document.getElementById('btnPause').disabled = true;
        document.getElementById('btnPause').innerHTML = '<span class="btn-icon">⏸️</span> 일시정지';
      }
    };
  }

  renderKaTeXFormulas() {
    if (window.katex) {
      const introEq = document.getElementById('intro-math-eq');
      if (introEq) {
        katex.render(
          String.raw`F = m \cdot a = m \cdot g \implies a = g`,
          introEq,
          { throwOnError: false, displayMode: true }
        );
      }
    }
  }

  getActiveProjectilesConfig() {
    return this.projectilesConfig.slice(0, this.numProjectiles);
  }

  renderProjectileCards() {
    const container = document.getElementById('projectilesCardsContainer');
    container.innerHTML = '';

    for (let idx = 0; idx < this.numProjectiles; idx++) {
      const color = COLORS[idx % COLORS.length];
      const cfg = this.projectilesConfig[idx] || { angle: 45, v0: 25, mass: 100 * (idx + 1) };
      this.projectilesConfig[idx] = cfg;

      const card = document.createElement('div');
      card.className = 'proj-card';
      card.style.borderTop = `3px solid ${color.hex}`;

      card.innerHTML = `
        <div class="proj-card-header">
          <div class="proj-title">
            <span class="color-dot" style="background-color:${color.hex}; color:${color.hex}"></span>
            투사체 #${idx + 1}
          </div>
          <span style="font-size:0.75rem; color:#94a3b8">${color.name}</span>
        </div>
        <div class="proj-fields">
          <!-- 발사각 (θ) -->
          <div class="field-row">
            <span class="field-label">개별 발사각 (θ):</span>
            <div class="slider-input-pair">
              <input type="range" class="proj-slider-angle" data-idx="${idx}" min="5" max="85" value="${cfg.angle}" step="1">
              <input type="number" class="proj-input-angle" data-idx="${idx}" min="5" max="85" value="${cfg.angle}">
              <span class="unit">°</span>
            </div>
          </div>

          <!-- 초기속도 (v₀) -->
          <div class="field-row">
            <span class="field-label">개별 초기속도 (v₀):</span>
            <div class="slider-input-pair">
              <input type="range" class="proj-slider-v0" data-idx="${idx}" min="5" max="60" value="${cfg.v0}" step="1">
              <input type="number" class="proj-input-v0" data-idx="${idx}" min="5" max="60" value="${cfg.v0}">
              <span class="unit">m/s</span>
            </div>
          </div>

          <!-- 질량 (m) -->
          <div class="field-row">
            <span class="field-label">개별 질량 (m):</span>
            <div class="slider-input-pair">
              <input type="range" class="proj-slider-mass" data-idx="${idx}" min="1" max="10000" value="${cfg.mass}" step="10">
              <input type="number" class="proj-input-mass" data-idx="${idx}" min="1" max="10000" value="${cfg.mass}">
              <span class="unit">g</span>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    }

    // 1. 각도 조절 바인딩
    container.querySelectorAll('.proj-slider-angle, .proj-input-angle').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = Math.min(85, Math.max(5, parseFloat(e.target.value) || 5));
        this.projectilesConfig[idx].angle = val;

        const partner = container.querySelector(
          `${e.target.tagName === 'INPUT' && e.target.type === 'range' ? '.proj-input-angle' : '.proj-slider-angle'}[data-idx="${idx}"]`
        );
        if (partner) partner.value = val;

        this.syncSimulation();
      });
    });

    // 2. 초기속도 조절 바인딩
    container.querySelectorAll('.proj-slider-v0, .proj-input-v0').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = Math.min(60, Math.max(5, parseFloat(e.target.value) || 5));
        this.projectilesConfig[idx].v0 = val;

        const partner = container.querySelector(
          `${e.target.tagName === 'INPUT' && e.target.type === 'range' ? '.proj-input-v0' : '.proj-slider-v0'}[data-idx="${idx}"]`
        );
        if (partner) partner.value = val;

        this.syncSimulation();
      });
    });

    // 3. 질량 조절 바인딩
    container.querySelectorAll('.proj-slider-mass, .proj-input-mass').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = Math.min(10000, Math.max(1, parseFloat(e.target.value) || 1));
        this.projectilesConfig[idx].mass = val;

        const partner = container.querySelector(
          `${e.target.tagName === 'INPUT' && e.target.type === 'range' ? '.proj-input-mass' : '.proj-slider-mass'}[data-idx="${idx}"]`
        );
        if (partner) partner.value = val;

        this.syncSimulation();
      });
    });
  }

  syncSimulation() {
    this.gravity = parseFloat(document.getElementById('selectGravity').value) || 9.8;
    const configList = this.getActiveProjectilesConfig();
    this.simCanvas.setProjectiles(configList, this.gravity);
    this.mathGraph.updateGraph(this.simCanvas.trajectoriesData);
    this.renderResultsTable();
  }

  renderResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    const list = this.simCanvas.trajectoriesData;
    if (!list.length) return;

    const base = list[0];

    list.forEach((p) => {
      const tr = document.createElement('tr');
      const isAngleSame = Math.abs(p.angleDeg - base.angleDeg) < 0.001;
      const isV0Same = Math.abs(p.v0 - base.v0) < 0.001;
      const isTrajSame = isAngleSame && isV0Same;

      let badgeHtml = '';
      if (isTrajSame) {
        badgeHtml = `<span class="match-badge match-same">✓ 궤적 일치 (질량 무관)</span>`;
      } else {
        badgeHtml = `<span class="match-badge match-diff">⚡ 독립 궤적 (조건 차이)</span>`;
      }

      tr.innerHTML = `
        <td style="color:${p.color.hex}; font-weight:700">#${p.id}</td>
        <td>${p.angleDeg}°</td>
        <td>${p.v0} m/s</td>
        <td>${p.mass >= 1000 ? (p.mass / 1000).toFixed(1) + ' kg' : p.mass + ' g'}</td>
        <td>${p.maxHeight.toFixed(2)} m</td>
        <td>${p.range.toFixed(2)} m</td>
        <td>${p.totalTime.toFixed(2)} s</td>
        <td>${badgeHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  bindEvents() {
    // 1. 공통 일괄 발사각 변경
    const sliderAngle = document.getElementById('sliderLaunchAngle');
    const inputAngle = document.getElementById('inputLaunchAngle');
    const handleGlobalAngleChange = (val) => {
      const angle = Math.min(85, Math.max(5, parseFloat(val) || 45));
      sliderAngle.value = angle;
      inputAngle.value = angle;
      this.globalLaunchAngle = angle;
      // 모든 투사체에 일괄 적용
      for (let i = 0; i < this.projectilesConfig.length; i++) {
        this.projectilesConfig[i].angle = angle;
      }
      this.renderProjectileCards();
      this.syncSimulation();
    };
    sliderAngle.addEventListener('input', (e) => handleGlobalAngleChange(e.target.value));
    inputAngle.addEventListener('change', (e) => handleGlobalAngleChange(e.target.value));

    // 2. 공통 일괄 초기속도 변경
    const sliderVel = document.getElementById('sliderInitialVelocity');
    const inputVel = document.getElementById('inputInitialVelocity');
    const handleGlobalVelChange = (val) => {
      const v0 = Math.min(60, Math.max(5, parseFloat(val) || 25));
      sliderVel.value = v0;
      inputVel.value = v0;
      this.globalInitialVelocity = v0;
      // 모든 투사체에 일괄 적용
      for (let i = 0; i < this.projectilesConfig.length; i++) {
        this.projectilesConfig[i].v0 = v0;
      }
      this.renderProjectileCards();
      this.syncSimulation();
    };
    sliderVel.addEventListener('input', (e) => handleGlobalVelChange(e.target.value));
    inputVel.addEventListener('change', (e) => handleGlobalVelChange(e.target.value));

    // 3. 투사체 수 변경
    const sliderCount = document.getElementById('sliderNumProjectiles');
    const inputCount = document.getElementById('inputNumProjectiles');
    const handleCountChange = (val) => {
      const num = Math.min(5, Math.max(1, parseInt(val, 10) || 1));
      sliderCount.value = num;
      inputCount.value = num;
      this.numProjectiles = num;
      this.renderProjectileCards();
      this.syncSimulation();
    };
    sliderCount.addEventListener('input', (e) => handleCountChange(e.target.value));
    inputCount.addEventListener('change', (e) => handleCountChange(e.target.value));

    // 4. 중력 가속도 변경
    document.getElementById('selectGravity').addEventListener('change', () => {
      this.syncSimulation();
    });

    // 5. 발사 / 일시정지 / 리셋 컨트롤
    const btnLaunch = document.getElementById('btnLaunch');
    const btnPause = document.getElementById('btnPause');
    const btnReset = document.getElementById('btnReset');

    btnLaunch.addEventListener('click', () => {
      btnLaunch.disabled = true;
      btnPause.disabled = false;
      this.simCanvas.launch();
    });

    btnPause.addEventListener('click', () => {
      if (this.simCanvas.isPaused) {
        this.simCanvas.resume();
        btnPause.innerHTML = '<span class="btn-icon">⏸️</span> 일시정지';
      } else {
        this.simCanvas.pause();
        btnPause.innerHTML = '<span class="btn-icon">▶️</span> 계속 재생';
      }
    });

    btnReset.addEventListener('click', () => {
      btnLaunch.disabled = false;
      btnPause.disabled = true;
      btnPause.innerHTML = '<span class="btn-icon">⏸️</span> 일시정지';
      document.getElementById('teleTime').textContent = '0.00';
      this.simCanvas.reset();
    });

    // 6. 시뮬레이션 배속 설정
    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const speed = parseFloat(e.target.dataset.speed);
        this.simCanvas.setSpeed(speed);
      });
    });

    // 7. 뷰 옵션 토글
    document.getElementById('toggleSplitView').addEventListener('change', (e) => {
      this.simCanvas.splitView = e.target.checked;
      this.simCanvas.render();
    });

    document.getElementById('toggleVectors').addEventListener('change', (e) => {
      this.simCanvas.showVectors = e.target.checked;
      this.simCanvas.render();
    });

    document.getElementById('toggleTrail').addEventListener('change', (e) => {
      this.simCanvas.showTrail = e.target.checked;
      this.simCanvas.render();
    });

    document.getElementById('toggleGrid').addEventListener('change', (e) => {
      this.simCanvas.showGrid = e.target.checked;
      this.simCanvas.render();
    });

    // 8. 인트로 자유낙하 컨트롤
    const btnSlowIntro = document.getElementById('btnToggleSlowIntro');
    btnSlowIntro.addEventListener('click', () => {
      const isSlow = this.introAnimation.toggleSlow();
      btnSlowIntro.textContent = isSlow ? '⚡ 보통 속도로 전환' : '🐢 슬로우 모션 전환';
    });

    document.getElementById('btnResetIntro').addEventListener('click', () => {
      this.introAnimation.reset();
    });
  }
}

// 앱 실행
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
