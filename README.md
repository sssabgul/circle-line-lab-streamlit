# 원과 직선의 위치관계 — Streamlit 버전

공통수학2 「원의 방정식」 수업에서 사용하는 탐구형 미니 웹앱입니다.

기존 React/Vite 수업 앱을 Streamlit 커스텀 컴포넌트로 실행하도록 구성했습니다. 직선 드래그, 기울기와 절편 조절, 미션, 거리 탐구, 예측 활동을 그대로 사용할 수 있습니다.

## Streamlit Community Cloud 배포

1. Streamlit Community Cloud에서 **Create app**을 선택합니다.
2. 저장소로 `sssabgul/circle-line-lab-streamlit`을 선택합니다.
3. Branch는 `main`으로 설정합니다.
4. Main file path에는 `streamlit_app.py`를 입력합니다.
5. **Deploy**를 누릅니다.

`dist` 폴더는 미리 빌드되어 저장소에 포함되어 있으므로 Streamlit 서버에서 Node.js 빌드를 따로 실행할 필요가 없습니다.

## 로컬 실행

웹 화면을 수정한 뒤에는 먼저 정적 파일을 다시 만듭니다.

```bash
npm install
npm run build
```

그다음 Streamlit을 실행합니다.

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## 파일 역할

- `src/`: 직선과 원을 조작하는 React 웹앱 소스
- `dist/`: Streamlit이 실제로 보여주는 빌드 결과
- `streamlit_app.py`: Streamlit 시작 파일
- `requirements.txt`: Streamlit 설치 목록
- `.streamlit/config.toml`: 앱 색상과 기본 설정
