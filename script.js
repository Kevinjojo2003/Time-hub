// ——— Config ———
const API_KEY = '2a470760e16fb7d5e3246417e2c832ff';

// ——— Elements ———
const bgEl        = document.getElementById('main');
const dateEl      = document.getElementById('current-date');
const timeEl      = document.getElementById('sw-display'); // we'll update via other functions
const weatherEl   = document.getElementById('weather');
const alarmSound  = document.getElementById('alarmSound');
const alarmListEl = document.getElementById('alarmList');

// ——— State ———
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let swTime = 0, swInt;
let timerTime = 15 * 60, timerInt;
let pomoTime = 25 * 60, pomoInt;
const trackedZones = ['America/New_York','Europe/London','Asia/Tokyo','Australia/Sydney'];

// ——— Util ———
function updateDate() {
  dateEl.textContent = new Date().toDateString();
}
function getTimeOfDay(h) {
  if (h<5)       return 'night';
  if (h<12)      return 'morning';
  if (h<17)      return 'afternoon';
  if (h<20)      return 'evening';
  return 'night';
}
function setBackground(timeOfDay, weather) {
  let url;
  if (weather.includes('rain')) url = 'https://images.unsplash.com/photo-1505480449763-1ca3f89d9a3b';
  else if (weather.includes('snow')) url = 'https://images.unsplash.com/photo-1606312610734-bb18056566f4';
  else {
    const map = {
      morning:   'https://images.unsplash.com/photo-1502082553048-f009c37129b9',
      afternoon: 'https://images.unsplash.com/photo-1499394200377-4f4e3d17c14e',
      evening:   'https://images.unsplash.com/photo-1524231757912-21d6b01a79bc',
      night:     'https://images.unsplash.com/photo-1504384308090-c894fdcc538d'
    };
    url = map[timeOfDay];
  }
  bgEl.style.backgroundImage = `url('${url}?auto=format&fit=crop&w=1600')`;
}

// ——— Live Background ———
async function fetchWeather() {
  return new Promise((res, rej)=>{
    navigator.geolocation.getCurrentPosition(p=>{
      const { latitude: lat, longitude: lon } = p.coords;
      fetch(`https://pro.openweathermap.org/data/2.5/forecast/hourly?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        .then(r=>r.json())
        .then(data=>{
          const desc = data.list[0].weather[0].description;
          res(desc.toLowerCase());
        })
        .catch(e=>{ console.error(e); res('clear'); });
    },()=>res('clear'));
  });
}
async function updateBackground() {
  const now = new Date();
  const tod = getTimeOfDay(now.getHours());
  const weather = await fetchWeather();
  setBackground(tod, weather);
}

// ——— World Clocks ———
function updateClocks() {
  const ul = document.getElementById('world-clocks-list');
  ul.innerHTML = '';
  trackedZones.forEach(z=>{
    const city = z.split('/').pop().replace('_',' ');
    const time = moment().tz(z).format('HH:mm:ss');
    ul.innerHTML += `<li>${city}: ${time}</li>`;
  });
}

// ——— Stopwatch ———
function startStopwatch(){
  clearInterval(swInt);
  swInt = setInterval(()=>{
    swTime++;
    document.getElementById('sw-display').textContent =
      moment.utc(swTime*1000).format('HH:mm:ss');
  },1000);
}
function resetStopwatch(){
  clearInterval(swInt);
  swTime = 0;
  document.getElementById('sw-display').textContent = '00:00:00';
}

// ——— Timer ———
function startTimer(){
  clearInterval(timerInt);
  timerInt = setInterval(()=>{
    if (timerTime<=0) return clearInterval(timerInt);
    timerTime--;
    document.getElementById('timer-display').textContent =
      moment.utc(timerTime*1000).format('mm:ss');
  },1000);
}
function resetTimer(){
  clearInterval(timerInt);
  timerTime = 15*60;
  document.getElementById('timer-display').textContent = '15:00';
}

// ——— Pomodoro ———
function startPomodoro(){
  clearInterval(pomoInt);
  pomoInt = setInterval(()=>{
    if (pomoTime<=0) return clearInterval(pomoInt);
    pomoTime--;
    document.getElementById('pomodoro-time').textContent =
      moment.utc(pomoTime*1000).format('mm:ss');
  },1000);
}
function resetPomodoro(){
  clearInterval(pomoInt);
  pomoTime = 25*60;
  document.getElementById('pomodoro-time').textContent = '25:00';
}

// ——— Alarm Clock ———
function showAlarms(){
  alarmListEl.innerHTML = '';
  alarms.forEach((t,i)=>{
    alarmListEl.innerHTML += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        ${t}
        <div>
          <button class="btn btn-sm btn-warning me-1" onclick="snoozeAlarm('${t}')">Snooze</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAlarm(${i})">Delete</button>
        </div>
      </li>`;
  });
}
function setAlarm(){
  const t = document.getElementById('alarmTime').value;
  if (t && !alarms.includes(t)){
    alarms.push(t);
    localStorage.setItem('alarms',JSON.stringify(alarms));
    showAlarms();
  }
}
function deleteAlarm(i){
  alarms.splice(i,1);
  localStorage.setItem('alarms',JSON.stringify(alarms));
  showAlarms();
}
function snoozeAlarm(t){
  const [h,m] = t.split(':').map(Number);
  const dt = new Date(); dt.setHours(h); dt.setMinutes(m+5);
  const nt = dt.toTimeString().substr(0,5);
  alarms.push(nt);
  localStorage.setItem('alarms',JSON.stringify(alarms));
  showAlarms();
}
function checkAlarms(){
  const now = new Date().toTimeString().substr(0,5);
  if (alarms.includes(now)){
    alarmSound.play();
    if (Notification.permission==='granted'){
      new Notification('⏰ Alarm', { body: `It's ${now}` });
    } else Notification.requestPermission();
    alarms = alarms.filter(t=>t!==now);
    localStorage.setItem('alarms',JSON.stringify(alarms));
    showAlarms();
  }
}

// ——— Initialization ———
document.addEventListener('DOMContentLoaded',()=>{
  updateDate();
  updateBackground();
  setInterval(updateBackground,60*60*1000); // refresh bg hourly
  setInterval(updateClocks,1000);
  setInterval(checkAlarms,1000);

  resetStopwatch();
  resetTimer();
  resetPomodoro();

  showAlarms();

  // Populate timezone selector
  moment.tz.names().forEach(z=>{
    const txt = z.replace('_',' ');
    document.querySelectorAll('#from-tz, #to-tz, #add-tz-select')
      .forEach(sel=> sel.innerHTML += `<option value="${z}">${txt}</option>`);
  });

  // Converter logic
  function convert(){
    const f = document.getElementById('from-tz').value;
    const t = document.getElementById('to-tz').value;
    const now = moment().tz(f).format('YYYY-MM-DD HH:mm:ss');
    const conv = moment().tz(f).tz(t).format('YYYY-MM-DD HH:mm:ss');
    document.getElementById('converted-time').textContent =
      `${conv} (${t.replace('_',' ')})`;
  }
  document.getElementById('from-tz').onchange = convert;
  document.getElementById('to-tz').onchange   = convert;
  convert();

  // Add custom clock
  document.getElementById('add-tz-btn').onclick = ()=>{
    const z = document.getElementById('add-tz-select').value;
    if (!trackedZones.includes(z)) trackedZones.push(z);
  };

  // Theme toggle
  document.getElementById('theme-toggle').onclick = e=>{
    document.body.classList.toggle('bg-dark');
    document.body.classList.toggle('text-light');
    e.target.textContent = document.body.classList.contains('bg-dark') ? '☀️':'🌙';
  };
});
