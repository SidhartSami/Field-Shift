import {UR} from './urdu.js';
const lower=new Map(Object.entries(UR).map(([k,v])=>[k.toLowerCase(),v]));
const word=s=>UR[s]||lower.get(s.toLowerCase())||s;
const templates=[
 [/^Equivalent to (.+) acres$/,m=>`تقریباً ${m[1]} ایکڑ کے برابر`],
 [/^A demand equivalent of (.+) m³ across (.+) ha in the illustrative model; this is not water already saved\. Water still needed beyond the assumed rain and irrigation: (.+) mm\/year\. Family changes: (.+) of 3 transitions\. Soil-protection proxy: (.+)\/100\.$/,m=>`آزمائشی حساب میں ${m[2]} ہیکٹر پر ضرورت کا فرق ${m[1]} مکعب میٹر کے برابر ہے، یہ پہلے سے بچایا ہوا پانی نہیں۔ بارش اور آبپاشی کے بعد سالانہ کمی ${m[3]} ملی میٹر ہے۔ تین میں سے ${m[4]} بار فصل کا خاندان بدلتا ہے۔ زمین کی حفاظت کا انتظامی اشارہ ${m[5]} از 100 ہے۔`],
 [/^Water still needed beyond the assumed rain and irrigation: (.+) mm\/year\. Family changes: (.+) of 3 transitions\. Soil-protection proxy: (.+)\/100\.$/,m=>`بارش اور دستیاب آبپاشی کے بعد سالانہ کمی ${m[1]} ملی میٹر ہے۔ تین میں سے ${m[2]} بار فصل کا خاندان بدلتا ہے۔ زمین کی حفاظت کا انتظامی اشارہ ${m[3]} از 100 ہے۔`],
 [/^What could (.+) change for you\?$/,m=>`${word(m[1])} سے آپ کے لیے کیا بدل سکتا ہے؟`],
 [/^([\d,.]+)% (lower|higher)$/,m=>`${m[1]}٪ ${m[2]==='lower'?'کم':'زیادہ'}`],
 [/^([+-]?[\d,.]+) points$/,m=>`${m[1]} نمبر`],
 [/^([\d,.]+) of 3$/,m=>`3 میں سے ${m[1]}`],
 [/^(.+) mm\/year of indicative demand$/,m=>`سالانہ تخمینی ضرورت ${m[1]} ملی میٹر`],
 [/^([\d,.]+) mm\/year in your current rotation\. (.+)$/,m=>`موجودہ فصلوں میں سالانہ ${m[1]} ملی میٹر کمی۔ ${m[2].includes('Annual zero')?'سالانہ صفر کمی کا مطلب ہر موسم میں کافی پانی نہیں۔':'وقت اور آبپاشی کے ضیاع کی مقامی جانچ ضروری ہے۔'}`],
 [/^([\d,.]+)% below observed$/,m=>`مشاہدے سے ${m[1]}٪ کم`],
 [/^(\d+) strategies · (.+) weights · (\d+) historical baseline$/,m=>`${m[1]} ترتیبیں · ${word(m[2])} کی ترجیح · ${m[3]} کے مشاہدات`],
 [/^~([\d,.]+) mm demand$/,m=>`تقریباً ${m[1]} ملی میٹر ضرورت`],
 [/^YEAR (\d+)$/,m=>`سال ${m[1]}`],
 [/^Year (\d+) (winter|summer) crop$/,m=>`سال ${m[1]} کی ${m[2]==='winter'?'ربیع':'خریف'} کی فصل`],
 [/^([\d,.]+) mm (less|more) annual demand than your baseline$/,m=>`موجودہ فصلوں سے سالانہ ${m[1]} ملی میٹر ${m[2]==='less'?'کم':'زیادہ'} ضرورت`],
 [/^Based on ([\d,.]+) m³ less hypothetical applied irrigation, capped by your available water\. Actual bills, yields and prices may differ\. This calculation does not predict profit\.$/,m=>`دستیاب پانی کی حد کے اندر ${m[1]} مکعب میٹر کم فرضی آبپاشی پر حساب ہے۔ اصل بل، پیداوار اور قیمت مختلف ہو سکتے ہیں۔ یہ منافع کی پیش گوئی نہیں۔`],
 [/^Annual summary · (\d+)$/,m=>`سالانہ خلاصہ · ${m[1]}`],
 [/^([A-Za-z]+) · (\d+)$/,m=>`${word(m[1])} · ${m[2]}`],
 [/^([A-Za-z]+) (\d{4})$/,m=>`${word(m[1])} ${m[2]}`],
 [/^(\d+) NASA cells · (\d+) · (.+)$/,m=>`${m[1]} ناسا خانے · ${m[2]} · ${m[3]==='annual'?'سالانہ':word(m[3])}`],
 [/^(\d+) cells$/,m=>`${m[1]} خانے`],
 [/^NASA center (.+)$/,m=>`ناسا خانے کا مرکز ${m[1]}`],
 [/^Regional (minimum|maximum): (.+)$/,m=>`علاقائی ${m[1]==='minimum'?'کم ترین':'زیادہ ترین'} قدر: ${m[2]}`],
 [/^Approximate NASA grid elevation: (.+) m\.(.*)$/,m=>`ناسا خانے کی تخمینی بلندی ${m[1]} میٹر۔ ${m[2]?'زیادہ بلندی پر میدانی فصلیں موزوں نہ ہوں۔ بلندی کا اثر اس ماڈل میں شامل نہیں۔':''}`],
 [/^NASA POWER · (\d+) · (.+)$/,m=>`ناسا پاور · ${m[1]} · ${word(m[2])}`],
 [/^The (\d+) record contains ([\d,.]+) mm of rainfall and a warmest monthly mean of ([\d,.]+)°C\.(.*)$/,m=>`${m[1]} میں بارش ${m[2]} ملی میٹر اور گرم ترین ماہ کا اوسط ${m[3]} سینٹی گریڈ تھا۔ سالانہ مقدار کے ساتھ بارش کا وقت بھی اہم ہے۔ مقامی بوائی، مٹی کی جانچ اور آبپاشی کے ریکارڈ ساتھ دیکھیں۔`],
 [/^Loaded NASA observations at (.+)°, (.+)°\. Coordinate changes require a refresh\.$/,m=>`ناسا کے اعداد ${m[1]}°، ${m[2]}° کے لیے ہیں۔ مقام بدلنے کے بعد اسی جگہ کے اعداد دوبارہ لائیں۔`],
 [/^Using the bundled NASA snapshot at (.+)\. Coordinate edits require a successful fetch\.$/,m=>`محفوظ ناسا مشاہدات ${m[1]} کے ہیں۔ مقام بدلنے کے بعد اسی جگہ کے اعداد لانا ضروری ہے۔`],
 [/^Rainfall −(.+)% · \+(.+)°C · (.+) mm irrigation\/year$/,m=>`بارش میں ${m[1]}٪ کمی · ${m[2]}°C اضافہ · سالانہ آبپاشی ${m[3]} ملی میٹر`],
 [/^Rainfall −(.+)% · Temperature \+(.+)°C$/,m=>`بارش میں ${m[1]}٪ کمی · گرمی میں ${m[2]}°C اضافہ`],
 [/^Grid-cell meteorological context · (.+)$/,m=>`بڑے موسمی خانے کا سیاق · ${m[1]}`],
 [/^Location (.+)° · retrieved (.+) · MERRA-2 via NASA POWER · API (.+) · available 2023–2024\. Ranking uses the selected year: (\d+)\.$/,m=>`مقام ${m[1]}° · حاصل کردہ ${m[2]} · ناسا پاور کی MERRA-2 تحلیل · API ${m[3]} · مدت 2023–2024 · منتخب سال ${m[4]}۔`],
 [/^Bundled NASA POWER regional responses retrieved (.+)\. 2023–2024 observations,(.*)$/,m=>`علاقائی ناسا اعداد ${m[1]} کو حاصل ہوئے۔ یہ 2023–2024 کے مشاہدات ہیں، موجودہ موسم نہیں۔ تقریباً 0.5° × 0.625° کے خانے کھیت کی حدیں نہیں۔`],
 [/^(.+) \(negative means added cost\)$/,m=>`${word(m[1])}، منفی قدر اضافی خرچ ہے`],
];
const sentences={
 'Before switching: confirm buyers for millet and pulses, seed access, drainage and local sowing windows. Lower modelled water demand does not establish a better crop margin.':'فصل بدلنے سے پہلے باجرے اور دالوں کے خریدار، بیج، نکاسی اور مقامی وقت کی تصدیق کریں۔ کم حسابی پانی کی ضرورت بہتر مارجن کی ضمانت نہیں۔',
 'Keeping familiar crops can avoid switching effort. Check whether the remaining water gap and repeated crop families still fit your constraints.':'واقف فصلیں رکھنے سے تبدیلی کی محنت بچ سکتی ہے۔ دیکھیں باقی پانی کی کمی اور ایک ہی خاندان کی تکرار آپ کے حالات میں قابلِ قبول ہیں یا نہیں۔',
 'Keeping wheat in both winters can limit how much changes at once. Confirm summer pulse establishment, labour availability and what buyers will pay.':'دونوں ربیع میں گندم رکھنے سے ایک ساتھ کم تبدیلی ہوتی ہے۔ خریف کی دال، مزدور اور خریدار کی قیمت کی تصدیق کریں۔',
 'A pulse and an oilseed change the crop-family sequence. Check harvest timing, seed access and buyers before trading a familiar market for a new one.':'دال اور تیل دار فصل خاندانوں کی ترتیب بدلتی ہیں۔ کٹائی کے وقت، بیج اور نئے خریدار کو پہلے جانچیں۔',
 'For your custom sequence, check each crop’s local planting window, buyers, equipment and labour requirements. A model score does not establish agronomic suitability.':'اپنی ترتیب کی ہر فصل کے لیے مقامی بوائی کا وقت، خریدار، مشینری اور مزدور دیکھیں۔ حسابی درجہ موزونیت کی تصدیق نہیں۔',
 'Break cereal repetition with a pulse and an oilseed. Requires buyers for new crops.':'اناج کی تکرار کے درمیان دال اور تیل دار فصل شامل ہیں۔ نئی فصل کے خریدار ضروری ہیں۔',
 'Lower indicative water demand; millet and mung market access and drainage need checking.':'تخمینی پانی کی ضرورت کم ہے۔ باجرے اور مونگ کے خریدار اور نکاسی جانچنا ضروری ہے۔',
 'Keeps wheat in the plan. Mung establishment and harvest timing need local validation.':'گندم برقرار رہتی ہے۔ مونگ کی کامیاب بوائی اور کٹائی کے وقت کی مقامی جانچ ضروری ہے۔',
 'Reference strategy: your current two-season sequence repeated over two years.':'موازنے کی بنیاد: آپ کی موجودہ دو موسمی فصلیں دو سال دہرائی گئی ہیں۔',
 'Your editable four-season sequence. Check seasonal suitability and local planting windows with an agronomist.':'آپ کی چار موسموں کی ترتیب۔ مقامی زرعی ماہر سے فصل کے موسم اور بوائی کا وقت جانچیں۔',
 'NASA POWER corrected precipitation. Monthly means converted to totals; annual view sums 12 months.':'ناسا پاور کی درست کردہ بارش۔ ماہانہ اوسط سے مقدار نکالی گئی ہے؛ سالانہ منظر بارہ ماہ کا مجموعہ ہے۔',
 'NASA POWER mean 2 m air temperature, not land-surface temperature or daily heat extremes.':'ناسا پاور کا دو میٹر بلندی پر ہوا کا اوسط۔ یہ زمین کی سطح یا روزانہ شدید گرمی کا درجہ نہیں۔',
 'NASA POWER modelled wetness, dimensionless 0–1. Not field moisture, not a SMAP retrieval.':'ناسا پاور کی حسابی نمی، صفر تا ایک۔ یہ کھیت کی ناپی ہوئی نمی یا SMAP کی پیمائش نہیں۔',
 'Illustrative annual deficit for the selected rotation. The same field soil, irrigation and scenario assumptions are applied to every cell; this is not an observed risk map.':'منتخب فصلوں میں سالانہ پانی کی حسابی کمی۔ ہر خانے میں ایک ہی کھیت کی مٹی، آبپاشی اور فرضی حالات لگائے گئے ہیں۔ یہ ناپے گئے خطرے کا نقشہ نہیں۔',
 'Water your current rotation still lacks → water the selected rotation still lacks, using this cell’s annual rain and the same field assumptions. Annual averages can conceal seasonal shortages.':'موجودہ فصلوں میں باقی پانی کی کمی ← منتخب فصلوں میں باقی کمی۔ اس خانے کی سالانہ بارش اور کھیت کے ایک جیسے مفروضے استعمال ہوئے ہیں۔ سالانہ اوسط موسمی کمی چھپا سکتا ہے۔',
 'Coordinates changed. Refresh NASA observations. The comparison below remains from the last valid context.':'مقام بدل گیا ہے۔ اسی مقام کے ناسا اعداد لائیں۔ نیچے موازنہ آخری درست معلومات کا ہے۔',
 'Field workspace switched.':'کھیت بدل دیا گیا ہے۔',
 'Field created. Edit its context to begin.':'کھیت شامل ہے۔ شروع کرنے کے لیے اس کی معلومات درست کریں۔',
 'Decision saved with its NASA evidence.':'فیصلہ ناسا کی بنیاد اور آپ کے اندازوں کے ساتھ محفوظ ہے۔',
 'Decision snapshot opened as the current draft.':'محفوظ فیصلہ موجودہ مسودے میں کھل گیا ہے۔',
 'Decision removed.':'فیصلہ ہٹا دیا گیا ہے۔',
 'NASA observations refreshed.':'ناسا کے اعداد حاصل ہو گئے ہیں۔',
 'NASA observations refreshed. Historical context is ready.':'ناسا کے اعداد آ گئے ہیں۔ گزشتہ موسم کی بنیاد تیار ہے۔',
 'Retrieving NASA data…':'ناسا کے اعداد آ رہے ہیں…',
 'Retrieving historical observations for 2023–2024…':'2023–2024 کے مشاہدات حاصل ہو رہے ہیں…',
 'Select a map location or choose a NASA grid cell.':'نقشے پر جگہ یا ناسا کا خانہ چنیں۔',
 'Model overlay paused: correct field inputs and fetch observations matching its coordinates.':'حسابی تہہ رکی ہوئی ہے۔ کھیت کی معلومات درست کر کے اسی مقام کے مشاہدات لائیں۔',
 'Map rendering is unavailable. All observations remain accessible in the data table and cell selector.':'نقشہ دکھائی نہیں دے رہا۔ تمام اعداد جدول اور خانے کی فہرست میں دستیاب ہیں۔',
 'Regional overlay unavailable. Existing field observations and planning remain available.':'علاقائی تہہ دستیاب نہیں۔ کھیت کے موجودہ اعداد اور منصوبہ بندی دستیاب ہیں۔',
 'Some basemap tiles could not load. Try Streets or Data only; NASA grid values remain available.':'پس منظر کے کچھ حصے نہیں آ سکے۔ سڑکوں یا صرف ڈیٹا کا منظر چنیں؛ ناسا کے اعداد دستیاب ہیں۔',
 'Comparison updated with your field context.':'آپ کے کھیت کی معلومات سے موازنہ بدل گیا ہے۔',
 'Location applied. Retrieving matching NASA point observations.':'مقام درج ہے۔ اسی جگہ کے ناسا اعداد حاصل ہو رہے ہیں۔',
 'Enter your local cost assumptions first.':'پہلے اپنے مقامی خرچ کے اندازے درج کریں۔',
};
export function translateUrdu(value){const trimmed=value.trim();if(UR[trimmed])return value.replace(trimmed,UR[trimmed]);if(sentences[trimmed])return value.replace(trimmed,sentences[trimmed]);for(const [regex,render] of templates){const m=trimmed.match(regex);if(m)return value.replace(trimmed,render(m))}return value;}
export function createLocale({document:doc,onChange=()=>{}}){
 const win=doc.defaultView;let language='ur';try{language=win.localStorage.getItem('fieldshift-language')==='en'?'en':'ur'}catch{}
 const originals=new WeakMap(),attributeOriginals=new WeakMap();let pending=false;
 const skip=e=>e?.closest('script,style,textarea,[data-no-translate],#active-field-label,#decision-name,#field-list .field-item>span:nth-child(2),.saved-plan>p,.saved-plan h3,.language-control');
 function localize(){observer.disconnect();const walker=doc.createTreeWalker(doc.body,win.NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(skip(node.parentElement)||!node.data.trim())continue;const old=originals.get(node),original=old&&node.data===old.rendered?old.original:node.data;const rendered=language==='ur'?translateUrdu(original):original;originals.set(node,{original,rendered});if(node.data!==rendered)node.data=rendered}
  for(const el of doc.querySelectorAll('[placeholder],[aria-label],[title]')){if(skip(el))continue;const values=attributeOriginals.get(el)||{};for(const name of ['placeholder','aria-label','title']){if(!el.hasAttribute(name))continue;const value=el.getAttribute(name),old=values[name],original=old&&value===old.rendered?old.original:value,rendered=language==='ur'?translateUrdu(original):original;values[name]={original,rendered};if(value!==rendered)el.setAttribute(name,rendered)}attributeOriginals.set(el,values)}
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true});
 }
 const observer=new win.MutationObserver(()=>{if(!pending){pending=true;win.queueMicrotask(()=>{pending=false;localize()})}});
 function apply(){doc.documentElement.lang=language==='ur'?'ur-PK':'en';doc.documentElement.dir=language==='ur'?'rtl':'ltr';doc.getElementById('language-select').value=language;localize()}
 doc.getElementById('language-select').addEventListener('change',()=>{language=doc.getElementById('language-select').value==='en'?'en':'ur';try{win.localStorage.setItem('fieldshift-language',language)}catch{}apply();onChange(language)});
 apply();return {get language(){return language},translate:value=>language==='ur'?translateUrdu(value):value,refresh:localize,destroy(){observer.disconnect()}};
}
