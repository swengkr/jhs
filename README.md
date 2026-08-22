# 🌌 고등 물리 & 수학 인터랙티브 탐구실
## 자유낙하 및 포물선 운동 시뮬레이터 (Render Static Site 배포 가이드)

고등학생을 위한 물리학(자유낙하, 포물선 운동)과 수학(이차함수 $y=ax^2+bx$) 연계 학습 인터랙티브 웹 애플리케이션입니다.

---

### 🚀 핵심 학습 목표
1. **물리학 개념**: 공기 저항이 없는 진공 공간에서는 물체의 낙하 속도 및 포물선 비행 궤적이 **물체의 질량($m$)과 완전히 무관**함을 눈으로 확인합니다.
2. **수학적 개념**: 수평 방향 등속도 운동과 수직 방향 등가속도 운동을 결합하여 유도된 궤적 방정식이 **이차함수 $y = ax^2 + bx$** 형태를 이룸을 실시간 그래프로 이해합니다.

---

### 🌐 Render 서비스에 무료 배포하는 방법 (클릭 몇 번으로 완료)

본 프로젝트는 순수 정적 웹(HTML5/CSS3/JavaScript)으로 제작되어 **Render의 'Static Site' 서비스**로 무료 배포 및 상시 링크 공유가 가능합니다.

#### 방법 A: GitHub 연동을 통한 자동 배포 (권장)
1. GitHub에 본 저장소(Repository)를 푸시(Push)합니다.
2. [Render 대시보드](https://dashboard.render.com/)에 로그인합니다.
3. **`New +`** 버튼 클릭 $\rightarrow$ **`Static Site`** 선택
4. 해당 GitHub Repository를 연결합니다.
5. 설정 입력:
   - **Name**: 원하는 웹사이트 이름 (예: `physics-math-lab`)
   - **Branch**: `main` (또는 `master`)
   - **Build Command**: 비워둠 (빈칸)
   - **Publish Directory**: `./` (또는 루트 경로)
6. **`Create Static Site`** 버튼을 누르면 약 30초 내에 전 세계 어디서든 접속 가능한 링크(`https://your-site-name.onrender.com`)가 생성됩니다.

---

### 💻 로컬에서 바로 실행해보기
브라우저에서 `index.html` 파일을 바로 열거나, 간단한 정적 웹서버(예: VSCode Live Server, Python `python -m http.server 8080`, npx serve 등)로 실행할 수 있습니다.
