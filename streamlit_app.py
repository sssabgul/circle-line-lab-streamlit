from pathlib import Path

import streamlit as st
from streamlit.components.v1 import declare_component


st.set_page_config(
    page_title="원과 직선의 위치관계",
    page_icon="⭕",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ROOT = Path(__file__).parent
DIST = ROOT / "dist"

# dist 안의 React 웹앱을 Streamlit 커스텀 컴포넌트로 실행한다.
if not DIST.exists():
    st.error("웹앱 파일을 찾을 수 없습니다. 먼저 npm run build를 실행해 주세요.")
else:
    circle_line_lab = declare_component(
        "circle_line_lab",
        path=str(DIST),
    )
    circle_line_lab(key="circle-line-lab")
