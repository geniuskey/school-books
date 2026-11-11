# SchoolBooks — 그 나이엔 이 정도는, 만지며 배우는 수학과 과학

초등·중등·고등 교과서의 수학과 과학을 생활 속 질문 하나로 시작하는 한국어 인터랙티브 그림책 서가입니다. 장마다 먼저 예상하고, 직접 해 보고, 플랩을 들춰 증명을 확인하고, 확인 문제 세 개를 풀어 도장을 받습니다. 학생과, 학교에서 배웠지만 다 잊은 어른을 함께 독자로 둡니다.
[books.euiyun.com](https://books.euiyun.com/) 시리즈의 한 서가이며, 한 저장소(모노레포)에 세 권을 둡니다.

배포 주소: https://school.euiyun.com/

| 경로 | 책 | 이야기 | 상태 |
|---|---|---|---|
| [/elementary/](https://school.euiyun.com/elementary/) | 하루의 수학과 과학 (초등) | 열 살 지우와 고양이 두부의 하루, 아침 7시부터 밤 9시까지 | 집필 중 (00장 공개, 13장 계획) |
| [/middle/](https://school.euiyun.com/middle/) | 캠핑장의 수학과 과학 (중등) | 중2 민서 가족의 1박 2일 캠핑 | 집필 중 (15장 계획) |
| [/high/](https://school.euiyun.com/high/) | 뉴스 속 수학과 과학 (고등) | 고2 태오와 과학 교사 윤 선생님의 아침 식탁, 가상 헤드라인 | 집필 중 (15장 계획) |

장 계획(질문, 예측 문항, 핵심 시뮬레이터, 흔한 오해, 2022 개정 교육과정 성취기준)과 집필 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.

## 실행

빌드 과정 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000      # → http://localhost:8000/
```

## 점검

```bash
python3 tools/head.py            # book.json → book.js, 각 페이지 head, 목차·계획 표, sitemap
python3 tools/lint.py            # 장의 틀·용어·수식·글자 수(가벼움 점검)
node --test tools/sim.test.mjs   # 계산(SIM) 검산
python3 tools/check.py           # 브라우저 점검(Playwright): 넓은 화면·라이트, 360px·다크, 저장 막힘
npm test                         # CI와 같은 검사(sim + head --check + lint)
```

## 배포

`main`에 push하면 GitHub Actions(Deploy Book)가 `npm test` 뒤 `npm run build`(`@euiyun/book`)로 `.book-dist/`를 만들어 GitHub Pages에 올립니다. 빌드가 canonical·OG 기본값과 GA4 태그를 채우고 원본의 Cloudflare 비컨을 GA4로 바꿉니다. Pages의 Source를 GitHub Actions로, 커스텀 도메인을 `school.euiyun.com`으로 설정하고 DNS(Cloudflare, DNS only)를 연결해야 합니다. 이 저장소의 CNAME만으로 DNS나 GitHub 설정이 바뀌지는 않습니다.

공유 이미지(`og.png`)는 `python3 tools/og.py`로 다시 만듭니다.

## 라이선스

코드는 MIT, 본문·그림은 CC BY 4.0입니다. [라이선스 안내](LICENSE.md)를 참고하세요.
