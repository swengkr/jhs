/**
 * 수학적 분석 & Chart.js 기반 이차함수 그래프 렌더러
 */

export class MathGraphManager {
  constructor(canvasId, legendListId) {
    this.canvas = document.getElementById(canvasId);
    this.legendList = document.getElementById(legendListId);
    this.chart = null;
    this.initChart();
  }

  initChart() {
    const ctx = this.canvas.getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: '수평 위치 x (m)',
              color: '#94a3b8',
              font: { family: 'Pretendard', size: 12, weight: '600' }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            ticks: {
              color: '#64748b'
            },
            min: 0
          },
          y: {
            type: 'linear',
            title: {
              display: true,
              text: '수직 높이 y (m)',
              color: '#94a3b8',
              font: { family: 'Pretendard', size: 12, weight: '600' }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            ticks: {
              color: '#64748b'
            },
            min: 0
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#f8fafc',
              font: { family: 'Pretendard', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const p = context.raw;
                return ` ${context.dataset.label}: (x: ${p.x.toFixed(1)}m, y: ${p.y.toFixed(1)}m)`;
              }
            }
          }
        }
      }
    });
  }

  updateGraph(trajectoriesData) {
    if (!this.chart) return;

    const datasets = trajectoriesData.map((props, idx) => {
      const points = [];
      const steps = 60;
      const xMax = props.range;

      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * xMax;
        // y = ax^2 + bx
        const y = Math.max(0, props.quadA * x * x + props.quadB * x);
        points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
      }

      const borderWidth = 3 + (trajectoriesData.length - idx) * 0.8;
      const borderDash = idx === 0 ? [] : (idx === 1 ? [6, 4] : (idx === 2 ? [3, 3] : [8, 3, 2, 3]));

      const massText = props.mass >= 1000 ? (props.mass/1000).toFixed(1)+'kg' : props.mass+'g';
      return {
        label: `투사체 #${props.id} (${props.angleDeg}°, ${props.v0}m/s, ${massText})`,
        data: points,
        borderColor: props.color.hex,
        backgroundColor: props.color.hex,
        borderWidth: borderWidth,
        borderDash: borderDash,
        pointRadius: 0,
        tension: 0.1
      };
    });

    this.chart.data.datasets = datasets;
    this.chart.update();

    this.renderEquationLegend(trajectoriesData);
  }

  renderEquationLegend(trajectoriesData) {
    if (!this.legendList) return;

    this.legendList.innerHTML = '';

    trajectoriesData.forEach((props) => {
      const item = document.createElement('div');
      item.className = 'eq-item';
      item.style.borderLeftColor = props.color.hex;

      const aStr = props.quadA.toFixed(4);
      const bStr = Math.abs(props.quadB).toFixed(3);
      const sign = props.quadB >= 0 ? '+' : '-';
      const massText = props.mass >= 1000 ? (props.mass/1000).toFixed(1)+'kg' : props.mass+'g';

      item.innerHTML = `
        <div>
          <strong style="color:${props.color.hex}">#${props.id} (${props.angleDeg}°, ${props.v0}m/s, ${massText}):</strong> 
          <span style="color:#f8fafc">y = ${aStr}x² ${sign} ${bStr}x</span>
        </div>
        <div style="font-size:0.78rem; color:#94a3b8">
          꼭짓점 (${(props.v0x * props.timePeak).toFixed(1)}, ${props.maxHeight.toFixed(1)}) | x절편: ${props.range.toFixed(1)}m
        </div>
      `;
      this.legendList.appendChild(item);
    });
  }
}
