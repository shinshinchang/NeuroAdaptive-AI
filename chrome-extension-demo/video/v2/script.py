# 旁白稿（以 Claude v2 稿為底，依擴充功能實際功能微調）。每句 = [(中文字幕, 英文片段), ...], 句後停頓秒數
# SCORE_HI / SCORE_LO 由 scripted test 實際量到的分數替換
SEGMENTS = {
 'why': [
  ([("每個網頁都在搶你的注意力", "Every web page is competing for your attention:"), ("彈窗、自動播放、會動的廣告", "pop-ups, autoplay videos, moving ads.")], .4),
  ([("對許多人，尤其是神經多樣性的學習者", "For many of us, and especially for neurodivergent learners,"), ("這些雜訊讓人疲憊", "that noise is exhausting.")], .4),
  ([("網路上分心，不只是意志力的問題", "Losing focus online isn't just a willpower problem.")], .2),
  ([("而是設計的問題", "It's a design problem.")], .6)],
 'v01': [
  ([("我們從一個瀏覽器小遊戲 Go/No-Go 開始", "We started with a simple browser game called Go/No-Go.")], .3),
  ([("從每一條滑鼠軌跡，算出十個特徵", "From every mouse path, we extracted ten features,"), ("像反應時間變異、方向變換、路徑效率", "such as reaction-time variability, direction changes, and path efficiency.")], .3),
  ([("合成注意力負荷分數，顯示在儀表板上", "Together, they form an attention-load score on a live dashboard.")], .3)],
 'bridge': [
  ([("v0.1 能量測注意力", "v0.1 could measure attention."), ("但只量測，還幫不上忙", "But measuring isn't helping.")], .6)],
 'sense': [
  ([("接著我們問：能不能在任何網頁上運作", "Then we asked: could this work on any web page,"), ("而不只在測驗裡？", "not just inside a test?")], .3),
  ([("於是我們把它做成 Chrome 擴充功能", "So we rebuilt it as a Chrome extension.")], .3),
  ([("保留滑鼠移動特徵", "It keeps the movement features"), ("再加上來回捲動等瀏覽訊號", "and adds browsing signals, like back-and-forth scrolling.")], .3),
  ([("而且只跟你自己的基準比較", "And it compares you only with your own baseline,"), ("從不跟別人比", "never with anyone else.")], .5),
  ([("程式模擬測試中，躁動的游標", "In a scripted test, restless cursor movement"), ("分數衝過 80、接近滿分", "climbed past eighty, toward the top of the scale."), ("平穩的移動一直低於 20", "Steady movement stayed below twenty.")], .3),
  ([("這證明分數會隨動作變化", "That shows the score reacts to movement."), ("還不能說明真人會怎麼反應", "It doesn't yet show how real people respond.")], .6)],
 'consent': [
  ([("分數持續偏高時，擴充功能不會接管", "When your score stays high, the extension doesn't take over."), ("它只會問：安靜一點的頁面會有幫助嗎？", "It simply asks: would a calmer page help?")], .4),
  ([("你說好之前，什麼都不會改變", "Nothing changes until you say yes.")], 3.0),
  ([("專注模式先讓廣告淡出", "Focus mode fades out the ads,"), ("讓側欄和彈窗滑走", "slides away sidebars and pop-ups,"), ("降低彩度、停止動畫", "softens the colors and freezes animations,"), ("再把文字放大成單欄", "then enlarges the text into one calm column.")], .3),
  ([("閱讀尺或段落聚焦", "A reading ruler, or paragraph focus,"), ("讓你一次只看一行、一段", "lets you take it one line, or one paragraph, at a time.")], .5)],
 'control': [
  ([("不需要鏡頭，也不需要額外硬體", "It needs no camera and no extra hardware,"), ("只用你本來就在用的滑鼠", "just the mouse you already use.")], .3),
  ([("一鍵就能還原原本的網頁", "One click restores the original page,"), ("資料也不會離開你的電腦", "and your data never leaves your computer.")], .6)],
 'next': [
  ([("下一步，我們會請同學試用", "Next, classmates will try it,"), ("用他們的回饋調整權重", "and their feedback will help us tune the weights.")], .4),
  ([("NeuroAdaptive 不是醫療或診斷工具", "NeuroAdaptive is not a medical or diagnostic tool.")], .4),
  ([("這是讓網頁配合人的一小步", "It's a small step toward a web that adapts to people,"), ("而不是讓人去配合網頁", "instead of people adapting to the web.")], .5),
  ([("歡迎來攤位試玩", "Come try it at our booth.")], 1.0)],
}
ORDER = ['why', 'v01', 'bridge', 'sense', 'consent', 'control', 'next']
