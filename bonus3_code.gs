// 보너스 3: 모델 비교용 공통 프롬프트([카테고리: 텍스트 생성])를 Gemini API로 호출한다.
// API 키는 코드에 적지 않고 '프로젝트 설정 > 스크립트 속성'의 GEMINI_API_KEY에 넣는다.

const MODEL = 'gemini-2.5-flash'; // listModels() 실행 결과에 있는 이름으로 바꿔 쓴다.

const PROMPT = "아래 [강의 자료]\n(강의자료 04의 슬라이드 텍스트. 저작권 때문에 저장소에는 생략)";

// 1) 내 키로 쓸 수 있는 모델 이름을 실행 로그에 출력한다.
function listModels() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
    headers: { 'x-goog-api-key': key },
    muteHttpExceptions: true,
  });
  const data = JSON.parse(res.getContentText());
  if (!data.models) { Logger.log(res.getContentText()); return; }
  data.models
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .forEach(m => Logger.log(m.name.replace('models/', '')));
}

// 2) 프롬프트를 그대로 보내고 응답을 실행 로그에 출력한다.
function callPrompt() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';
  // 503(과부하)이면 10초, 20초, 40초, 80초 기다렸다가 최대 5번까지 다시 보낸다.
  let res;
  for (let attempt = 1; attempt <= 5; attempt++) {
    res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: PROMPT }] }] }),
      muteHttpExceptions: true,
    });
    Logger.log('시도 ' + attempt + ' / 모델: ' + MODEL + ' / 실행 시점: ' + new Date().toISOString() + ' / HTTP ' + res.getResponseCode());
    if (res.getResponseCode() !== 503 || attempt === 5) break;
    Utilities.sleep(10000 * Math.pow(2, attempt - 1));
  }
  const data = JSON.parse(res.getContentText());
  const text = data.candidates && data.candidates[0].content
    ? data.candidates[0].content.parts.map(p => p.text).join('')
    : res.getContentText();
  // 실행 로그는 긴 글을 자를 수 있어서 2000자씩 나눠 출력한다.
  for (let i = 0; i < text.length; i += 2000) Logger.log(text.slice(i, i + 2000));
}
