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
    this.launchAngle = 45;
    this.initialVelocity = 25;
    this.gravity = 9.8;
    this.masses = [10, 500, 5000, 200, 2000]; // 투사체별 기본 질량 (g)

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
      // 인트로 자유낙하 가속도 유도
      katex.render(
        String.raw`F = m \cdot a = m \cdot g \implies a = g`,
        document.getElementById('intro-math-eq'),
        { throwOnError: false, displayMode: true }
      );

      // 매개변수 방정식 x(t), y(t)
      katex.render(
        String.raw`x(t) = (v_0 \cos\theta) \cdot t`,
        document.getElementById('eq-x-t'),
        { throwOnError: false, displayMode: true }
      );
      katex.render(
        String.raw`y(t) = (v_0 \sin\theta) \cdot t - \frac{1}{2}gt^2`,
        document.getElementById('eq-y-t'),
        { throwOnError: false, displayMode: true }
      );

      // 이차함수 궤적 방정식
      katex.render(
        String.raw`y = \left(\tan\theta\right)x - \left(\frac{g}{2v_0^2\cos^2\theta}\right)x^2 = ax^2 + bx`,
        document.getElementById('eq-trajectory'),
        { throwOnError: false, displayMode: true }
      );

      // 특징 분석 (꼭짓점 & x절편)
      katex.render(
        String.raw`\text{최고점: } \left( \frac{v_0^2\sin 2\theta}{2g}, \frac{v_0^2\sin^2\theta}{2g} \right), \quad \text{수평 도달거리: } R = \frac{v_0^2\sin 2\theta}{g}`,
        document.getElementById('eq-features'),
        { throwOnError: false, displayMode: true }
      );
    }
  }

  getProjectilesConfig() {
    const configs = [];
    for (let i = 0; i < this.numProjectiles; i++) {
      configs.push({
        angle: this.launchAngle,
        v0: this.initialVelocity,
        mass: this.masses[i] !== undefined ? this.masses[i] : 100 * (i + 1)
      });
    }
    return configs;
  }

  renderProjectileCards() {
    const container = document.getElementById('projectilesCardsContainer');
    container.innerHTML = '';

    for (let idx = 0; idx < this.numProjectiles; idx++) {
      const color = COLORS[idx % COLORS.length];
      const mass = this.masses[idx] !== undefined ? this.masses[idx] : 100 * (idx + 1);
      this.masses[idx] = mass;

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
          <div class="field-row">
            <span class="field-label">공통 발사각:</span>
            <span style="font-family:var(--font-mono); color:#38bdf8; font-weight:600">${this.launchAngle}°</span>
          </div>
          <div class="field-row">
            <span class="field-label">공통 초기속도:</span>
            <span style="font-family:var(--font-mono); color:#38bdf8; font-weight:600">${this.initialVelocity} m/s</span>
          </div>
          <div class="field-row">
            <span class="field-label">개별 질량 (m):</span>
            <input type="range" class="proj-slider" data-idx="${idx}" min="1" max="10000" value="${mass}" step="10">
            <input type="number" class="proj-input" data-idx="${idx}" min="1" max="10000" value="${mass}">
            <span class="unit">g</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    }

    // 개별 질량 입력 이벤트 바인딩
    container.querySelectorAll('.proj-slider, .proj-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = parseFloat(e.target.value) || 1;
        this.masses[idx] = val;

        const partner = container.querySelector(
          `${e.target.tagName === 'INPUT' && e.target.type === 'range' ? '.proj-input' : '.proj-slider'}[data-idx="${idx}"]`
        );
        if (partner) partner.value = val;

        this.syncSimulation();
      });
    });
  }

  syncSimulation() {
    this.gravity = parseFloat(document.getElementById('selectGravity').value) || 9.8;
    const configList = this.getProjectilesConfig();
    this.simCanvas.setProjectiles(configList, this.gravity);
    this.mathGraph.updateGraph(this.simCanvas.trajectoriesData);
    this.renderResultsTable();
  }

  renderResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    const list = this.simCanvas.trajectoriesData;
    if (!list.length) return;

    list.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:${p.color.hex}; font-weight:700">#${p.id}</td>
        <td>${p.angleDeg}°</td>
        <td>${p.v0} m/s</td>
        <td>${p.mass >= 1000 ? (p.mass / 1000).toFixed(1) + ' kg' : p.mass + ' g'}</td>
        <td>${p.maxHeight.toFixed(2)} m</td>
        <td>${p.range.toFixed(2)} m</td>
        <td>${p.totalTime.toFixed(2)} s</td>
        <td>
          <span class="match-badge match-same">
            ✓ 궤적 100% 일치 (동일)
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  bindEvents() {
    // 1. 공통 발사각 변경
    const sliderAngle = document.getElementById('sliderLaunchAngle');
    const inputAngle = document.getElementById('inputLaunchAngle');
    const handleAngleChange = (val) => {
      const angle = Math.min(85, Math.max(5, parseFloat(val) || 45));
      sliderAngle.value = angle;
      inputAngle.value = angle;
      this.launchAngle = angle;
      this.renderProjectileCards();
      this.syncSimulation();
    };
    sliderAngle.addEventListener('input', (e) => handleAngleChange(e.target.value));
    inputAngle.addEventListener('change', (e) => handleAngleChange(e.target.value));

    // 2. 공통 초기속도 변경
    const sliderVel = document.getElementById('sliderInitialVelocity');
    const inputVel = document.getElementById('inputInitialVelocity');
    const handleVelChange = (val) => {
      const v0 = Math.min(60, Math.max(5, parseFloat(val) || 25));
      sliderVel.value = v0;
      inputVel.value = v0;
      this.initialVelocity = v0;
      this.renderProjectileCards();
      this.syncSimulation();
    };
    sliderVel.addEventListener('input', (e) => handleVelChange(e.target.value));
    inputVel.addEventListener('change', (e) => handleVelChange(e.target.value));

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

    // 4. 발사 / 일시정지 / 리셋 컨트롤
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

    // 5. 시뮬레이션 배속 설정
    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const speed = parseFloat(e.target.dataset.speed);
        this.simCanvas.setSpeed(speed);
      });
    });

    // 6. 뷰 옵션 토글
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

    // 7. 인트로 자유낙하 컨트롤
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
